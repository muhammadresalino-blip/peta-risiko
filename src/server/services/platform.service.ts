import { prisma } from '@/lib/db';

export interface OrgComparison {
  id: string;
  name: string;
  slug: string;
  currency: string;
  isActive: boolean;
  users: number;
  units: number;
  total: number;
  active: number;
  draft: number;
  submitted: number;
  retired: number;
  aboveAppetite: number;
  byLevel: Record<string, number>;
  avgScore: number | null;
  avgScoreResidual: number | null;
  maxScore: number | null;
}

/**
 * Perbandingan antarorganisasi memakai skor dan tingkat risiko saja,
 * bukan nilai rupiah, karena BTR tiap organisasi berbeda (dokumen FR-18).
 */
export async function compareOrganizations(orgIds: string[] = []): Promise<OrgComparison[]> {
  const orgs = await prisma.organization.findMany({
    where: orgIds.length ? { id: { in: orgIds } } : {},
    orderBy: { name: 'asc' },
    include: { _count: { select: { users: true, units: true, risks: true } } },
  });

  return Promise.all(
    orgs.map(async (org) => {
      const where = { orgId: org.id };
      const [draft, submitted, retired, above, levelRows, agg] = await Promise.all([
        prisma.risk.count({ where: { ...where, status: 'DRAFT' } }),
        prisma.risk.count({ where: { ...where, status: 'SUBMITTED' } }),
        prisma.risk.count({ where: { ...where, status: 'RETIRED' } }),
        prisma.risk.count({ where: { ...where, status: 'ACTIVE', aboveAppetite: true } }),
        prisma.risk.groupBy({
          by: ['level'],
          where: { ...where, status: 'ACTIVE' },
          _count: { _all: true },
        }),
        prisma.risk.aggregate({
          where: { ...where, status: 'ACTIVE' },
          _avg: { score: true, scoreRes: true },
          _max: { score: true },
        }),
      ]);

      const active = levelRows.reduce((sum, row) => sum + row._count._all, 0);
      const byLevel: Record<string, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, EXTREME: 0 };
      for (const row of levelRows) byLevel[row.level] = row._count._all;

      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        currency: org.currency,
        isActive: org.isActive,
        users: org._count.users,
        units: org._count.units,
        total: org._count.risks,
        active,
        draft,
        submitted,
        retired,
        aboveAppetite: above,
        byLevel,
        avgScore: agg._avg.score !== null ? Math.round(agg._avg.score * 10) / 10 : null,
        avgScoreResidual: agg._avg.scoreRes !== null ? Math.round(agg._avg.scoreRes * 10) / 10 : null,
        maxScore: agg._max.score,
      };
    }),
  );
}
