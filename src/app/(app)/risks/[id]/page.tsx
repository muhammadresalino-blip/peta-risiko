import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { requireUser, HttpError } from '@/lib/session';
import { getRisk } from '@/server/services/risk.service';
import { appetiteLimit } from '@/server/services/risk.service';
import { can, canEditRisk, canViewAuditOf } from '@/lib/rbac';
import { getSettings } from '@/lib/settings';
import { prisma } from '@/lib/db';
import { formatDate, formatDateTime, formatRupiah, STATUS_LABEL, STRATEGY_LABEL } from '@/lib/format';
import { LevelBadge, PageHeader, SectionCard, StatusBadge } from '@/components/ui';
import { RiskActions } from '@/components/risk-actions';
import { RiskAttachments, RiskKRI, RiskMitigations } from '@/components/risk-extras';

export const dynamic = 'force-dynamic';

const Card = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="rounded-lg border border-line bg-mist/60 p-3">
    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</p>
    <p className="mt-1 text-sm text-ink">{children || '—'}</p>
  </div>
);

export default async function RiskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  let risk;
  try {
    risk = await getRisk(user, id);
  } catch (err) {
    if (err instanceof HttpError && err.status === 404) notFound();
    throw err;
  }

  const [settings, limit, logs] = await Promise.all([
    getSettings(risk.orgId),
    appetiteLimit(risk.orgId, risk.category, risk.unitId),
    canViewAuditOf(user, risk)
      ? prisma.auditLog.findMany({
          where: { orgId: risk.orgId, entityId: risk.id },
          orderBy: { at: 'desc' },
          take: 25,
        })
      : Promise.resolve([]),
  ]);

  const actor = { id: user.id, role: user.role, orgId: user.orgId, unitId: user.unitId };
  const canEdit = canEditRisk(actor, risk);
  const overdue = risk.nextReviewAt ? risk.nextReviewAt < new Date() : false;

  const mitigations = risk.mitigations.map((m) => ({
    id: m.id,
    description: m.description,
    deadline: m.deadline ? m.deadline.toISOString() : null,
    status: m.status,
    owner: m.owner,
  }));
  const kris = risk.kris.map((k) => ({
    id: k.id,
    name: k.name,
    unit: k.unit,
    threshold: k.threshold,
    values: k.values.map((v) => ({ id: v.id, period: v.period, value: v.value })),
  }));
  const attachments = risk.attachments.map((a) => ({
    id: a.id,
    name: a.name,
    mimeType: a.mimeType,
    path: a.path,
    size: a.size,
    uploadedAt: a.uploadedAt.toISOString(),
  }));

  return (
    <>
      <PageHeader
        breadcrumb={[{ href: '/risks', label: 'Register Risiko' }, { label: risk.code }]}
        eyebrow="Detail risiko"
        title={risk.description}
        description={`${risk.code} · ${risk.category} · ${risk.unit.name}`}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={risk.status} />
            {risk.aboveAppetite && <span className="badge bg-risk-extreme/10 text-risk-extreme ring-risk-extreme/20">di atas appetite</span>}
          </div>
        }
      />

      {risk.scoreRes > risk.score && (
        <div className="mb-6 flex items-start gap-2 rounded-lg bg-risk-medium/10 px-4 py-3 text-sm text-risk-medium ring-1 ring-risk-medium/20">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <p>
            <strong>Perhatian:</strong> skor residual ({risk.scoreRes}) lebih tinggi daripada skor inherent (
            {risk.score}). Periksa kembali penilaian probabilitas dan dampak residual.
          </p>
        </div>
      )}

      <div className="mb-6">
        <RiskActions
          riskId={risk.id}
          status={risk.status}
          canSubmit={can(actor, 'risk.submit')}
          canApprove={can(actor, 'risk.approve')}
          canRetire={can(actor, 'risk.retire')}
          canReview={can(actor, 'risk.review')}
          canDelete={can(actor, 'risk.delete')}
          canEdit={canEditRisk(actor, risk)}
          scoreRes={risk.scoreRes}
          rp={risk.rp}
          ri={risk.ri}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line bg-mist/60 px-5 py-3">
            <h2 className="text-sm font-bold text-navy">Risiko inherent</h2>
            <LevelBadge level={risk.level} score={risk.score} />
          </div>
          <div className="grid grid-cols-2 gap-3 p-5 text-sm">
            <div>
              <p className="text-xs text-muted">P × I</p>
              <p className="data-value font-semibold">
                {risk.p} × {risk.i} = {risk.score}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted">Probabilitas</p>
              <p className="data-value font-semibold">{Math.round(risk.probPct * 100)}%</p>
            </div>
            <div>
              <p className="text-xs text-muted">Dampak finansial</p>
              <p className="data-value font-semibold">{formatRupiah(risk.financialImpact)}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Nilai bersih</p>
              <p className="data-value font-semibold text-teal">{formatRupiah(risk.netValue)}</p>
            </div>
          </div>
        </section>

        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line bg-mist/60 px-5 py-3">
            <h2 className="text-sm font-bold text-navy">Risiko residual</h2>
            <LevelBadge level={risk.levelRes} score={risk.scoreRes} />
          </div>
          <div className="grid grid-cols-2 gap-3 p-5 text-sm">
            <div>
              <p className="text-xs text-muted">P&apos; × I&apos;</p>
              <p className="data-value font-semibold">
                {risk.rp} × {risk.ri} = {risk.scoreRes}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted">Probabilitas</p>
              <p className="data-value font-semibold">{Math.round(risk.probPctRes * 100)}%</p>
            </div>
            <div>
              <p className="text-xs text-muted">Dampak finansial</p>
              <p className="data-value font-semibold">{formatRupiah(risk.financialImpactRes)}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Nilai bersih</p>
              <p className="data-value font-semibold text-risk-low">{formatRupiah(risk.netValueRes)}</p>
            </div>
            <div className="col-span-2 rounded-md bg-mist px-3 py-2 text-xs text-muted">
              Batas appetite kategori ini: <strong>{limit !== null ? `skor ≤ ${limit}` : 'belum diatur'}</strong>
              {limit !== null && (
                <span className={risk.aboveAppetite ? 'text-risk-extreme' : 'text-risk-low'}>
                  {' '}
                  — risiko ini {risk.aboveAppetite ? 'melampaui' : 'dalam'} batas.
                </span>
              )}
            </div>
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <SectionCard title="Identifikasi" className="lg:col-span-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <Card label="Sasaran">{risk.goal}</Card>
            <Card label="Tipe">{risk.type === 'OPPORTUNITY' ? 'Peluang' : 'Ancaman'}</Card>
            <Card label="Akar penyebab">{risk.rootCause}</Card>
            <Card label="Indikator">{risk.indicator}</Card>
            <Card label="Internal control">{risk.existingControl}</Card>
            <Card label="Dampak kualitatif">{risk.qualitativeImpact}</Card>
            <Card label="Tanggal identifikasi">{formatDate(risk.identifiedAt)}</Card>
            <Card label="Review berikutnya">
              <span className={overdue ? 'font-semibold text-risk-extreme' : ''}>
                {formatDate(risk.nextReviewAt)}
                {overdue && ' (terlambat)'}
              </span>
            </Card>
          </div>
        </SectionCard>

        <SectionCard title="Penanganan">
          <div className="space-y-3">
            <Card label="Strategi">{STRATEGY_LABEL[risk.strategy] ?? risk.strategy}</Card>
            <Card label="Rencana penanganan">{risk.treatment}</Card>
            <Card label="Biaya penanganan">{formatRupiah(risk.treatmentCost)}</Card>
            <Card label="Sudah dilakukan">{risk.actionsDone}</Card>
            <Card label="Pemilik risiko">
              {risk.owner.name}
              {risk.ownerTitle ? ` · ${risk.ownerTitle}` : ''}
            </Card>
          </div>
        </SectionCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <SectionCard title="Kajian berkala" description={`${risk.reviews.length} catatan kajian`}>
          {risk.reviews.length === 0 ? (
            <p className="py-4 text-sm text-muted">Belum ada kajian tercatat.</p>
          ) : (
            <ol className="relative space-y-4 border-l border-line pl-5">
              {risk.reviews.map((rev) => (
                <li key={rev.id} className="relative">
                  <span className="absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full bg-teal ring-4 ring-white" />
                  <p className="text-xs text-muted">
                    {formatDateTime(rev.reviewedAt)} · {rev.reviewer.name}
                  </p>
                  <p className="mt-1 text-sm text-ink">{rev.note}</p>
                  <p className="mt-1 text-xs text-muted">
                    Residual dinilai ulang: P&apos; {rev.rpAfter}, I&apos; {rev.riAfter}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </SectionCard>

        <SectionCard
          title="Audit log risiko"
          description={logs.length ? `${logs.length} perubahan terakhir` : 'Riwayat perubahan'}
        >
          {logs.length === 0 ? (
            <p className="py-4 text-sm text-muted">Tidak ada audit log yang dapat ditampilkan untuk peran Anda.</p>
          ) : (
            <ul className="divide-y divide-line">
              {logs.map((log) => (
                <li key={log.id} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="badge bg-mist text-ink ring-line">{log.action}</span>
                    <span className="text-xs text-muted">{formatDateTime(log.at)}</span>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted">
                    {log.before || log.after ? (
                      <span className="font-mono text-[11px] text-muted">
                        {log.before ? `sebelum: ${log.before.slice(0, 120)}` : ''}
                        {log.before && log.after ? ' → ' : ''}
                        {log.after ? `sesudah: ${log.after.slice(0, 120)}` : ''}
                      </span>
                    ) : (
                      '—'
                    )}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <RiskMitigations riskId={risk.id} initialData={mitigations} canEdit={canEdit} />
        </section>
        <section className="card p-5">
          <RiskAttachments riskId={risk.id} initialData={attachments} canEdit={canEdit} />
        </section>
      </div>

      <section className="card mt-6 p-5">
        <RiskKRI riskId={risk.id} initialData={kris} canEdit={canEdit} />
      </section>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <p>
          Dibuat {formatDateTime(risk.createdAt)} · diperbarui {formatDateTime(risk.updatedAt)} · versi {risk.version}
        </p>
        <Link href="/risks" className="font-semibold text-teal hover:text-navy">
          ← Kembali ke register
        </Link>
      </div>
    </>
  );
}
