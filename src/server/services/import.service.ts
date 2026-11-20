import { prisma } from '@/lib/db';
import { HttpError } from '@/lib/session';
import { can, type Actor } from '@/lib/rbac';
import { writeAudit } from '@/lib/audit';
import { getSettings, toScoringConfig } from '@/lib/settings';
import { evaluate, isAboveAppetite } from '@/lib/scoring';
import { appetiteLimit, nextCode } from '@/server/services/risk.service';

export type ImportValue = string | number | boolean | null;
export type ImportRow = Record<string, ImportValue>;

export interface RowResult {
  rowNumber: number;
  ok: boolean;
  errors: string[];
  data: {
    code: string;
    unit: string;
    category: string;
    description: string;
    p: number;
    i: number;
    score: number;
    level: string;
  };
}

interface Context {
  orgId: string;
  units: { id: string; name: string }[];
  categories: { name: string }[];
  users: { id: string; name: string; email: string }[];
}

const text = (v: ImportValue | undefined) => (v === undefined || v === null ? '' : String(v).trim());

const toIndex = (v: ImportValue | undefined): number | null => {
  const n = Number(String(v ?? '').replace(',', '.'));
  if (!Number.isFinite(n) || n < 1 || n > 5 || !Number.isInteger(n)) return null;
  return n;
};

const toNumber = (v: ImportValue | undefined): number => {
  const raw = String(v ?? '').replace(/[^0-9.,-]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.');
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
};

function toDate(v: ImportValue | undefined): Date | null {
  const raw = text(v);
  if (!raw) return null;
  const dmy = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  const d = dmy
    ? new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]))
    : new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function mapType(v: string): 'THREAT' | 'OPPORTUNITY' {
  const s = v.toLowerCase();
  return s.includes('peluang') || s.includes('opportun') ? 'OPPORTUNITY' : 'THREAT';
}

function mapStrategy(v: string): string {
  const s = v.toLowerCase();
  if (s.includes('avoid') || s.includes('hindar')) return 'AVOID';
  if (s.includes('transfer')) return 'TRANSFER';
  if (s.includes('accept') || s.includes('terima')) return 'ACCEPT';
  if (s.includes('exploit')) return 'EXPLOIT';
  if (s.includes('share')) return 'SHARE';
  if (s.includes('enhance')) return 'ENHANCE';
  return 'MITIGATE';
}

/** Ubah satu baris file menjadi input risiko; kumpulkan error per baris. */
function buildRow(
  raw: ImportRow,
  mapping: Record<string, string>,
  ctx: Context,
  fallbackOwnerId: string,
  fallbackCategory: string,
): { errors: string[]; payload?: Record<string, unknown> } {
  // mapping: header file -> field
  const get = (field: string): ImportValue | undefined => {
    const header = Object.keys(mapping).find((h) => mapping[h] === field);
    return header ? raw[header] : undefined;
  };

  const errors: string[] = [];
  const unitName = text(get('unit'));
  const unit = ctx.units.find((u) => u.name.toLowerCase() === unitName.toLowerCase());
  if (!unitName) errors.push('Unit kerja kosong.');
  else if (!unit) errors.push(`Unit "${unitName}" tidak dikenal.`);

  const category = text(get('category')) || fallbackCategory;
  if (!category) errors.push('Kategori risiko kosong.');
  else if (!ctx.categories.some((c) => c.name.toLowerCase() === category.toLowerCase())) {
    errors.push(`Kategori "${category}" tidak terdaftar.`);
  }

  const description = text(get('description'));
  if (!description) errors.push('Deskripsi risiko kosong.');

  const p = toIndex(get('p'));
  if (p === null) errors.push('Probabilitas (P) harus bilangan bulat 1 sampai 5.');
  const i = toIndex(get('i'));
  if (i === null) errors.push('Dampak (I) harus bilangan bulat 1 sampai 5.');

  if (errors.length) return { errors };

  const ownerRaw = text(get('owner'));
  const owner =
    ctx.users.find((u) => u.email.toLowerCase() === ownerRaw.toLowerCase()) ??
    ctx.users.find((u) => u.name.toLowerCase() === ownerRaw.toLowerCase()) ??
    ctx.users.find((u) => u.id === fallbackOwnerId);

  const rp = toIndex(get('rp')) ?? (p as number);
  const ri = toIndex(get('ri')) ?? (i as number);

  return {
    errors,
    payload: {
      code: text(get('code')) || null,
      type: mapType(text(get('type'))),
      category,
      unitId: unit!.id,
      goal: text(get('goal')) || '—',
      identifiedAt: toDate(get('identifiedAt')) ?? new Date(),
      description,
      rootCause: text(get('rootCause')) || '—',
      indicator: text(get('indicator')) || '—',
      existingControl: text(get('existingControl')),
      qualitativeImpact: text(get('qualitativeImpact')),
      p: p as number,
      i: i as number,
      ownerId: owner?.id ?? fallbackOwnerId,
      ownerTitle: text(get('ownerTitle')),
      strategy: mapStrategy(text(get('strategy'))),
      treatment: text(get('treatment')),
      treatmentCost: toNumber(get('treatmentCost')),
      rp,
      ri,
      nextReviewAt: toDate(get('nextReviewAt')),
    },
  };
}

