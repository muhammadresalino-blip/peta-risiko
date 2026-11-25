'use client';

import { usePathname } from 'next/navigation';
import { CalendarDays, ChevronRight } from 'lucide-react';
import type { NavItem } from '@/components/sidebar';

export function Topbar({
  items,
  dateLabel,
  homeHref = '/dashboard',
}: {
  items: NavItem[];
  dateLabel: string;
  homeHref?: string;
}) {
  const pathname = usePathname();

  // Cocokkan rute terpanjang lebih dulu agar /risks/new tidak dianggap /risks.
  const current = [...items]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));

  const title =
    current?.label ??
    (pathname.startsWith('/risks/') ? 'Detail risiko' : undefined) ??
    (pathname === homeHref ? items[0]?.label : undefined) ??
    'PetaRisiko';

  return (
    <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between gap-4 border-b border-line bg-white/95 px-4 backdrop-blur print:hidden sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted">
        <span className="hidden sm:inline">PetaRisiko</span>
        <ChevronRight size={12} className="hidden shrink-0 sm:block" />
        <strong className="truncate font-semibold text-ink">{title}</strong>
      </div>
      <div className="flex shrink-0 items-center gap-3 text-[11px] text-muted">
        <span className="hidden items-center gap-1.5 sm:flex">
          <CalendarDays size={13} />
          {dateLabel}
        </span>
      </div>
    </header>
  );
}
