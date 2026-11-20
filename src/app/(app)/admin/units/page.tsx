import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/session';
import { can } from '@/lib/rbac';
import { prisma } from '@/lib/db';
import { PageHeader, SectionCard } from '@/components/ui';
import { UnitsManager } from '@/components/units-manager';

export const dynamic = 'force-dynamic';

export default async function UnitsPage() {
  const user = await requireUser();
  if (!can(user, 'unit.manage')) redirect('/dashboard');

  const units = await prisma.unit.findMany({
    where: { orgId: user.orgId ?? '__none__' },
    orderBy: { name: 'asc' },
    include: { _count: { select: { risks: true, users: true } } },
  });

  return (
    <>
      <PageHeader eyebrow="Administrasi" title="Unit kerja" description="Unit adalah pemilik risiko dan dasar pembatasan akses Risk Owner." />
      <SectionCard title="Daftar unit" description={`${units.length} unit terdaftar`}>
        <UnitsManager units={units} />
      </SectionCard>
    </>
  );
}
