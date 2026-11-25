import { prisma } from '@/lib/db';
import { HttpError } from '@/lib/session';
import { getSettings, toScoringConfig } from '@/lib/settings';
import { evaluate, isAboveAppetite, residualExceedsInherent, type Level } from '@/lib/scoring';
import { writeAudit, type AuditAction } from '@/lib/audit';
import {
  can,
  canEditRisk,
  canViewRisk,
  statusAllows,
  type Actor,
} from '@/lib/rbac';
import type { RiskInput } from '@/validators/risk';
import { riskScope, unitFilter } from '@/lib/tenant';

export interface RiskListParams {
  q?: string;
  unit?: string;
  category?: string;
  level?: string;
  status?: string;
  appetite?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

const SORTABLE = new Set(['score', 'scoreRes', 'netValue', 'netValueRes', 'code', 'level', 'updatedAt']);

/** Hitung skor lengkap dari input + pengaturan organisasi. */
async function computeValues(input: Pick<RiskInput, 'p' | 'i' | 'rp' | 'ri'>, orgId: string) {
  const cfg = toScoringConfig(await getSettings(orgId));
  const inherent = evaluate(input.p, input.i, cfg);
  const residual = evaluate(input.rp, input.ri, cfg);
  return {
    score: inherent.score,
    level: inherent.level,
    probPct: inherent.probPct,
    financialImpact: inherent.financialImpact,
    netValue: inherent.netValue,
    scoreRes: residual.score,
    levelRes: residual.level,
    probPctRes: residual.probPct,
    financialImpactRes: residual.financialImpact,
    netValueRes: residual.netValue,
  };
}

/** Tentukan batas appetite yang berlaku: unit spesifik dulu, lalu kategori umum. */
export async function appetiteLimit(orgId: string, category: string, unitId: string): Promise<number | null> {
  const rows = await prisma.riskAppetite.findMany({ where: { orgId, category } });
  const specific = rows.find((r) => r.unitId === unitId);
  if (specific) return specific.maxScore;
  const generic = rows.find((r) => r.unitId === null);
  return generic ? generic.maxScore : null;
}

export async function nextCode(orgId: string, unitId: string): Promise<string> {
  const unit = await prisma.unit.findUnique({ where: { id: unitId } });
  const prefix = (unit?.name ?? 'RSK')
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, 3)
    .toUpperCase()
    .padEnd(3, 'X');
  const existing = await prisma.risk.findMany({
    where: { orgId, code: { startsWith: prefix } },
    select: { code: true },
  });
  const max = existing.reduce((acc, r) => {
    const n = Number(r.code.slice(prefix.length));
    return Number.isFinite(n) ? Math.max(acc, n) : acc;
  }, 0);
  return `${prefix}${String(max + 1).padStart(3, '0')}`;
}

export async function listRisks(actor: Actor, params: RiskListParams) {
  const where: Record<string, unknown> = { ...riskScope(actor) };
  const and: Record<string, unknown>[] = [];

  if (params.q) {
    and.push({
      OR: [
        { code: { contains: params.q } },
        { description: { contains: params.q } },
        { rootCause: { contains: params.q } },
        { goal: { contains: params.q } },
      ],
    });
  }
  const effectiveUnit = unitFilter(actor, params.unit);
  if (effectiveUnit) where.unitId = effectiveUnit;
  if (params.category) where.category = params.category;
  if (params.level) and.push({ OR: [{ level: params.level }, { levelRes: params.level }] });
  if (params.status) where.status = params.status;
  if (params.appetite === 'above') where.aboveAppetite = true;
  if (and.length) where.AND = and;

  const [field, dir] = (params.sort ?? 'updatedAt:desc').split(':');
  const sortKey = SORTABLE.has(field) ? field : 'updatedAt';
  const orderBy = { [sortKey]: dir === 'asc' ? 'asc' : 'desc' };

  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 20));

  const [total, rows] = await Promise.all([
    prisma.risk.count({ where }),
    prisma.risk.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: { unit: true, owner: { select: { name: true } } },
    }),
  ]);

  return { rows, total, page, limit, pages: Math.ceil(total / limit) || 1 };
}

export async function getRisk(actor: Actor, id: string) {
  const risk = await prisma.risk.findFirst({
    where: { id, orgId: actor.orgId ?? '__none__' },
    include: {
      unit: true,
      owner: { select: { id: true, name: true, email: true } },
      reviews: { include: { reviewer: { select: { name: true } } }, orderBy: { reviewedAt: 'desc' } },
      mitigations: { orderBy: { createdAt: 'asc' } },
      kris: { include: { values: { orderBy: { period: 'asc' } } }, orderBy: { createdAt: 'asc' } },
      attachments: { orderBy: { uploadedAt: 'desc' } },
    },
  });
  if (!risk) throw new HttpError(404, 'NOT_FOUND', 'Risiko tidak ditemukan.');
  if (!canViewRisk(actor, risk)) throw new HttpError(403, 'FORBIDDEN', 'Anda tidak berhak melihat risiko unit lain.');
  return risk;
}

