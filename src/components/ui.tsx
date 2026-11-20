import Link from 'next/link';
import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import { LEVEL_LABEL, type Level } from '@/lib/scoring';
import { LEVEL_STYLES, STATUS_LABEL, STATUS_STYLES } from '@/lib/format';

export function LevelBadge({ level, score }: { level: string; score?: number }) {
  const lv = (['LOW', 'MEDIUM', 'HIGH', 'EXTREME'].includes(level) ? level : 'LOW') as Level;
  return (
    <span className={`badge ${LEVEL_STYLES[lv].badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${LEVEL_STYLES[lv].dot}`} />
      {LEVEL_LABEL[lv]}
      {score !== undefined && <span className="opacity-70">· {score}</span>}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${STATUS_STYLES[status] ?? 'bg-[#F0F2F5] text-[#667085]'}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
  eyebrow,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumb?: { href?: string; label: string }[];
  eyebrow?: string;
}) {
  return (
    <header className="mb-6">
      {breadcrumb && (
        <nav className="mb-2 flex items-center gap-1.5 text-xs text-[#8a96a6]">
          {breadcrumb.map((b, idx) => (
            <span key={`${b.label}-${idx}`} className="flex items-center gap-1.5">
              {idx > 0 && <span className="text-[#c8d3dd]">/</span>}
              {b.href ? (
                <Link href={b.href} className="hover:text-navy">
                  {b.label}
                </Link>
              ) : (
                <span>{b.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1 className="font-display text-[23px] font-extrabold leading-tight tracking-[-0.9px] text-navy sm:text-[27px]">
            {title}
          </h1>
          {description && <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function StatCard({
  label,
  value,
  hint,
  accent = 'slate',
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: 'slate' | 'indigo' | 'emerald' | 'amber' | 'rose';
  icon?: ReactNode;
}) {
  const accents: Record<string, string> = {
    slate: 'bg-mist text-blue',
    indigo: 'bg-teal-soft text-teal',
    emerald: 'bg-[#E7F3ED] text-[#26734D]',
    amber: 'bg-[#F8F1D9] text-[#8A6B16]',
    rose: 'bg-[#F8E1E0] text-[#A33E3A]',
  };
  return (
    <div className="rounded-xl border border-line bg-white px-[18px] py-[17px]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold text-muted">{label}</p>
        {icon && (
          <span className={`grid h-[30px] w-[30px] shrink-0 place-items-center rounded-lg ${accents[accent]}`}>
            {icon}
          </span>
        )}
      </div>
      <p className="data-value mt-3.5 text-[26px] font-extrabold leading-none text-navy">
        {value}
      </p>
      {hint && <p className="mt-1.5 text-[11px] text-[#8a96a6]">{hint}</p>}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mb-3 grid h-11 w-11 place-items-center rounded-full bg-mist text-[#98a2b3]">
        <Inbox size={20} />
      </div>
      <p className="text-[13px] font-bold text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-[#8a96a6]">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function SectionCard({
  title,
  description,
  action,
  children,
  className = '',
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-line bg-white px-[19px] py-[18px] ${className}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-sm font-bold text-navy">{title}</h2>
          {description && <p className="mt-1 text-[11px] leading-relaxed text-[#8a96a6]">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