async function loadContext(orgId: string): Promise<Context> {
  const [units, categories, users] = await Promise.all([
    prisma.unit.findMany({ where: { orgId }, select: { id: true, name: true } }),
    prisma.riskCategory.findMany({ where: { orgId }, select: { name: true } }),
    prisma.user.findMany({ where: { orgId }, select: { id: true, name: true, email: true } }),
  ]);
  return { orgId, units, categories, users };
}

/** Dry run: validasi seluruh baris tanpa menyimpan. */
export async function previewImport(
  actor: Actor,
  rows: ImportRow[],
  mapping: Record<string, string>,
  fallbackCategory = '',
) {
  if (!actor.orgId || !can(actor, 'import.run')) {
    throw new HttpError(403, 'FORBIDDEN', 'Anda tidak berhak mengimpor data.');
  }
  if (rows.length > 1000) throw new HttpError(422, 'VALIDATION_ERROR', 'Maksimal 1.000 baris per impor.');

  const ctx = await loadContext(actor.orgId);
  const cfg = toScoringConfig(await getSettings(actor.orgId));
  const existingCodes = new Set(
    (await prisma.risk.findMany({ where: { orgId: actor.orgId }, select: { code: true } })).map((r) => r.code),
  );

  const results: RowResult[] = [];
  const seenCodes = new Set<string>();

  rows.forEach((raw, idx) => {
    const { errors, payload } = buildRow(raw, mapping, ctx, actor.id, fallbackCategory);
    if (payload) {
      const values = evaluate(payload.p as number, payload.i as number, cfg);
      const code = (payload.code as string | null) ?? '';
      if (code && (existingCodes.has(code) || seenCodes.has(code))) {
        errors.push(`Kode risiko "${code}" sudah dipakai.`);
      }
      if (code) seenCodes.add(code);
      results.push({
        rowNumber: idx + 2,
        ok: errors.length === 0,
        errors,
        data: {
          code: code || '(otomatis)',
          unit: ctx.units.find((u) => u.id === payload.unitId)?.name ?? '',
          category: String(payload.category),
          description: String(payload.description),
          p: payload.p as number,
          i: payload.i as number,
          score: values.score,
          level: values.level,
        },
      });
    } else {
      results.push({
        rowNumber: idx + 2,
        ok: false,
        errors,
        data: { code: '', unit: '', category: '', description: '', p: 0, i: 0, score: 0, level: '' },
      });
    }
  });

  return {
    total: results.length,
    valid: results.filter((r) => r.ok).length,
    invalid: results.filter((r) => !r.ok).length,
    rows: results,
  };
}