export async function createRisk(actor: Actor, input: RiskInput, ip?: string | null) {
  if (!can(actor, 'risk.create')) throw new HttpError(403, 'FORBIDDEN', 'Peran Anda tidak boleh membuat risiko.');
  if (!actor.orgId) throw new HttpError(403, 'FORBIDDEN', 'Akun tanpa organisasi.');

  if (actor.role === 'RISK_OWNER' && actor.unitId !== input.unitId) {
    throw new HttpError(403, 'FORBIDDEN', 'Risk Owner hanya boleh mencatat risiko unitnya.');
  }

  const unit = await prisma.unit.findFirst({ where: { id: input.unitId, orgId: actor.orgId } });
  if (!unit) throw new HttpError(422, 'VALIDATION_ERROR', 'Unit kerja tidak dikenal.');

  const owner = await prisma.user.findFirst({ where: { id: input.ownerId, orgId: actor.orgId } });
  if (!owner) throw new HttpError(422, 'VALIDATION_ERROR', 'Pemilik risiko tidak dikenal.');

  const values = await computeValues(input, actor.orgId);
  const limit = await appetiteLimit(actor.orgId, input.category, input.unitId);
  const aboveAppetite = limit !== null && isAboveAppetite(values.scoreRes, limit);
  const code = await nextCode(actor.orgId, input.unitId);

  const risk = await prisma.$transaction(async (tx) => {
    const created = await tx.risk.create({
      data: {
        orgId: actor.orgId as string,
        code,
        status: 'DRAFT',
        type: input.type,
        category: input.category,
        unitId: input.unitId,
        goal: input.goal,
        identifiedAt: input.identifiedAt,
        description: input.description,
        rootCause: input.rootCause,
        indicator: input.indicator,
        existingControl: input.existingControl ?? '',
        qualitativeImpact: input.qualitativeImpact ?? '',
        p: input.p,
        i: input.i,
        ownerId: input.ownerId,
        ownerTitle: input.ownerTitle ?? '',
        strategy: input.strategy,
        treatment: input.treatment ?? '',
        treatmentCost: input.treatmentCost ?? 0,
        actionsDone: input.actionsDone ?? null,
        rp: input.rp,
        ri: input.ri,
        nextReviewAt: input.nextReviewAt ?? null,
        aboveAppetite,
        ...values,
      },
      include: { unit: true },
    });
    await writeAudit(
      {
        orgId: actor.orgId as string,
        actorId: actor.id,
        entity: 'Risk',
        entityId: created.id,
        action: 'CREATE',
        after: created,
        ip,
      },
      tx,
    );
    return created;
  });

  return { risk, warning: residualExceedsInherent(values.scoreRes, values.score) ? 'Skor residual lebih tinggi dari inherent.' : null };
}

function assertKnown(input: Record<string, unknown>, allowed: string[]) {
  for (const key of Object.keys(input)) {
    if (!allowed.includes(key)) delete input[key];
  }
}

