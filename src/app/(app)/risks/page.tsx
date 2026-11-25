import Link from 'next/link';
import { requireUser } from '@/lib/session';
import { listRisks } from '@/server/services/risk.service';
import { prisma } from '@/lib/db';
import { LEVEL_LABEL, type Level } from '@/lib/scoring';
import { formatDate, formatRupiah, STATUS_LABEL } from '@/lib/format';
import { EmptyState, LevelBadge, PageHeader, StatusBadge } from '@/components/ui';

export const dynamic = 'force-dynamic';

type Search = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

export default async function RisksPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireUser();
  const sp = await searchParams;

  const q = one(sp.q);
  const unit = one(sp.unit);
  const category = one(sp.category);
  const level = one(sp.level);
  const status = one(sp.status);
  const appetite = one(sp.appetite);
  const sort = one(sp.sort) || 'updatedAt:desc';
  const page = Number(one(sp.page) || 1);

  const [result, units, categories] = await Promise.all([
    listRisks(user, { q, unit, category, level, status, appetite, sort, page, limit: 20 }),
    prisma.unit.findMany({ where: { orgId: user.orgId ?? '__none__' }, orderBy: { name: 'asc' } }),
    prisma.riskCategory.findMany({ where: { orgId: user.orgId ?? '__none__' }, orderBy: { name: 'asc' } }),
  ]);

  const buildQuery = (patch: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    const base: Record<string, string> = { q, unit, category, level, status, appetite, sort, page: String(page) };
    Object.entries({ ...base, ...patch }).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && !(k === 'page' && v === '1')) params.set(k, String(v));
    });
    const qs = params.toString();
    return qs ? `/risks?${qs}` : '/risks';
  };

  const sortLabel = (field: string) => (sort.startsWith(field) ? (sort.endsWith('asc') ? ' ↑' : ' ↓') : '');

  return (
    <>
      <PageHeader
        eyebrow="Inventaris risiko"
        title="Register Risiko"
        description="Daftar risiko organisasi dengan pencarian, filter, dan pengurutan. Skor dihitung server saat disimpan."
        actions={
          <>
            <Link className="btn-secondary" href="/risks/print">
              âŽ™ Cetak
            </Link>
            <a className="btn-secondary" href="/api/v1/exports/risks.xlsx">
              â‡© Excel
            </a>
            <Link className="btn-primary" href="/risks/new">
              + Catat risiko
            </Link>
          </>
        }
      />

      <form method="get" className="card mb-4 grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-6">
        <div className="xl:col-span-2">
          <label className="label" htmlFor="q">
            Cari
          </label>
          <input id="q" name="q" defaultValue={q} placeholder="Kode, deskripsi, sasaran…" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="unit">
            Unit
          </label>
          <select id="unit" name="unit" defaultValue={unit} className="input">
            <option value="">Semua unit</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="category">
            Kategori
          </label>
          <select id="category" name="category" defaultValue={category} className="input">
            <option value="">Semua kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="level">
            Tingkat
          </label>
          <select id="level" name="level" defaultValue={level} className="input">
            <option value="">Semua tingkat</option>
            {(['LOW', 'MEDIUM', 'HIGH', 'EXTREME'] as Level[]).map((l) => (
              <option key={l} value={l}>
                {LEVEL_LABEL[l]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="status">
            Status
          </label>
          <select id="status" name="status" defaultValue={status} className="input">
            <option value="">Semua status</option>
            {Object.entries(STATUS_LABEL).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2 xl:col-span-3">
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" name="appetite" value="above" defaultChecked={appetite === 'above'} className="h-4 w-4 rounded border-line" />
            Hanya di atas appetite
          </label>
          <input type="hidden" name="sort" value={sort} />
        </div>
        <div className="flex items-end gap-2 xl:col-span-3 xl:justify-end">
          <Link href="/risks" className="btn-ghost">
            Reset
          </Link>
          <button type="submit" className="btn-primary">
            Terapkan filter
          </button>
        </div>
      </form>

      {result.rows.length === 0 ? (
        <EmptyState
          title="Belum ada risiko yang cocok"
          description="Ubah filter atau catat risiko baru untuk mulai mengisi register."
          action={
            <Link href="/risks/new" className="btn-primary">
              + Catat risiko
            </Link>
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead className="bg-mist/80">
                <tr>
                  <th className="th">Kode</th>
                  <th className="th">Risiko</th>
                  <th className="th">P × I</th>
                  <th className="th">
                    <Link href={buildQuery({ sort: sort.startsWith('score') ? 'score:asc' : 'score:desc' })} className="hover:text-ink">
                      Inherent{sortLabel('score')}
                    </Link>
                  </th>
                  <th className="th">Residual</th>
                  <th className="th text-right">
                    <Link href={buildQuery({ sort: sort.startsWith('netValue') ? 'netValue:asc' : 'netValue:desc' })} className="hover:text-ink">
                      Nilai bersih{sortLabel('netValue')}
                    </Link>
                  </th>
                  <th className="th">Status</th>
                  <th className="th">Diperbarui</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((r) => (
                  <tr key={r.id} className="border-t border-line transition hover:bg-mist/70">
                    <td className="td">
                      <Link href={`/risks/${r.id}`} className="risk-code font-semibold text-teal hover:text-navy">
                        {r.code}
                      </Link>
                    </td>
                    <td className="td max-w-sm">
                      <p className="truncate font-medium text-ink">{r.description}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted">
                        <span>{r.unit?.name}</span>
                        <span className="text-muted/40">·</span>
                        <span className="truncate">{r.category}</span>
                        {r.aboveAppetite && (
                          <span className="badge bg-risk-extreme/10 text-risk-extreme ring-risk-extreme/20">di atas appetite</span>
                        )}
                      </p>
                    </td>
                    <td className="td data-value text-muted">
                      {r.p} × {r.i}
                    </td>
                    <td className="td">
                      <LevelBadge level={r.level} score={r.score} />
                    </td>
                    <td className="td">
                      <LevelBadge level={r.levelRes} score={r.scoreRes} />
                    </td>
                    <td className="td text-right">
                      <p className="data-value font-medium text-ink">{formatRupiah(r.netValue, { compact: true })}</p>
                      <p className="data-value text-xs text-muted">{formatRupiah(r.netValueRes, { compact: true })}</p>
                    </td>
                    <td className="td">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="td whitespace-nowrap text-xs text-muted">{formatDate(r.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3 text-xs text-muted">
            <p>
              Menampilkan {(result.page - 1) * result.limit + 1}–{Math.min(result.page * result.limit, result.total)} dari{' '}
              {result.total} risiko
            </p>
            <div className="flex items-center gap-1">
              <Link
                href={buildQuery({ page: Math.max(1, page - 1) })}
                aria-disabled={page <= 1}
                className={`btn-secondary btn-sm ${page <= 1 ? 'pointer-events-none opacity-40' : ''}`}
              >
                ←
              </Link>
              <span className="px-2 font-semibold text-muted">
                {result.page} / {result.pages}
              </span>
              <Link
                href={buildQuery({ page: Math.min(result.pages, page + 1) })}
                aria-disabled={page >= result.pages}
                className={`btn-secondary btn-sm ${page >= result.pages ? 'pointer-events-none opacity-40' : ''}`}
              >
                →
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
