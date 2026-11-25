import Link from 'next/link';
import { requireUser } from '@/lib/session';
import { heatmap } from '@/server/services/dashboard.service';
import { level, LEVEL_LABEL, type Level } from '@/lib/scoring';
import { LEVEL_STYLES } from '@/lib/format';
import { PageHeader, SectionCard } from '@/components/ui';

export const dynamic = 'force-dynamic';

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

export default async function HeatmapPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const view = one(sp.view) === 'residual' ? 'residual' : 'inherent';
  const data = await heatmap(user, view);

  const cellOf = (p: number, i: number) => data.cells.find((c) => c.p === p && c.i === i);

  return (
    <>
      <PageHeader
        eyebrow="Analisis risiko"
        title="Heat Map 5 × 5"
        description="Posisi setiap risiko aktif berdasarkan probabilitas (sumbu vertikal) dan dampak (horizontal)."
        actions={
          <div className="inline-flex rounded-lg border border-line bg-white p-0.5 text-xs font-semibold">
            <Link
              href="/heatmap?view=inherent"
              className={`rounded-md px-3 py-1.5 ${view === 'inherent' ? 'bg-navy text-white' : 'text-muted hover:bg-mist'}`}
            >
              Inherent
            </Link>
            <Link
              href="/heatmap?view=residual"
              className={`rounded-md px-3 py-1.5 ${view === 'residual' ? 'bg-navy text-white' : 'text-muted hover:bg-mist'}`}
            >
              Residual
            </Link>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-4">
        <SectionCard
          title={`Matriks risiko ${view === 'inherent' ? 'inherent' : 'residual'}`}
          description={`${data.total} risiko aktif/diajukan dipetakan.`}
          className="lg:col-span-3"
        >
          <div className="overflow-x-auto">
            <div className="min-w-[620px]">
              <div className="mb-2 grid grid-cols-[52px_repeat(5,1fr)] gap-1.5">
                <div />
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="text-center text-[11px] font-semibold uppercase tracking-wide text-muted">
                    I = {i}
                  </div>
                ))}
              </div>

              {[5, 4, 3, 2, 1].map((p) => (
                <div key={p} className="mb-1.5 grid grid-cols-[52px_repeat(5,1fr)] gap-1.5">
                  <div className="flex items-center justify-center text-[11px] font-semibold uppercase tracking-wide text-muted">
                    P = {p}
                  </div>
                  {[1, 2, 3, 4, 5].map((i) => {
                    const cell = cellOf(p, i);
                    const lv = level(p * i) as Level;
                    const count = cell?.risks.length ?? 0;
                    return (
                      <div
                        key={i}
                        className={`min-h-[92px] rounded-lg border p-2 ${LEVEL_STYLES[lv].cell} ${
                          count === 0 ? 'opacity-60' : ''
                        }`}
                      >
                        <div className="data-value flex items-center justify-between text-[11px] font-bold">
                          <span className="opacity-70">{p * i}</span>
                          <span>{count > 0 ? count : ''}</span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {cell?.risks.map((r) => (
                            <Link
                              key={r.id}
                              href={`/risks/${r.id}`}
                              title={`${r.code} — ${r.unit}`}
                              className="rounded bg-white/80 px-1.5 py-0.5 text-[10px] font-semibold shadow-sm ring-1 ring-black/5 hover:bg-white"
                            >
                              {r.code}
                            </Link>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}

              <div className="mt-1 grid grid-cols-[52px_repeat(5,1fr)] gap-1.5">
                <div />
                <div className="col-span-5 text-center text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Dampak (I) →
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        <div className="space-y-6">
          <SectionCard title="Legenda tingkat">
            <ul className="space-y-2 text-sm">
              {(['LOW', 'MEDIUM', 'HIGH', 'EXTREME'] as Level[]).map((lv) => (
                <li key={lv} className="flex items-center gap-2">
                  <span className={`h-3 w-3 rounded ${LEVEL_STYLES[lv].dot}`} />
                  <span className="text-ink">{LEVEL_LABEL[lv]}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs leading-relaxed text-muted">
              Tingkat risiko tidak hanya dibedakan lewat warna — setiap badge juga memuat label teks.
            </p>
          </SectionCard>

          <SectionCard title="Sebaran sel terpadat">
            {data.cells.filter((c) => c.risks.length > 0).length === 0 ? (
              <p className="text-sm text-muted">Belum ada risiko pada tampilan ini.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {data.cells
                  .filter((c) => c.risks.length > 0)
                  .sort((a, b) => b.risks.length - a.risks.length)
                  .slice(0, 6)
                  .map((c) => (
                    <li key={`${c.p}-${c.i}`} className="flex items-center justify-between">
                      <span className="text-muted">
                        P {c.p} × I {c.i} = {c.score}
                      </span>
                      <span className="badge bg-mist text-muted ring-line">{c.risks.length} risiko</span>
                    </li>
                  ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>
    </>
  );
}
