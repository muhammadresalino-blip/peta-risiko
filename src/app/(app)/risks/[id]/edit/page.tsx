import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/session';
import { getRisk } from '@/server/services/risk.service';
import { canEditRisk } from '@/lib/rbac';
import { prisma } from '@/lib/db';
import { getSettings, toScoringConfig } from '@/lib/settings';
import { PageHeader } from '@/components/ui';
import { RiskForm } from '@/components/risk-form';

export const dynamic = 'force-dynamic';

export default async function EditRiskPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const risk = await getRisk(user, id);

  const actor = { id: user.id, role: user.role, orgId: user.orgId, unitId: user.unitId };
  if (!canEditRisk(actor, risk)) redirect(`/risks/${id}`);

  const [units, categories, users, settings] = await Promise.all([
    prisma.unit.findMany({ where: { orgId: risk.orgId }, orderBy: { name: 'asc' } }),
    prisma.riskCategory.findMany({ where: { orgId: risk.orgId }, orderBy: { name: 'asc' } }),
    prisma.user.findMany({ where: { orgId: risk.orgId, isActive: true }, select: { id: true, name: true, role: true } }),
    getSettings(risk.orgId),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Detail risiko"
        title={`Ubah ${risk.code}`}
        description="Perubahan pada risiko Active oleh Risk Owner mengembalikannya ke status Diajukan."
        breadcrumb={[
          { href: '/risks', label: 'Register Risiko' },
          { href: `/risks/${risk.id}`, label: risk.code },
          { label: 'Ubah' },
        ]}
      />
      <RiskForm
        mode="edit"
        config={toScoringConfig(settings)}
        units={units.map((u) => ({ id: u.id, name: u.name }))}
        categories={categories.map((c) => ({ name: c.name }))}
        users={users}
        defaults={{
          id: risk.id,
          version: risk.version,
          type: risk.type,
          category: risk.category,
          unitId: risk.unitId,
          goal: risk.goal,
          identifiedAt: risk.identifiedAt.toISOString().slice(0, 10),
          description: risk.description,
          rootCause: risk.rootCause,
          indicator: risk.indicator,
          existingControl: risk.existingControl,
          qualitativeImpact: risk.qualitativeImpact,
          p: risk.p,
          i: risk.i,
          ownerId: risk.ownerId,
          ownerTitle: risk.ownerTitle,
          strategy: risk.strategy,
          treatment: risk.treatment,
          treatmentCost: risk.treatmentCost,
          actionsDone: risk.actionsDone ?? '',
          rp: risk.rp,
          ri: risk.ri,
          nextReviewAt: risk.nextReviewAt ? risk.nextReviewAt.toISOString().slice(0, 10) : '',
        }}
      />
    </>
  );
}
