import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/session';
import { can } from '@/lib/rbac';
import { prisma } from '@/lib/db';
import { PageHeader, SectionCard } from '@/components/ui';
import { UsersManager } from '@/components/users-manager';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const user = await requireUser();
  if (!can(user, 'user.manage')) redirect('/dashboard');

  const [users, units] = await Promise.all([
    prisma.user.findMany({
      where: { orgId: user.orgId ?? '__none__' },
      select: { id: true, name: true, email: true, role: true, unitId: true, isActive: true },
      orderBy: { name: 'asc' },
    }),
    prisma.unit.findMany({ where: { orgId: user.orgId ?? '__none__' }, orderBy: { name: 'asc' } }),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Administrasi"
        title="Pengguna & peran"
        description="Kelola anggota organisasi, peran akses, dan unit kerja."
      />
      <SectionCard title="Daftar pengguna" description={`${users.length} akun terdaftar`}>
        <UsersManager users={users} units={units.map((u) => ({ id: u.id, name: u.name }))} />
      </SectionCard>
    </>
  );
}