export async function updateRisk(actor: Actor, id: string, patch: Partial<RiskInput>, ip?: string | null) {
  const existing = await getRisk(actor, id);
  if (!canEditRisk(actor, existing)) {
    throw new HttpError(403, 'FORBIDDEN', 'Risiko hanya dapat diubah saat Draft dan pada unit sendiri.');
  }
  if (patch.version !== undefined && patch.version !== existing.version) {
    throw new HttpError(409, 'CONFLICT', 'Data sudah diubah pengguna lain. Muat ulang halaman.');
  }

  const merged = {
    p: patch.p ?? existing.p,
    i: patch.i ?? existing.i,
    rp: patch.rp ?? existing.rp,
    ri: patch.ri ?? existing.ri,
  };
  const values = await computeValues(merged as RiskInput, existing.orgId);
  // Jangan percaya unitId/ownerId dari klien: harus milik organisasi yang sama.
  if (patch.unitId !== undefined) {
    if (actor.role === 'RISK_OWNER' && patch.unitId !== actor.unitId) {
      throw new HttpError(403, 'FORBIDDEN', 'Risk Owner tidak boleh memindahkan risiko ke unit lain.');
    }
    const unit = await prisma.unit.findFirst({ where: { id: patch.unitId, orgId: existing.orgId } });
    if (!unit) throw new HttpError(422, 'VALIDATION_ERROR', 'Unit kerja tidak dikenal.');
  }
  if (patch.ownerId !== undefined) {
    const owner = await prisma.user.findFirst({ where: { id: patch.ownerId, orgId: existing.orgId } });
    if (!owner) throw new HttpError(422, 'VALIDATION_ERROR', 'Pemilik risiko tidak dikenal.');
  }

  const category = patch.category ?? existing.category;
  const unitId = patch.unitId ?? existing.unitId;
  const limit = await appetiteLimit(existing.orgId, category, unitId);
  const aboveAppetite = limit !== null && isAboveAppetite(values.scoreRes, limit);

  const data: Record<string, unknown> = {
    ...patch,
    ...values,
    aboveAppetite,
    version: existing.version + 1,
  };
  delete data.id;
  delete data.orgId;
  delete data.code;
  // Risk Owner yang mengubah risiko Active mengembalikannya ke Submitted.
  if (actor.role === 'RISK_OWNER' && existing.status === 'ACTIVE') data.status = 'SUBMITTED';

  assertKnown(data, [
    'type', 'category', 'unitId', 'goal', 'identifiedAt', 'description', 'rootCause', 'indicator',
    'existingControl', 'qualitativeImpact', 'p', 'i', 'ownerId', 'ownerTitle', 'strategy', 'treatment',
    'treatmentCost', 'actionsDone', 'rp', 'ri', 'nextReviewAt', 'score', 'level', 'probPct',
    'financialImpact', 'netValue', 'scoreRes', 'levelRes', 'probPctRes', 'financialImpactRes',
    'netValueRes', 'aboveAppetite', 'status', 'version',
  ]);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.risk.update({ where: { id }, data });
    await writeAudit(
      {
        orgId: existing.orgId,
        actorId: actor.id,
        entity: 'Risk',
        entityId: id,
        action: 'UPDATE',
        before: existing,
        after: updated,
        ip,
      },
      tx,
    );
    return updated;
  });
}

type Transition = 'submit' | 'approve' | 'reject' | 'retire';

const TRANSITION: Record<Transition, { action: AuditAction; allowed: 'risk.submit' | 'risk.approve' | 'risk.retire'; next: string }> = {
  submit: { action: 'SUBMIT', allowed: 'risk.submit', next: 'SUBMITTED' },
  approve: { action: 'APPROVE', allowed: 'risk.approve', next: 'ACTIVE' },
  reject: { action: 'REJECT', allowed: 'risk.approve', next: 'DRAFT' },
  retire: { action: 'RETIRE', allowed: 'risk.retire', next: 'RETIRED' },
};

export async function transitionRisk(
  actor: Actor,
  id: string,
  kind: Transition,
  note?: string,
  ip?: string | null,
) {
  const risk = await getRisk(actor, id);
  const rule = TRANSITION[kind];
  if (!can(actor, rule.allowed)) throw new HttpError(403, 'FORBIDDEN', 'Peran Anda tidak berhak melakukan aksi ini.');
  if (!statusAllows(rule.allowed, risk.status)) {
    throw new HttpError(409, 'CONFLICT', `Status ${risk.status} tidak mendukung aksi ${kind}.`);
  }
  if (kind === 'reject' && !note) throw new HttpError(422, 'VALIDATION_ERROR', 'Alasan penolakan wajib diisi.');

  return prisma.$transaction(async (tx) => {
    const updated = await tx.risk.update({
      where: { id },
      data: { status: rule.next, version: { increment: 1 } },
    });
    await writeAudit(
      {
        orgId: risk.orgId,
        actorId: actor.id,
        entity: 'Risk',
        entityId: id,
        action: rule.action,
        before: { status: risk.status },
        after: { status: rule.next, note: note ?? null },
        ip,
      },
      tx,
    );
    return updated;
  });
}

