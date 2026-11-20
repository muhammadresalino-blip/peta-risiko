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
    badge: 'bg-[#E7F3ED] text-[#23865A]',
    cell: 'bg-[#DCEFE7] border-[#CFE7DC] text-[#344054]',
    dot: 'bg-[#23865A]',
  },
  MEDIUM: {
    badge: 'bg-[#F8F1D9] text-[#B7791F]',
    cell: 'bg-[#F5EFCB] border-[#E9E0AE] text-[#344054]',
    dot: 'bg-[#B7791F]',
  },
  HIGH: {
    badge: 'bg-[#FBE8D4] text-[#D36B32]',
    cell: 'bg-[#F8DDBA] border-[#EFC99A] text-[#344054]',
    dot: 'bg-[#D36B32]',
  },
  EXTREME: {
    badge: 'bg-[#F8E1E0] text-[#C43D4D]',
    cell: 'bg-[#F2C9C7] border-[#E5A9A6] text-[#344054]',
    dot: 'bg-[#C43D4D]',
  },
};

export const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-[#F0F2F5] text-[#66758A]',
  SUBMITTED: 'bg-[#E8F0FA] text-[#315F91]',
  ACTIVE: 'bg-[#E6F3EF] text-[#27745F]',
  RETIRED: 'bg-[#F1EFF7] text-[#6D5A91]',
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
