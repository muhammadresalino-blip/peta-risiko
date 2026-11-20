import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { getCurrentUser } from '@/lib/session';
import { ROLE_LABEL } from '@/lib/format';
import { Sidebar, type NavItem } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';

export default async function PlatformLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'PLATFORM_ADMIN') redirect('/dashboard');

  const items: NavItem[] = [
    { href: '/organizations', label: 'Organisasi', icon: 'organizations', section: 'Platform' },
    { href: '/platform/compare', label: 'Perbandingan', icon: 'compare', section: 'Platform' },
  ];

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
        homeHref="/organizations"
        user={{
          name: user.name,
          email: user.email,
          roleLabel: ROLE_LABEL[user.role] ?? user.role,
          orgName: user.orgName,
        }}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar items={items} dateLabel={dateLabel} homeHref="/organizations" />
        <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-7">
          {children}
        </main>
      </div>
    </div>
  );
}
