import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CONFIG,
  evaluate,
  financialImpact,
  isAboveAppetite,
  level,
  netValue,
  residualExceedsInherent,
  score,
} from '../src/lib/scoring';

describe('scoring', () => {
  it('menghitung skor P × I', () => {
    expect(score(4, 4)).toBe(16);
    expect(score(1, 5)).toBe(5);
  });

  it('memetakan tingkat sesuai batas default 3/6/12', () => {
    expect(level(1)).toBe('LOW');
    expect(level(3)).toBe('LOW');
    expect(level(4)).toBe('MEDIUM');
    expect(level(6)).toBe('MEDIUM');
    expect(level(8)).toBe('HIGH');
    expect(level(12)).toBe('HIGH');
    expect(level(15)).toBe('EXTREME');
    expect(level(25)).toBe('EXTREME');
  });

  it('menghitung dampak finansial dari BTR', () => {
    expect(financialImpact(5)).toBeCloseTo(545_834_931_553, 0);
    expect(financialImpact(1)).toBeCloseTo(109_166_986_310.6, 0);
    expect(financialImpact(4)).toBeCloseTo(436_667_945_242.4, 0);
  });

  it('menghitung nilai bersih = probabilitas × dampak finansial', () => {
    // indeks 4 = 70%, indeks 2 = 25%
    expect(netValue(4, 2)).toBeCloseTo(0.7 * 218_333_972_621.2, 0);
    expect(netValue(5, 5)).toBeCloseTo(0.9 * 545_834_931_553, 0);
  });

  it('evaluate mengembalikan seluruh nilai turunan', () => {
    const r = evaluate(4, 4);
    expect(r).toMatchObject({ score: 16, level: 'EXTREME', probPct: 0.7 });
    expect(r.financialImpact).toBe(Math.round((4 / 5) * DEFAULT_CONFIG.btr));
    expect(r.netValue).toBe(Math.round(0.7 * (4 / 5) * DEFAULT_CONFIG.btr));
  });

  it('menerapkan batas tingkat yang dapat diubah', () => {
    const custom = { ...DEFAULT_CONFIG, levels: { low: 2, medium: 8, high: 15 } };
    expect(level(3, custom)).toBe('MEDIUM');
    expect(level(10, custom)).toBe('HIGH');
    expect(level(16, custom)).toBe('EXTREME');
  });

  it('menandai risiko di atas appetite bila skor residual > batas', () => {
    expect(isAboveAppetite(8, 6)).toBe(true);
    expect(isAboveAppetite(6, 6)).toBe(false);
    expect(isAboveAppetite(4, 6)).toBe(false);
  });

  it('menandai residual yang melebihi inherent', () => {
    expect(residualExceedsInherent(16, 12)).toBe(true);
    expect(residualExceedsInherent(12, 12)).toBe(false);
    expect(residualExceedsInherent(6, 12)).toBe(false);
  });
});