export async function addReview(
  actor: Actor,
  id: string,
  input: { note: string; rpAfter: number; riAfter: number },
  ip?: string | null,
) {
  const risk = await getRisk(actor, id);
  if (!can(actor, 'risk.review')) throw new HttpError(403, 'FORBIDDEN', 'Peran Anda tidak berhak mencatat kajian.');
  if (!statusAllows('risk.review', risk.status)) {
    throw new HttpError(409, 'CONFLICT', 'Kajian hanya untuk risiko Active.');
  }

  const values = await computeValues({ p: risk.p, i: risk.i, rp: input.rpAfter, ri: input.riAfter }, risk.orgId);
  const limit = await appetiteLimit(risk.orgId, risk.category, risk.unitId);
  const aboveAppetite = limit !== null && isAboveAppetite(values.scoreRes, limit);

  const nextReviewAt = new Date();
  nextReviewAt.setMonth(nextReviewAt.getMonth() + 3);

  return prisma.$transaction(async (tx) => {
    const review = await tx.riskReview.create({
      data: { riskId: id, reviewerId: actor.id, note: input.note, rpAfter: input.rpAfter, riAfter: input.riAfter },
    });
    const updated = await tx.risk.update({
      where: { id },
      data: {
        rp: input.rpAfter,
        ri: input.riAfter,
        ...values,
        aboveAppetite,
        nextReviewAt,
        version: { increment: 1 },
      },
    });
    await writeAudit(
      {
        orgId: risk.orgId,
        actorId: actor.id,
        entity: 'Risk',
        entityId: id,
        action: 'UPDATE',
        before: { rp: risk.rp, ri: risk.ri, scoreRes: risk.scoreRes },
        after: { rp: input.rpAfter, ri: input.riAfter, scoreRes: values.scoreRes, note: input.note },
        ip,
      },
      tx,
    );
    return { review, risk: updated };
  });
}

export async function deleteRisk(actor: Actor, id: string, ip?: string | null) {
  const risk = await getRisk(actor, id);
  if (!can(actor, 'risk.delete')) throw new HttpError(403, 'FORBIDDEN', 'Hanya Admin yang boleh menghapus.');
  if (risk.status !== 'DRAFT') throw new HttpError(409, 'CONFLICT', 'Hanya risiko Draft yang dapat dihapus.');

  return prisma.$transaction(async (tx) => {
    await tx.risk.delete({ where: { id } });
    await writeAudit(
      {
        orgId: risk.orgId,
        actorId: actor.id,
        entity: 'Risk',
        entityId: id,
        action: 'DELETE',
        before: risk,
        ip,
      },
      tx,
    );
    return { deleted: true };
  });
}

/** Hitung ulang seluruh risiko organisasi setelah pengaturan kriteria berubah. */
export async function recalculateAll(actor: Actor, ip?: string | null) {
  if (!actor.orgId) throw new HttpError(403, 'FORBIDDEN', 'Akun tanpa organisasi.');
  const cfg = toScoringConfig(await getSettings(actor.orgId));
  const risks = await prisma.risk.findMany({ where: { orgId: actor.orgId } });
  const appetites = await prisma.riskAppetite.findMany({ where: { orgId: actor.orgId } });

  let changed = 0;
  for (const r of risks) {
    const inherent = evaluate(r.p, r.i, cfg);
    const residual = evaluate(r.rp, r.ri, cfg);
    const specific = appetites.find((a) => a.category === r.category && a.unitId === r.unitId);
    const generic = appetites.find((a) => a.category === r.category && a.unitId === null);
    const limit = specific?.maxScore ?? generic?.maxScore ?? null;
    await prisma.risk.update({
      where: { id: r.id },
      data: {
        score: inherent.score,
        level: inherent.level,
        probPct: inherent.probPct,
        financialImpact: inherent.financialImpact,
        netValue: inherent.netValue,
        scoreRes: residual.score,
        levelRes: residual.level,
        probPctRes: residual.probPct,
        financialImpactRes: residual.financialImpact,
        netValueRes: residual.netValue,
        aboveAppetite: limit !== null && isAboveAppetite(residual.score, limit),
      },
    });
    changed += 1;
  }

  await writeAudit({
    orgId: actor.orgId,
    actorId: actor.id,
    entity: 'Setting',
    entityId: actor.orgId,
    action: 'RECALCULATE',
    after: { risks: changed },
    ip,
  });

  return { updated: changed };
}

/** Perbarui penanda appetite untuk seluruh risiko (dipakai setelah appetite berubah). */
export async function refreshAppetiteFlags(orgId: string) {
  const [risks, appetites] = await Promise.all([
    prisma.risk.findMany({ where: { orgId } }),
    prisma.riskAppetite.findMany({ where: { orgId } }),
  ]);
  for (const r of risks) {
    const specific = appetites.find((a) => a.category === r.category && a.unitId === r.unitId);
    const generic = appetites.find((a) => a.category === r.category && a.unitId === null);
    const limit = specific?.maxScore ?? generic?.maxScore ?? null;
    const above = limit !== null && r.scoreRes > limit;
    if (above !== r.aboveAppetite) {
      await prisma.risk.update({ where: { id: r.id }, data: { aboveAppetite: above } });
    }
  }
}

export function levelOf(value: string): Level {
  return (['LOW', 'MEDIUM', 'HIGH', 'EXTREME'].includes(value) ? value : 'LOW') as Level;
}
