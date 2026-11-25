import { requireUser } from '@/lib/session';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/ui';
import { ExportPanel } from '@/components/export-panel';

export const dynamic = 'force-dynamic';

export default async function ExportsPage() {
  const user = await requireUser();
  const orgId = user.orgId ?? '__none__';
  const [grouped, units] = await Promise.all([
    prisma.risk.groupBy({
      by: ['unitId', 'status'],
      where: { orgId },
      _count: { _all: true },
    }),
    prisma.unit.findMany({
      where: { orgId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ]);

  const unitCounts: Record<string, { total: number; active: number }> = {};
  let riskCount = 0;
  let activeCount = 0;
  for (const row of grouped) {
    const count = row._count._all;
    riskCount += count;
    const active = row.status === 'ACTIVE' || row.status === 'SUBMITTED';
    if (active) activeCount += count;
    const unitRow = unitCounts[row.unitId] ?? { total: 0, active: 0 };
    unitRow.total += count;
    if (active) unitRow.active += count;
    unitCounts[row.unitId] = unitRow;
  }

  return (
    <>
      <PageHeader
        eyebrow="Pelaporan"
        title="Ekspor & laporan"
        description="Unduh data per unit atau seluruh organisasi, cetak register, dan ambil templat impor."
      />

      <ExportPanel
        units={units}
        riskCount={riskCount}
        activeCount={activeCount}
        unitCounts={unitCounts}
      />

      <div className="card-pad mt-6">
        <h2 className="text-sm font-bold text-navy">Catatan pelaporan</h2>
        <ul className="mt-2 space-y-1 text-sm text-muted">
          <li>• Nilai rupiah dihitung dari BTR organisasi; nilai antarorganisasi tidak dibandingkan langsung.</li>
          <li>• Nilai bersih residual adalah eksposur yang diharapkan setelah penanganan.</li>
          <li>• Unduhan mengikuti hak akses: Risk Owner hanya menerima data unitnya.</li>
          <li>• Angka ringkasan terkini tersedia di Dashboard dan Heat Map.</li>
        </ul>
      </div>
    </>
  );
}
