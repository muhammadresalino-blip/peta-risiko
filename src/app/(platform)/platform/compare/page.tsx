import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/session';
import { compareOrganizations } from '@/server/services/platform.service';
import { EmptyState, PageHeader, SectionCard, StatCard } from '@/components/ui';
import { LEVEL_LABEL, type Level } from '@/lib/scoring';
import { LEVEL_STYLES } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ orgIds?: string }> }) {
  const user = await requireUser();
  if (user.role !== 'PLATFORM_ADMIN') redirect('/dashboard');

  const sp = await searchParams;
  const ids = (sp.orgIds ?? '').split(',').filter(Boolean);
  const rows = await compareOrganizations(ids);

  const totalActive = rows.reduce((sum, r) => sum + r.active, 0);
  const totalAbove = rows.reduce((sum, r) => sum + r.aboveAppetite, 0);
  const activeOrgs = rows.filter((r) => r.isActive).length;

  return (
    <>
      <PageHeader
        eyebrow="Platform"
        title="Perbandingan antarorganisasi"
        description="Bandingkan jumlah dan tingkat risiko antar tenant. Nilai rupiah tidak dibandingkan langsung karena BTR setiap organisasi berbeda."
        breadcrumb={[{ href: '/organizations', label: 'Organisasi' }, { label: 'Perbandingan' }]}
        actions={
          ids.length > 0 ? (
            <Link href="/platform/compare" className="btn-secondary">
              Tampilkan semua
            </Link>
          ) : undefined
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Organisasi" value={String(rows.length)} hint={`${activeOrgs} aktif`} accent="indigo" />
        <StatCard label="Risiko aktif" value={String(totalActive)} hint="Seluruh organisasi" accent="slate" />
        <StatCard label="Di atas appetite" value={String(totalAbove)} hint="Risiko aktif lintas tenant" accent="rose" />
        <StatCard
          label="Rata-rata skor tertinggi"
          value={rows.reduce((max, r) => Math.max(max, r.avgScore ?? 0), 0).toFixed(1)}
          hint="Skor inherent rata-rata"
          accent="amber"
        />
      </div>

      <div className="mt-6">
        {rows.length === 0 ? (
          <EmptyState
            title="Tidak ada organisasi"
            description="Tambahkan organisasi terlebih dahulu untuk melihat perbandingan."
            action={
              <Link href="/organizations" className="btn-primary">
                Kelola organisasi
              </Link>
            }
          />
        ) : (
          <SectionCard
            title="Matriks perbandingan"
            description="Skor inherent aktif; sebaran tingkat memakai jumlah risiko aktif per tingkat."
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px]">
                <thead>
                  <tr className="border-b border-line">
                    <th className="th">Organisasi</th>
                    <th className="th text-right">Aktif</th>
                    <th className="th text-right">Draft</th>
                    <th className="th text-right">Diajukan</th>
                    <th className="th text-right">Di atas appetite</th>
                    <th className="th text-right">Rata-rata skor</th>
                    <th className="th text-right">Skor maks.</th>
                    <th className="th">Sebaran tingkat</th>
                    <th className="th text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((org) => (
                    <tr key={org.id} className="border-b border-line/60 align-top last:border-0">
                      <td className="td">
                        <p className="font-semibold text-ink">{org.name}</p>
                        <p className="text-xs text-muted">
                          <span className="font-mono">{org.slug}</span> · {org.currency} ·{' '}
                          {org.isActive ? 'aktif' : 'nonaktif'}
                        </p>
                        <p className="text-xs text-muted">
                          {org.users} pengguna · {org.units} unit · {org.total} risiko total
                        </p>
                      </td>
                      <td className="td text-right font-semibold tabular-nums">{org.active}</td>
                      <td className="td text-right tabular-nums text-muted">{org.draft}</td>
                      <td className="td text-right tabular-nums text-muted">{org.submitted}</td>
                      <td className="td text-right tabular-nums">
                        {org.aboveAppetite > 0 ? (
                          <span className="badge bg-risk-extreme/10 text-risk-extreme ring-risk-extreme/20">{org.aboveAppetite}</span>
                        ) : (
                          <span className="text-muted/50">—</span>
                        )}
                      </td>
                      <td className="td text-right tabular-nums">{org.avgScore ?? '—'}</td>
                      <td className="td text-right tabular-nums">{org.maxScore ?? '—'}</td>
                      <td className="td">
                        <div className="flex flex-wrap gap-1.5">
                          {(['LOW', 'MEDIUM', 'HIGH', 'EXTREME'] as Level[]).map((level) => (
                            <span
                              key={level}
                              title={LEVEL_LABEL[level]}
                              className={`inline-flex items-center gap-1 rounded-full bg-mist px-2 py-0.5 text-[11px] text-muted ${
                                org.byLevel[level] > 0 ? '' : 'opacity-40'
                              }`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${LEVEL_STYLES[level].dot}`} />
                              <span className="font-semibold">{LEVEL_LABEL[level]}</span>
                              <span className="tabular-nums">{org.byLevel[level]}</span>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="td text-right">
                        <Link
                          href={`/platform/compare?orgIds=${org.id}`}
                          className="text-xs font-semibold text-teal hover:text-navy"
                        >
                          Fokus
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-4 rounded-lg bg-mist px-3 py-2 text-xs text-muted">
              Angka skor berasal dari P × I yang dihitung server. Perbandingan nilai bersih antarorganisasi sengaja
              tidak ditampilkan agar tidak menyesatkan ketika BTR dan skala usaha berbeda.
            </p>
          </SectionCard>
        )}
      </div>
    </>
  );
}
