import { prisma } from '@/lib/db';
import { DEFAULT_CONFIG, type ScoringConfig } from '@/lib/scoring';

export interface OrgSettings {
  btr: number;
  totalRevenue: number;
  probPct: ScoringConfig['probPct'];
  levels: ScoringConfig['levels'];
}

export const DEFAULT_SETTINGS: OrgSettings = {
  btr: DEFAULT_CONFIG.btr,
  totalRevenue: 0,
  probPct: { ...DEFAULT_CONFIG.probPct },
  levels: { ...DEFAULT_CONFIG.levels },
};

export const DEFAULT_PROB_PCT: ScoringConfig['probPct'] = {
  1: 0.1,
  2: 0.25,
  3: 0.5,
  4: 0.7,
  5: 0.9,
};

/** Baca pengaturan organisasi; nilai yang belum ada memakai bawaan. */
export async function getSettings(orgId: string): Promise<OrgSettings> {
  const rows = await prisma.setting.findMany({ where: { orgId } });
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const parse = <T>(key: string, fallback: T): T => {
    const raw = map.get(key);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  };
  return {
    btr: parse<number>('btr', DEFAULT_SETTINGS.btr),
    totalRevenue: parse<number>('totalRevenue', 0),
    probPct: parse<ScoringConfig['probPct']>('probPct', { ...DEFAULT_PROB_PCT }),
    levels: parse<ScoringConfig['levels']>('levelThresholds', { ...DEFAULT_SETTINGS.levels }),
  };
}

export function toScoringConfig(s: OrgSettings): ScoringConfig {
  return { btr: s.btr, probPct: s.probPct, levels: s.levels };
}

export async function saveSettings(orgId: string, patch: Partial<OrgSettings>): Promise<OrgSettings> {
  const entries: [string, unknown][] = [];
  if (patch.btr !== undefined) entries.push(['btr', patch.btr]);
  if (patch.totalRevenue !== undefined) entries.push(['totalRevenue', patch.totalRevenue]);
  if (patch.probPct !== undefined) entries.push(['probPct', patch.probPct]);
  if (patch.levels !== undefined) entries.push(['levelThresholds', patch.levels]);

  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.setting.upsert({
        where: { orgId_key: { orgId, key } },
        create: { orgId, key, value: JSON.stringify(value) },
        update: { value: JSON.stringify(value) },
      }),
    ),
  );
  return getSettings(orgId);
}
