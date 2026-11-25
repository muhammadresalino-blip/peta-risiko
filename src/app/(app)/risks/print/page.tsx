import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/session';
import { prisma } from '@/lib/db';
import { riskScope } from '@/lib/tenant';
import { LEVEL_LABEL, type Level } from '@/lib/scoring';
import { formatDate, formatDateTime, formatRupiah, STATUS_LABEL } from '@/lib/format';
import { PrintButton } from '@/components/print-button';

export const dynamic = 'force-dynamic';

export default async function PrintRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ unitId?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const unitId = sp.unitId ?? '';

  let unitName = '';
  if (unitId) {
    const unit = await prisma.unit.findFirst({
      where: { id: unitId, orgId: user.orgId ?? '__none__' },
      select: { name: true },
    });
    if (!unit) notFound();
    unitName = unit.name;
  }

  const risks = await prisma.risk.findMany({
    where: {
      ...riskScope(user),
      status: { in: ['ACTIVE', 'SUBMITTED'] },
      ...(unitId ? { unitId } : {}),
    },
    include: { unit: { select: { name: true } }, owner: { select: { name: true } } },
    orderBy: [{ level: 'asc' }, { score: 'desc' }],
  });

  const totalNet = risks.reduce((sum, r) => sum + r.netValue, 0);
  const totalNetRes = risks.reduce((sum, r) => sum + r.netValueRes, 0);
  const above = risks.filter((r) => r.aboveAppetite).length;

  return (
    <div className="print-sheet">
      <div className="mb-5 flex items-center justify-between gap-3 print:hidden">
        <Link href="/exports" className="btn-secondary">
          ← Kembali ke ekspor
        </Link>
        <PrintButton />
      </div>

      <header className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b-2 border-navy pb-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted">PetaRisiko</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy">Risk Register</h1>
          <p className="text-sm text-muted">
            {user.orgName ?? 'Organisasi'}
            {unitName ? ` — Unit ${unitName}` : ' — Seluruh unit'}
          </p>
        </div>
        <div className="text-right text-xs text-muted">
          <p>Dicetak: {formatDateTime(new Date())}</p>
          <p>Oleh: {user.name}</p>
          <p>Status: aktif dan diajukan</p>
        </div>
      </header>

      <div className="mb-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
        <div className="rounded-md border border-line px-3 py-2">
          <p className="text-muted">Jumlah risiko</p>
          <p className="data-value text-lg font-bold text-navy">{risks.length}</p>
        </div>
        <div className="rounded-md border border-line px-3 py-2">
          <p className="text-muted">Nilai bersih inherent</p>
          <p className="data-value text-sm font-bold text-navy">{formatRupiah(totalNet, { compact: true })}</p>
        </div>
        <div className="rounded-md border border-line px-3 py-2">
          <p className="text-muted">Nilai bersih residual</p>
          <p className="data-value text-sm font-bold text-navy">{formatRupiah(totalNetRes, { compact: true })}</p>
        </div>
        <div className="rounded-md border border-line px-3 py-2">
          <p className="text-muted">Di atas appetite</p>
          <p className="data-value text-lg font-bold text-risk-extreme">{above}</p>
        </div>
      </div>

      {risks.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">Tidak ada risiko aktif/diajukan untuk dicetak.</p>
      ) : (
        <table className="w-full border-collapse text-[11px] print:min-w-0">
          <thead>
            <tr className="border-y border-line bg-mist text-left">
              <th className="px-2 py-1.5 font-semibold">Kode</th>
              <th className="px-2 py-1.5 font-semibold">Risiko</th>
              <th className="px-2 py-1.5 font-semibold">Inherent</th>
              <th className="px-2 py-1.5 font-semibold">Residual</th>
              <th className="px-2 py-1.5 text-right font-semibold">Nilai bersih</th>
              <th className="px-2 py-1.5 font-semibold">Appetite</th>
              <th className="px-2 py-1.5 font-semibold">Status</th>
              <th className="px-2 py-1.5 font-semibold">Review</th>
            </tr>
          </thead>
          <tbody>
            {risks.map((r) => (
              <tr key={r.id} className="break-inside-avoid border-b border-line align-top">
                <td className="whitespace-nowrap px-2 py-1.5 risk-code text-[10px] font-semibold">{r.code}</td>
                <td className="px-2 py-1.5">
                  <p className="font-medium text-navy">{r.description}</p>
                  <p className="text-[10px] text-muted">
                    {r.category} · {r.unit.name}
                    {r.owner?.name ? ` · ${r.owner.name}` : ''}
                  </p>
                </td>
                <td className="whitespace-nowrap px-2 py-1.5">
                  {r.p} × {r.i} = <strong>{r.score}</strong>
                  <p className="text-[10px] text-muted">{LEVEL_LABEL[r.level as Level] ?? r.level}</p>
                </td>
                <td className="whitespace-nowrap px-2 py-1.5">
                  {r.rp} × {r.ri} = <strong>{r.scoreRes}</strong>
                  <p className="text-[10px] text-muted">{LEVEL_LABEL[r.levelRes as Level] ?? r.levelRes}</p>
                </td>
                <td className="data-value whitespace-nowrap px-2 py-1.5 text-right">
                  {formatRupiah(r.netValue)}
                  <p className="text-[10px] text-muted">{formatRupiah(r.netValueRes)}</p>
                </td>
                <td className="whitespace-nowrap px-2 py-1.5">
                  {r.aboveAppetite ? <span className="font-semibold text-risk-extreme">Di atas</span> : 'Dalam'}
                </td>
                <td className="whitespace-nowrap px-2 py-1.5">{STATUS_LABEL[r.status] ?? r.status}</td>
                <td className="whitespace-nowrap px-2 py-1.5">{formatDate(r.nextReviewAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <footer className="mt-8 grid grid-cols-2 gap-8 text-xs text-muted">
        <div>
          <p>Disusun oleh,</p>
          <div className="mt-12 border-t border-muted/40 pt-1">{user.name}</div>
        </div>
        <div>
          <p>Disetujui oleh,</p>
          <div className="mt-12 border-t border-muted/40 pt-1">&nbsp;</div>
        </div>
      </footer>
    </div>
  );
}