/** Simpan baris valid sebagai Draft dalam satu transaksi + audit IMPORT. */
export async function commitImport(
  actor: Actor,
  rows: ImportRow[],
  mapping: Record<string, string>,
  fallbackCategory = '',
  ip?: string | null,
) {
  if (!actor.orgId || !can(actor, 'import.run')) {
    throw new HttpError(403, 'FORBIDDEN', 'Anda tidak berhak mengimpor data.');
  }
  const orgId = actor.orgId;
  const ctx = await loadContext(orgId);
  const cfg = toScoringConfig(await getSettings(orgId));

  const built: {
    payload: Record<string, unknown>;
    values: ReturnType<typeof evaluate>;
    res: ReturnType<typeof evaluate>;
  }[] = [];
  const failures: { rowNumber: number; errors: string[] }[] = [];

  rows.forEach((raw, idx) => {
    const { errors, payload } = buildRow(raw, mapping, ctx, actor.id, fallbackCategory);
    if (!payload || errors.length) {
      failures.push({ rowNumber: idx + 2, errors });
      return;
    }
    built.push({
      payload,
      values: evaluate(payload.p as number, payload.i as number, cfg),
      res: evaluate(payload.rp as number, payload.ri as number, cfg),
    });
  });

  if (!built.length) {
    throw new HttpError(422, 'VALIDATION_ERROR', 'Tidak ada baris valid untuk disimpan.', failures);
  }

  const codes = new Set(
    (await prisma.risk.findMany({ where: { orgId }, select: { code: true } })).map((r) => r.code),
  );

  const created = await prisma.$transaction(async (tx) => {
    let count = 0;
    for (const { payload, values, res } of built) {
      let code = (payload.code as string | null) ?? (await nextCode(orgId, payload.unitId as string));
      while (codes.has(code)) {
        code = await nextCode(orgId, payload.unitId as string);
        if (codes.has(code)) {
          // hindari loop tak berujung bila kode file bentrok
          code = `${code}-${count + 1}`;
        }
      }
      codes.add(code);

      const limit = await appetiteLimit(orgId, payload.category as string, payload.unitId as string);
      const above = limit !== null && isAboveAppetite(values.score, limit);

      await tx.risk.create({
        data: {
          orgId,
          code,
          status: 'DRAFT',
          type: payload.type as string,
          category: payload.category as string,
          unitId: payload.unitId as string,
          goal: payload.goal as string,
          identifiedAt: payload.identifiedAt as Date,
          description: payload.description as string,
          rootCause: payload.rootCause as string,
          indicator: payload.indicator as string,
          existingControl: payload.existingControl as string,
          qualitativeImpact: payload.qualitativeImpact as string,
          p: payload.p as number,
          i: payload.i as number,
          score: values.score,
          level: values.level,
          probPct: values.probPct,
          financialImpact: values.financialImpact,
          netValue: values.netValue,
          ownerId: payload.ownerId as string,
          ownerTitle: payload.ownerTitle as string,
          strategy: payload.strategy as string,
          treatment: payload.treatment as string,
          treatmentCost: payload.treatmentCost as number,
          rp: payload.rp as number,
          ri: payload.ri as number,
          scoreRes: res.score,
          levelRes: res.level,
          probPctRes: res.probPct,
          financialImpactRes: res.financialImpact,
          netValueRes: res.netValue,
          nextReviewAt: (payload.nextReviewAt as Date | null) ?? null,
          aboveAppetite: above,
        },
      });
      count += 1;
    }

    await writeAudit(
      {
        orgId,
        actorId: actor.id,
        entity: 'Risk',
        entityId: 'import',
        action: 'IMPORT',
        after: { rows: count },
        ip,
      },
      tx,
    );

    return count;
  });

  return { created, failed: failures.length, failures };
}
