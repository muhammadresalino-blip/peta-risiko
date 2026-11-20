import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/session';
import { can, seesAllUnits } from '@/lib/rbac';
import { prisma } from '@/lib/db';
import { formatDateTime } from '@/lib/format';
import { PageHeader, SectionCard } from '@/components/ui';

export const dynamic = 'force-dynamic';

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

const ACTION_STYLE: Record<string, string> = {
  CREATE: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  UPDATE: 'bg-sky-100 text-sky-700 ring-sky-200',
  DELETE: 'bg-rose-100 text-rose-700 ring-rose-200',
  APPROVE: 'bg-[#e6f3ef] text-[#27745f] ring-[#cfe7e1]',
  REJECT: 'bg-orange-100 text-orange-700 ring-orange-200',
  SUBMIT: 'bg-[#f0f2f5] text-[#475467] ring-line',
  RETIRE: 'bg-zinc-100 text-zinc-600 ring-zinc-200',
  IMPORT: 'bg-purple-100 text-purple-700 ring-purple-200',
  RECALCULATE: 'bg-amber-100 text-amber-700 ring-amber-200',
  SETTINGS: 'bg-amber-100 text-amber-700 ring-amber-200',
};

export default async function AuditLogsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireUser();
  if (!can(user, 'audit.view')) redirect('/dashboard');

  const sp = await searchParams;
  const entity = one(sp.entity);
  const actorId = one(sp.actor);
  const from = one(sp.from);
  const to = one(sp.to);
  const page = Math.max(1, Number(one(sp.page) || 1));
  const limit = 30;

  const where: Record<string, unknown> = { orgId: user.orgId ?? '__none__' };
  if (entity) where.entity = entity;
  if (actorId) where.actorId = actorId;
  if (from || to) {
    where.at = {
      ...(from ? { gte: new Date(`${from}T00:00:00`) } : {}),
      ...(to ? { lte: new Date(`${to}T23:59:59`) } : {}),
    };
  }
  if (!seesAllUnits(user)) {
    const own = await prisma.risk.findMany({
      where: { orgId: user.orgId ?? '__none__', unitId: user.unitId ?? '__none__' },
      select: { id: true },
    });
    where.entityId = { in: own.map((r) => r.id) };
  }

  const [total, logs, actors] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({ where, orderBy: { at: 'desc' }, skip: (page - 1) * limit, take: limit }),
    prisma.user.findMany({ where: { orgId: user.orgId ?? '__none__' }, select: { id: true, name: true } }),
  ]);
  const nameById = new Map(actors.map((a) => [a.id, a.name]));
  const pages = Math.ceil(total / limit) || 1;

  const qs = (patch: Record<string, string | number>) => {
    const params = new URLSearchParams();
    const base: Record<string, string> = { entity, actor: actorId, from, to, page: String(page) };
    Object.entries({ ...base, ...patch }).forEach(([k, v]) => {
      if (v !== '' && !(k === 'page' && v === '1')) params.set(k, String(v));
    });
    const s = params.toString();
    return s ? `/admin/audit-logs?${s}` : '/admin/audit-logs';
  };

  return (
    <>
      <PageHeader
        eyebrow="Akuntabilitas"
        title="Audit Log"
        description="Jejak siapa mengubah apa dan kapan. Catatan append-only; tidak dapat diubah dari aplikasi."
      />

      <form method="get" className="card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label className="label" htmlFor="entity">
            Entitas
          </label>
          <select id="entity" name="entity" defaultValue={entity} className="input">
            <option value="">Semua</option>
            {['Risk', 'Setting', 'RiskAppetite', 'User', 'Unit'].map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="actor">
            Pelaku
          </label>
          <select id="actor" name="actor" defaultValue={actorId} className="input">
            <option value="">Semua</option>
            {actors.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="from">
            Dari tanggal
          </label>
          <input id="from" type="date" name="from" defaultValue={from} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="to">
            Sampai tanggal
          </label>
          <input id="to" type="date" name="to" defaultValue={to} className="input" />
        </div>
        <div className="flex items-end gap-2">
          <button className="btn-primary w-full" type="submit">
            Terapkan
          </button>
        </div>
      </form>

      <SectionCard title="Riwayat perubahan" description={`${total} catatan`}>
        {logs.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Belum ada catatan yang cocok dengan filter.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead>
                <tr className="border-b border-line">
                  <th className="th">Waktu</th>
                  <th className="th">Pelaku</th>
                  <th className="th">Aksi</th>
                  <th className="th">Entitas</th>
                  <th className="th">Ringkasan</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-slate-50 last:border-0 align-top">
                    <td className="td whitespace-nowrap text-xs text-muted">{formatDateTime(log.at)}</td>
                    <td className="td whitespace-nowrap text-[#475467]">{nameById.get(log.actorId) ?? 'â€”'}</td>
                    <td className="td">
                      <span className={`badge ${ACTION_STYLE[log.action] ?? 'bg-[#f0f2f5] text-[#475467] ring-line'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="td text-[#536174]">
                      {log.entity}
                      <span className="block text-[11px] text-[#98a2b3]">{log.entityId.slice(0, 12)}â€¦</span>
                    </td>
                    <td className="td">
                      <p className="max-w-xl truncate font-mono text-[11px] text-muted" title={log.after ?? ''}>
                        {log.before ? `âˆ’ ${log.before.slice(0, 80)} ` : ''}
                        {log.after ? `+ ${log.after.slice(0, 120)}` : ''}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between text-xs text-muted">
          <span>
            Halaman {page} dari {pages}
          </span>
          <div className="flex gap-1">
            <a className={`btn-secondary btn-sm ${page <= 1 ? 'pointer-events-none opacity-40' : ''}`} href={qs({ page: page - 1 })}>
              â†
            </a>
            <a className={`btn-secondary btn-sm ${page >= pages ? 'pointer-events-none opacity-40' : ''}`} href={qs({ page: page + 1 })}>
              â†’
            </a>
          </div>
        </div>
      </SectionCard>
    </>
  );
}
