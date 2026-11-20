import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/session';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/ui';
import { OrgManager } from './org-manager';

export const dynamic = 'force-dynamic';

export default async function OrganizationsPage() {
  const user = await requireUser();
  if (user.role !== 'PLATFORM_ADMIN') redirect('/dashboard');

  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { users: true, units: true, risks: true } } },
  });

  return (
    <>
      <PageHeader
        eyebrow="Platform"
        title="Organisasi"
        description="Kelola tenant organisasi pada platform. Setiap organisasi memiliki data, BTR, pengguna, dan appetite yang terpisah."
      />
      <OrgManager
        orgs={orgs.map((o) => ({
          id: o.id,
          name: o.name,
          slug: o.slug,
          currency: o.currency,
          isActive: o.isActive,
          createdAt: o.createdAt,
          counts: o._count,
        }))}
      />
    </>
  );
}
