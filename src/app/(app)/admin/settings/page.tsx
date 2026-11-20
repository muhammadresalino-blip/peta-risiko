import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/session';
import { can } from '@/lib/rbac';
import { getSettings } from '@/lib/settings';
import { PageHeader } from '@/components/ui';
import { SettingsForm } from '@/components/settings-form';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const user = await requireUser();
  if (!can(user, 'settings.manage')) redirect('/dashboard');
  const settings = await getSettings(user.orgId ?? '');

  return (
    <>
      <PageHeader
        eyebrow="Konfigurasi organisasi"
        title="Kriteria risiko & BTR"
        description="Pengaturan ini dipakai server untuk menghitung skor, tingkat, dampak finansial, dan nilai bersih."
      />
      <SettingsForm
        initial={{
          btr: settings.btr,
          totalRevenue: settings.totalRevenue,
          probPct: settings.probPct,
          levels: settings.levels,
        }}
      />
    </>
  );
}
