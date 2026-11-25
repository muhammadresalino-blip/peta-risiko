import type { Level } from '@/lib/scoring';

export function formatRupiah(value: number, opts: { compact?: boolean } = {}): string {
  if (!Number.isFinite(value)) return 'Rp 0';
  if (opts.compact) {
    const abs = Math.abs(value);
    if (abs >= 1e12) return `Rp ${(value / 1e12).toLocaleString('id-ID', { maximumFractionDigits: 2 })} T`;
    if (abs >= 1e9) return `Rp ${(value / 1e9).toLocaleString('id-ID', { maximumFractionDigits: 1 })} M`;
    if (abs >= 1e6) return `Rp ${(value / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`;
    if (abs >= 1e3) return `Rp ${(value / 1e3).toLocaleString('id-ID', { maximumFractionDigits: 0 })} rb`;
  }
  return `Rp ${Math.round(value).toLocaleString('id-ID')}`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString('id-ID');
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

export const LEVEL_STYLES: Record<Level, { badge: string; cell: string; dot: string }> = {
  LOW: {
    badge: 'bg-risk-low/10 text-risk-low',
    cell: 'bg-risk-low/15 border-risk-low/25 text-ink',
    dot: 'bg-risk-low',
  },
  MEDIUM: {
    badge: 'bg-risk-medium/10 text-risk-medium',
    cell: 'bg-risk-medium/15 border-risk-medium/25 text-ink',
    dot: 'bg-risk-medium',
  },
  HIGH: {
    badge: 'bg-risk-high/10 text-risk-high',
    cell: 'bg-risk-high/15 border-risk-high/25 text-ink',
    dot: 'bg-risk-high',
  },
  EXTREME: {
    badge: 'bg-risk-extreme/10 text-risk-extreme',
    cell: 'bg-risk-extreme/15 border-risk-extreme/25 text-ink',
    dot: 'bg-risk-extreme',
  },
};

export const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-mist text-muted',
  SUBMITTED: 'bg-blue/10 text-blue',
  ACTIVE: 'bg-teal-soft text-teal',
  RETIRED: 'bg-mist text-muted',
};

export const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Diajukan',
  ACTIVE: 'Aktif',
  RETIRED: 'Retired',
};

export const STRATEGY_LABEL: Record<string, string> = {
  AVOID: 'Avoid',
  TRANSFER: 'Transfer',
  MITIGATE: 'Mitigate',
  ACCEPT: 'Accept',
  EXPLOIT: 'Exploit',
  SHARE: 'Share',
  ENHANCE: 'Enhance',
};

export const ROLE_LABEL: Record<string, string> = {
  PLATFORM_ADMIN: 'Platform Admin',
  ADMIN: 'Admin',
  RISK_OWNER: 'Risk Owner',
  REVIEWER: 'Reviewer',
  VIEWER: 'Viewer',
};
