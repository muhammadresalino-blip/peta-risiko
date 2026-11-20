'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  BarChart3,
  Building2,
  Circle,
  ClipboardList,
  Download,
  Gauge,
  Grid2X2,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Upload,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  /** Kunci ikon Lucide; lihat ICONS di bawah. */
  icon: string;
  section: string;
}

const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  register: ClipboardList,
  heatmap: Grid2X2,
  appetite: Gauge,
  import: Upload,
  export: Download,
  settings: Settings,
  users: Users,
  units: Building2,
  audit: History,
  organizations: Building2,
  compare: BarChart3,
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'PR';

export function Sidebar({
  items,
  user,
  homeHref = '/dashboard',
}: {
  items: NavItem[];
  user: { name: string; email: string; roleLabel: string; orgName: string | null };
  homeHref?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const sections = Array.from(new Set(items.map((i) => i.section)));

  async function logout() {
    setLoggingOut(true);
    await fetch('/api/v1/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  const nav = (
    <nav className="space-y-6">
      {sections.map((section) => (
        <div key={section}>
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[1.4px] text-[#98a2b3]">{section}</p>
          <ul className="grid gap-1">
            {items
              .filter((i) => i.section === section)
              .map((item) => {
                const active =
                  item.href === homeHref
                    ? pathname === item.href
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = ICONS[item.icon] ?? Circle;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? 'page' : undefined}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-semibold transition ${
                        active ? 'bg-[#eaf1f6] text-navy' : 'text-[#536174] hover:bg-[#f3f6f9] hover:text-navy'
                      }`}
                    >
                      <Icon size={16} className={active ? 'text-teal' : 'text-[#8290a3]'} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      <div className="flex items-center justify-between border-b border-line bg-white px-4 py-3 print:hidden lg:hidden">
        <Link href={homeHref} className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-navy text-[13px] font-extrabold tracking-tight text-white">
            PR
          </span>
          <span className="font-display text-[15px] font-extrabold tracking-tight text-navy">PetaRisiko</span>
        </Link>
        <button
          className="icon-btn"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Tutup menu' : 'Buka menu'}
          aria-expanded={open}
        >
          {open ? <X size={17} /> : <Menu size={17} />}
        </button>
      </div>

      {open && (
        <div className="border-b border-line bg-white p-4 print:hidden lg:hidden">
          {nav}
          <button className="btn-secondary mt-6 w-full" onClick={logout} disabled={loggingOut}>
            <LogOut size={14} /> {loggingOut ? 'Keluar…' : 'Keluar'}
          </button>
        </div>
      )}

      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col gap-7 border-r border-line bg-white px-4 py-6 print:hidden lg:flex">
        <Link href={homeHref} className="flex items-center gap-3 px-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-navy text-[15px] font-extrabold tracking-tight text-white">
            PR
          </span>
          <span>
            <span className="block font-display text-[16px] font-extrabold leading-tight tracking-[-0.5px] text-navy">
              PetaRisiko
            </span>
            <span className="mt-0.5 block text-[10px] uppercase leading-tight tracking-[1.4px] text-[#8290a3]">
              Risk intelligence
            </span>
          </span>
        </Link>

        {user.orgName && (
          <div className="mx-1 rounded-[10px] border border-line px-3 py-2.5">
            <p className="truncate text-xs font-bold text-ink">{user.orgName}</p>
            <p className="mt-0.5 text-[11px] text-muted">Ruang kerja organisasi</p>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto">{nav}</div>

        <div>
          <div className="mb-4 rounded-[9px] bg-mist p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-bold text-blue">
              <ShieldCheck size={14} /> Ruang kerja aman
            </p>
            <p className="mt-1.5 text-[10px] leading-relaxed text-[#7b8794]">
              Akses data mengikuti peran dan unit organisasi.
            </p>
          </div>

          <div className="flex items-center gap-2.5 border-t border-line pt-4">
            <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-[#dce9e8] text-xs font-bold text-[#176d68]">
              {initials(user.name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-ink">{user.name}</p>
              <p className="mt-0.5 truncate text-[11px] text-muted">{user.roleLabel}</p>
            </div>
            <button
              onClick={logout}
              disabled={loggingOut}
              className="grid h-8 w-8 place-items-center rounded-lg text-[#98a2b3] transition hover:bg-mist hover:text-navy disabled:opacity-50"
              aria-label="Keluar"
              title="Keluar"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
