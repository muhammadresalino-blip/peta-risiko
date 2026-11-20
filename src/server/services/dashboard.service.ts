import { prisma } from '@/lib/db';
import type { Actor } from '@/lib/rbac';
import { riskScope } from '@/lib/tenant';

export async function summary(actor: Actor) {
  const scope = riskScope(actor);
  const risks = await prisma.risk.findMany({
    where: scope,
    include: {
      unit: { select: { id: true, name: true } },
      owner: { select: { name: true } },
    },
  });

  const active = risks.filter((r) => r.status === 'ACTIVE');
  const now = new Date();

  const byUnit = new Map<string, { unit: string; count: number; netValue: number; netValueRes: number; above: number }>();
  for (const r of risks) {
    const key = r.unit?.name ?? r.unitId;
    const row = byUnit.get(key) ?? { unit: key, count: 0, netValue: 0, netValueRes: 0, above: 0 };
    row.count += 1;
    row.netValue += r.netValue;
    row.netValueRes += r.netValueRes;
    if (r.aboveAppetite) row.above += 1;
    byUnit.set(key, row);
  }

  const levels = ['LOW', 'MEDIUM', 'HIGH', 'EXTREME'] as const;
  const byLevel = levels.map((lvl) => ({
    level: lvl,
    inherent: active.filter((r) => r.level === lvl).length,
    residual: active.filter((r) => r.levelRes === lvl).length,
  }));

  const overdueAll = active
    .filter((r) => r.nextReviewAt !== null && r.nextReviewAt < now)
    .sort((a, b) => (a.nextReviewAt!.getTime() < b.nextReviewAt!.getTime() ? -1 : 1));

  const overdueRisks = overdueAll
    .slice(0, 20)
    .map((r) => ({
      id: r.id,
      code: r.code,
      description: r.description,
      unit: r.unit?.name ?? '',
      owner: r.owner?.name ?? '',
      levelRes: r.levelRes,
      scoreRes: r.scoreRes,
      nextReviewAt: r.nextReviewAt,
    }));

  return {
    total: risks.length,
    active: active.length,
    draft: risks.filter((r) => r.status === 'DRAFT').length,
    submitted: risks.filter((r) => r.status === 'SUBMITTED').length,
    retired: risks.filter((r) => r.status === 'RETIRED').length,
    netValue: active.reduce((a, r) => a + r.netValue, 0),
    netValueRes: active.reduce((a, r) => a + r.netValueRes, 0),
    treatmentCost: active.reduce((a, r) => a + r.treatmentCost, 0),
    aboveAppetite: active.filter((r) => r.aboveAppetite).length,
    overdue: overdueAll.length,
    overdueRisks,
    byUnit: Array.from(byUnit.values()).sort((a, b) => b.count - a.count),
    byLevel,
    topRisks: active.sort((a, b) => b.netValue - a.netValue).slice(0, 5),
  };
}

export interface HeatCell {
  p: number;
  i: number;
  score: number;
  risks: { id: string; code: string; level: string; unit: string }[];
}

export async function heatmap(actor: Actor, view: 'inherent' | 'residual' = 'inherent') {
  const risks = await prisma.risk.findMany({
    where: { ...riskScope(actor), status: { in: ['ACTIVE', 'SUBMITTED'] } },
    include: { unit: { select: { name: true } } },
  });

  const cells: HeatCell[] = [];
  for (let p = 1; p <= 5; p++) {
    for (let i = 1; i <= 5; i++) {
      const bucket = risks.filter((r) =>
        view === 'inherent' ? r.p === p && r.i === i : r.rp === p && r.ri === i,
      );
      cells.push({
        p,
        i,
        score: p * i,
        risks: bucket.map((r) => ({
          id: r.id,
          code: r.code,
          level: view === 'inherent' ? r.level : r.levelRes,
          unit: r.unit?.name ?? '',
        })),
      });
    }
  }
  return { view, cells, total: risks.length };
}

export async function trend(actor: Actor, from?: string, to?: string) {
  const snapshots = await prisma.riskSnapshot.findMany({
    where: {
      orgId: actor.orgId ?? '__none__',
      ...(from || to
        ? { period: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
        : {}),
    },
    orderBy: { period: 'asc' },
  });

  const byPeriod = new Map<string, { period: string; netValue: number; netValueRes: number; count: number }>();
  for (const s of snapshots) {
    const row = byPeriod.get(s.period) ?? { period: s.period, netValue: 0, netValueRes: 0, count: 0 };
    row.netValue += s.netValue;
    row.netValueRes += s.netValueRes;
    row.count += 1;
    byPeriod.set(s.period, row);
  }
  return Array.from(byPeriod.values());
}

/** Snapshot akhir bulan (dipanggil manual atau job terjadwal). */
export async function takeSnapshot(actor: Actor, period?: string) {
  const orgId = actor.orgId ?? '__none__';
  const now = new Date();
  const tag = period ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const risks = await prisma.risk.findMany({ where: { orgId, status: 'ACTIVE' } });
  for (const r of risks) {
    await prisma.riskSnapshot.upsert({
      where: { riskId_period: { riskId: r.id, period: tag } },
      create: {
        orgId,
        riskId: r.id,
        period: tag,
        score: r.score,
        level: r.level,
        scoreRes: r.scoreRes,
        levelRes: r.levelRes,
        netValue: r.netValue,
        netValueRes: r.netValueRes,
      },
      update: {
        score: r.score,
        level: r.level,
        scoreRes: r.scoreRes,
        levelRes: r.levelRes,
        netValue: r.netValue,
        netValueRes: r.netValueRes,
      },
    });
  }
  return { period: tag, risks: risks.length };
}
