import Link from 'next/link';
import { Activity, ClipboardList, ShieldCheck, Wallet } from 'lucide-react';
import { requireUser } from '@/lib/session';
import { can } from '@/lib/rbac';
import { summary, trend } from '@/server/services/dashboard.service';
import { gapRisks } from '@/server/services/appetite.service';
import { LEVEL_LABEL, type Level } from '@/lib/scoring';
import { LEVEL_STYLES, formatDate, formatRupiah } from '@/lib/format';
import { EmptyState, LevelBadge, PageHeader, SectionCard, StatCard, StatusBadge } from '@/components/ui';
import { SnapshotButton } from '@/components/snapshot-button';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await requireUser();
  const [data, above, trendRows] = await Promise.all([summary(user), gapRisks(user), trend(user)]);

  const maxLevel = Math.max(1, ...data.byLevel.map((l) => Math.max(l.inherent, l.residual)));
  const shownTrend = trendRows.slice(-12);
  const maxTrend = Math.max(1, ...shownTrend.flatMap((row) => [row.netValue, row.netValueRes]));

  return (
    <>
      <PageHeader
        eyebrow="Risk overview"
        title={`Dashboard ${user.orgName ?? 'Organisasi'}`}
        description="Ringkasan profil risiko aktif: jumlah, nilai bersih, biaya penanganan, dan sebaran tingkat risiko."
        actions={
          <>
            <Link href="/exports" className="btn-secondary">
              Ekspor laporan
            </Link>
            <Link href="/risks/new" className="btn-primary">
              + Catat risiko
            </Link>
          </>
        }
      />

      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Risiko aktif"
          value={String(data.active)}
          hint={`${data.total} total · ${data.draft} draft · ${data.submitted} diajukan`}
          accent="indigo"
          icon={<ClipboardList size={15} />}
        />
        <StatCard
          label="Nilai bersih inherent"
          value={formatRupiah(data.netValue, { compact: true })}
          hint={formatRupiah(data.netValue)}
          accent="slate"
          icon={<Wallet size={15} />}
        />
        <StatCard
          label="Nilai bersih residual"
          value={formatRupiah(data.netValueRes, { compact: true })}
          hint={`Turun ${formatRupiah(data.netValue - data.netValueRes, { compact: true })} dari inherent`}
          accent="emerald"
          icon={<ShieldCheck size={15} />}
        />
        <StatCard
          label="Biaya penanganan"
          value={formatRupiah(data.treatmentCost, { compact: true })}
          hint={`${data.aboveAppetite} risiko di atas appetite · ${data.overdue} review terlambat`}
          accent={data.aboveAppetite > 0 ? 'amber' : 'slate'}
          icon={<Activity size={15} />}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <SectionCard
          title="Sebaran tingkat risiko"
          description="Risiko aktif berdasarkan tingkat inherent dan residual."
          className="lg:col-span-2"
        >
          <div className="space-y-4">
            {data.byLevel.map((row) => {
              const lv = row.level as Level;
              return (
                <div key={row.level}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="font-semibold text-muted">{LEVEL_LABEL[lv]}</span>
                    <span className="text-muted">
                      {row.inherent} inherent · {row.residual} residual
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-mist">
                      <div
                        className={`h-full rounded-full ${LEVEL_STYLES[lv].dot}`}
                        style={{ width: `${(row.inherent / maxLevel) * 100}%` }}
                      />
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-mist">
                      <div
                        className="h-full rounded-full bg-teal"
                        style={{ width: `${(row.residual / maxLevel) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-5 flex items-center gap-3 text-[11px] text-muted">
            <span className="flex items-center gap-1">
              <span className="h-2 w-4 rounded-full bg-teal/30" /> inherent
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-4 rounded-full bg-teal" /> residual
            </span>
          </p>
        </SectionCard>

        <SectionCard
          title="Rekap per unit kerja"
          description="Jumlah risiko dan nilai bersih per unit."
          className="lg:col-span-3"
          action={
            <Link href="/heatmap" className="text-xs font-semibold text-teal hover:text-navy">
              Buka heat map →
            </Link>
          }
        >
          {data.byUnit.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">Belum ada data risiko.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-line">
                    <th className="th">Unit</th>
                    <th className="th text-right">Risiko</th>
                    <th className="th text-right">Nilai bersih</th>
                    <th className="th text-right">Residual</th>
                    <th className="th text-right">Di atas appetite</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byUnit.map((u) => (
                    <tr key={u.unit} className="border-b border-line/60 last:border-0">
                      <td className="td font-medium text-ink">{u.unit}</td>
                      <td className="td text-right tabular-nums">{u.count}</td>
                      <td className="td text-right tabular-nums">{formatRupiah(u.netValue, { compact: true })}</td>
                      <td className="td text-right tabular-nums text-muted">
                        {formatRupiah(u.netValueRes, { compact: true })}
                      </td>
                      <td className="td text-right">
                        {u.above > 0 ? (
                          <span className="badge bg-risk-extreme/10 text-risk-extreme ring-risk-extreme/20">{u.above}</span>
                        ) : (
                          <span className="text-muted/60">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <SectionCard
          title="Tren nilai bersih"
          description="Snapshot akhir periode, maksimal 12 periode terakhir."
          className="lg:col-span-3"
          action={<SnapshotButton canCreate={can(user, 'settings.manage')} />}
        >
          {shownTrend.length === 0 ? (
            <EmptyState
              title="Belum ada snapshot"
              description="Ambil snapshot untuk mulai mencatat pergerakan nilai bersih inherent dan residual per periode."
            />
          ) : (
            <>
              <div className="flex h-52 items-end gap-2">
                {shownTrend.map((row) => (
                  <div key={row.period} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                    <div className="flex h-40 w-full items-end justify-center gap-1">
                      <div
                        className="w-[38%] rounded-t bg-teal/30"
                        style={{ height: `${Math.max(3, (row.netValue / maxTrend) * 100)}%` }}
                        title={`Inherent ${row.period}: ${formatRupiah(row.netValue)}`}
                      />
                      <div
                        className="w-[38%] rounded-t bg-teal"
                        style={{ height: `${Math.max(3, (row.netValueRes / maxTrend) * 100)}%` }}
                        title={`Residual ${row.period}: ${formatRupiah(row.netValueRes)}`}
                      />
                    </div>
                    <span className="truncate text-[10px] tabular-nums text-muted">{row.period}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 flex items-center gap-3 text-[11px] text-muted">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-4 rounded-full bg-teal/30" /> inherent
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-4 rounded-full bg-teal" /> residual
                </span>
                <span>
                  · {trendRows.length} periode tercatat{trendRows.length > shownTrend.length ? ' (ditampilkan terakhir)' : ''}
                </span>
              </p>
            </>
          )}
        </SectionCard>

        <SectionCard
          title="Review jatuh tempo"
          description="Risiko aktif yang tanggal review berikutnya sudah lewat."
          className="lg:col-span-2"
          action={
            <Link href="/risks?status=ACTIVE" className="text-xs font-semibold text-teal hover:text-navy">
              Buka register →
            </Link>
          }
        >
          {data.overdueRisks.length === 0 ? (
            <EmptyState
              title="Tidak ada review terlambat"
              description="Semua risiko aktif masih memiliki jadwal review yang berlaku."
            />
          ) : (
            <ul className="divide-y divide-line">
              {data.overdueRisks.map((r) => (
                <li key={r.id} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/risks/${r.id}`}
                      className="min-w-0 truncate text-sm font-semibold text-ink hover:text-teal"
                    >
                      {r.code} · {r.description}
                    </Link>
                    <span className="shrink-0 text-[11px] font-semibold text-risk-extreme">
                      {formatDate(r.nextReviewAt)}
                    </span>
                  </div>
                  <p className="mt-1 flex items-center gap-2 text-xs text-muted">
                    <LevelBadge level={r.levelRes} score={r.scoreRes} />
                    <span className="truncate">
                      {r.unit}
                      {r.owner ? ` · ${r.owner}` : ''}
                    </span>
                  </p>
                </li>
              ))}
              {data.overdue > data.overdueRisks.length && (
                <li className="pt-3 text-center text-xs text-muted">
                  +{data.overdue - data.overdueRisks.length} risiko lain yang juga terlambat
                </li>
              )}
            </ul>
          )}
        </SectionCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="Nilai bersih terbesar"
          description="Lima risiko aktif dengan eksposur tertinggi."
          action={
            <Link href="/risks?sort=netValue:desc" className="text-xs font-semibold text-teal hover:text-navy">
              Semua risiko →
            </Link>
          }
        >
          {data.topRisks.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">Belum ada risiko aktif.</p>
          ) : (
            <ul className="divide-y divide-line">
              {data.topRisks.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <Link href={`/risks/${r.id}`} className="block truncate text-sm font-semibold text-ink hover:text-teal">
                      {r.code} · {r.description}
                    </Link>
                    <p className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                      <LevelBadge level={r.level} />
                      <span className="truncate">{r.unit?.name}</span>
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-ink">
                    {formatRupiah(r.netValue, { compact: true })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Di atas Risk Appetite"
          description="Risiko aktif yang skor residual-nya melewati batas appetite."
          action={
            <Link href="/appetite" className="text-xs font-semibold text-teal hover:text-navy">
              Kelola appetite →
            </Link>
          }
        >
          {above.length === 0 ? (
            <EmptyState
              title="Semua risiko dalam appetite"
              description="Tidak ada risiko aktif yang melampaui batas kategori atau unit."
            />
          ) : (
            <ul className="divide-y divide-line">
              {above.slice(0, 5).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <Link href={`/risks/${r.id}`} className="text-sm font-semibold text-ink hover:text-teal">
                      {r.code} · {r.description}
                    </Link>
                    <p className="truncate text-xs text-muted">{r.unit?.name}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusBadge status={r.status} />
                    <LevelBadge level={r.levelRes} score={r.scoreRes} />
                  </div>
                </li>
              ))}
              {above.length > 5 && (
                <li className="pt-3 text-center text-xs text-muted">
                  +{above.length - 5} risiko lain di halaman Risk Appetite
                </li>
              )}
            </ul>
          )}
        </SectionCard>
      </div>
    </>
  );
}
