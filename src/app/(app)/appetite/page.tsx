import Link from 'next/link';
import { requireUser } from '@/lib/session';
import { gapRisks, listAppetites } from '@/server/services/appetite.service';
import { prisma } from '@/lib/db';
import { can } from '@/lib/rbac';
import { formatDate, formatRupiah } from '@/lib/format';
import { LevelBadge, PageHeader, SectionCard } from '@/components/ui';
import { AppetiteManager } from '@/components/appetite-manager';

export const dynamic = 'force-dynamic';

export default async function AppetitePage() {
  const user = await requireUser();
  const [{ appetites, units }, gap, categories] = await Promise.all([
    listAppetites(user),
    gapRisks(user),
    prisma.riskCategory.findMany({ where: { orgId: user.orgId ?? '__none__' }, orderBy: { name: 'asc' } }),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Batas toleransi"
        title="Risk Appetite"
        description="Batas skor residual yang dapat diterima per kategori, dengan pengecualian per unit bila perlu."
      />

      <SectionCard
        title="Batas appetite"
        description="Risiko aktif dengan skor residual di atas batas ditandai “di atas appetite”."
      >
        <AppetiteManager
          canManage={can(user, 'appetite.manage')}
          appetites={appetites}
          units={units.map((u) => ({ id: u.id, name: u.name }))}
          categories={categories.map((c) => ({ name: c.name }))}
        />
      </SectionCard>

      <div className="mt-6">
        <SectionCard
          title={`Risiko di atas appetite (${gap.length})`}
          description="Daftar ini menjadi prioritas penanganan lanjutan."
        >
          {gap.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
              Tidak ada risiko aktif yang melampaui batas appetite. 🎉
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead>
                  <tr className="border-b border-line">
                    <th className="th">Kode</th>
                    <th className="th">Risiko</th>
                    <th className="th">Kategori</th>
                    <th className="th">Skor residual</th>
                    <th className="th text-right">Nilai bersih residual</th>
                    <th className="th">Review berikutnya</th>
                  </tr>
                </thead>
                <tbody>
                  {gap.map((r) => (
                    <tr key={r.id} className="border-b border-slate-50 last:border-0">
                      <td className="td">
                        <Link href={`/risks/${r.id}`} className="font-semibold text-teal hover:text-[#117a76]">
                          {r.code}
                        </Link>
                      </td>
                      <td className="td">
                        <p className="font-medium text-ink">{r.description}</p>
                        <p className="text-xs text-muted">{r.unit?.name}</p>
                      </td>
                      <td className="td text-[#536174]">{r.category}</td>
                      <td className="td">
                        <LevelBadge level={r.levelRes} score={r.scoreRes} />
                      </td>
                      <td className="td text-right tabular-nums">{formatRupiah(r.netValueRes, { compact: true })}</td>
                      <td className="td text-xs text-muted">{formatDate(r.nextReviewAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>
    </>
  );
}
