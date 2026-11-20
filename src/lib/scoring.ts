// Logika skor risiko — satu sumber kebenaran untuk server dan pratinjau klien.
// Rumus mengikuti dokumen: skor = P x I; dampak finansial = (I / 5) x BTR;
// nilai bersih = probabilitas(%) x dampak finansial.

export type Level = 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';

export const LEVEL_LABEL: Record<Level, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  EXTREME: 'Extreme High',
};

export interface ScoringConfig {
  btr: number; // Rp
  probPct: Record<1 | 2 | 3 | 4 | 5, number>; // 0..1
  levels: { low: number; medium: number; high: number }; // batas atas skor
}

export const DEFAULT_CONFIG: ScoringConfig = {
  btr: 545_834_931_553,
  probPct: { 1: 0.1, 2: 0.25, 3: 0.5, 4: 0.7, 5: 0.9 },
  levels: { low: 3, medium: 6, high: 12 },
};

export const score = (p: number, i: number): number => p * i;

export function level(s: number, c: ScoringConfig = DEFAULT_CONFIG): Level {
  if (s <= c.levels.low) return 'LOW';
  if (s <= c.levels.medium) return 'MEDIUM';
  if (s <= c.levels.high) return 'HIGH';
  return 'EXTREME';
}

export const financialImpact = (i: number, c: ScoringConfig = DEFAULT_CONFIG): number =>
  (i / 5) * c.btr;

export const netValue = (p: number, i: number, c: ScoringConfig = DEFAULT_CONFIG): number =>
  c.probPct[p as 1 | 2 | 3 | 4 | 5] * financialImpact(i, c);

export interface ScoredRisk {
  score: number;
  level: Level;
  probPct: number;
  financialImpact: number;
  netValue: number;
}

/** Hitung seluruh nilai turunan untuk satu pasangan P dan I. */
export function evaluate(p: number, i: number, c: ScoringConfig = DEFAULT_CONFIG): ScoredRisk {
  const s = score(p, i);
  const fi = financialImpact(i, c);
  return {
    score: s,
    level: level(s, c),
    probPct: c.probPct[p as 1 | 2 | 3 | 4 | 5] ?? 0,
    financialImpact: Math.round(fi),
    netValue: Math.round((c.probPct[p as 1 | 2 | 3 | 4 | 5] ?? 0) * fi),
  };
}

/** Batas bawah/atas tiap tingkat, dipakai untuk legenda heat map. */
export function levelRanges(c: ScoringConfig = DEFAULT_CONFIG): { level: Level; from: number; to: number }[] {
  return [
    { level: 'LOW', from: 1, to: c.levels.low },
    { level: 'MEDIUM', from: c.levels.low + 1, to: c.levels.medium },
    { level: 'HIGH', from: c.levels.medium + 1, to: c.levels.high },
    { level: 'EXTREME', from: c.levels.high + 1, to: 25 },
  ];
}

export function isAboveAppetite(scoreResidual: number, maxScore: number): boolean {
  return scoreResidual > maxScore;
}
