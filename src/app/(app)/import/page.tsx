import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/session';
import { can } from '@/lib/rbac';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/ui';
import { ImportWizard } from '@/components/import-wizard';

export const dynamic = 'force-dynamic';

export default async function ImportPage() {
  const user = await requireUser();
  if (!can(user, 'import.run')) redirect('/dashboard');

  const [categories, mappings] = await Promise.all([
    prisma.riskCategory.findMany({
      where: { orgId: user.orgId ?? '__none__' },
      orderBy: { name: 'asc' },
    }),
    prisma.importMapping.findMany({
      where: { orgId: user.orgId ?? '__none__' },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Migrasi data"
        title="Impor risk register dari Excel"
        description="Unggah file, petakan kolom, jalankan dry run, lalu simpan baris valid sebagai Draft dalam satu transaksi."
      />
      <ImportWizard
        categories={categories.map((c) => ({ name: c.name }))}
        templates={mappings.map((m) => ({
          id: m.id,
          name: m.name,
          columns: JSON.parse(m.columns) as Record<string, string>,
        }))}
      />
    </>
  );
}
