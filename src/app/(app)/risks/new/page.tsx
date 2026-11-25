import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/session';
import { prisma } from '@/lib/db';
import { getSettings, toScoringConfig } from '@/lib/settings';
import { can } from '@/lib/rbac';
import { PageHeader } from '@/components/ui';
import { RiskForm } from '@/components/risk-form';

export const dynamic = 'force-dynamic';

export default async function NewRiskPage() {
  const user = await requireUser();
  if (!can(user, 'risk.create')) redirect('/risks');

  const [units, categories, users, settings] = await Promise.all([
    prisma.unit.findMany({ where: { orgId: user.orgId ?? '__none__' }, orderBy: { name: 'asc' } }),
    prisma.riskCategory.findMany({ where: { orgId: user.orgId ?? '__none__' }, orderBy: { name: 'asc' } }),
    prisma.user.findMany({
      where: { orgId: user.orgId ?? '__none__', isActive: true },
      select: { id: true, name: true, role: true },
      orderBy: { name: 'asc' },
    }),
    getSettings(user.orgId ?? ''),
  ]);

  if (!units.length || !categories.length) {
    return (
      <>
        <PageHeader title="Catat risiko" />
        <div className="card-pad">
          <p className="text-sm text-muted">
            Unit kerja dan kategori risiko belum diatur. Hubungi Admin organisasi untuk melengkapinya di
            halaman Pengaturan.
          </p>
        </div>
      </>
    );
  }

  const preferredUnit = user.unitId && units.some((u) => u.id === user.unitId) ? user.unitId : units[0].id;

  return (
    <>
      <PageHeader
        eyebrow="Dokumentasi risiko"
        title="Catat risiko baru"
        description="Isi identifikasi, analisis inherent dan residual. Skor dihitung server saat disimpan."
        breadcrumb={[{ href: '/risks', label: 'Register Risiko' }, { label: 'Risiko baru' }]}
      />
      <RiskForm
        mode="create"
        config={toScoringConfig(settings)}
        units={units.map((u) => ({ id: u.id, name: u.name }))}
        categories={categories.map((c) => ({ name: c.name }))}
        users={users}
        defaults={{
          type: 'THREAT',
          category: categories[0].name,
          unitId: preferredUnit,
          goal: '',
          identifiedAt: new Date().toISOString().slice(0, 10),
          description: '',
          rootCause: '',
          indicator: '',
          existingControl: '',
          qualitativeImpact: '',
          p: 3,
          i: 3,
          ownerId: user.id,
          ownerTitle: '',
          strategy: 'MITIGATE',
          treatment: '',
          treatmentCost: 0,
          actionsDone: '',
          rp: 3,
          ri: 3,
          nextReviewAt: '',
        }}
      />
    </>
  );
}
