import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { getCurrentUser } from '@/lib/session';
import { can } from '@/lib/rbac';
import { ROLE_LABEL } from '@/lib/format';
import { Sidebar, type NavItem } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  // Platform Admin tidak memiliki organisasi sehingga memakai ruang kerja platform.
  if (user.role === 'PLATFORM_ADMIN') redirect('/organizations');

  const items: NavItem[] = [
    { href: '/dashboard', label: 'Dashboard', icon: 'dashboard', section: 'Workspace' },
    { href: '/risks', label: 'Register Risiko', icon: 'register', section: 'Workspace' },
    { href: '/heatmap', label: 'Heat Map', icon: 'heatmap', section: 'Analisis' },
    { href: '/appetite', label: 'Risk Appetite', icon: 'appetite', section: 'Analisis' },
  ];

  if (can(user, 'import.run')) {
    items.push({ href: '/import', label: 'Impor Excel', icon: 'import', section: 'Data' });
  }
  items.push({ href: '/exports', label: 'Ekspor & Laporan', icon: 'export', section: 'Data' });

  if (can(user, 'settings.manage') || can(user, 'user.manage')) {
    items.push({ href: '/admin/settings', label: 'Kriteria & BTR', icon: 'settings', section: 'Administrasi' });
  }
  if (can(user, 'user.manage')) {
    items.push({ href: '/admin/users', label: 'Pengguna', icon: 'users', section: 'Administrasi' });
    items.push({ href: '/admin/units', label: 'Unit Kerja', icon: 'units', section: 'Administrasi' });
  }
  if (can(user, 'audit.view')) {
    items.push({ href: '/admin/audit-logs', label: 'Audit Log', icon: 'audit', section: 'Administrasi' });
  }

  const dateLabel = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Sidebar
        items={items}
        user={{
          name: user.name,
          email: user.email,
          roleLabel: ROLE_LABEL[user.role] ?? user.role,
          orgName: user.orgName,
        }}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar items={items} dateLabel={dateLabel} />
        <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-6 print:max-w-none print:p-0 sm:px-6 lg:px-8 lg:py-7">
          {children}
        </main>
      </div>
    </div>
  );
}
