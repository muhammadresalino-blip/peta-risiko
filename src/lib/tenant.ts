import type { Actor } from '@/lib/rbac';
import { seesAllUnits } from '@/lib/rbac';

/** Sentinel agar peran tanpa unit tidak otomatis melihat seluruh organisasi. */
export const NO_UNIT = '__none__';

/**
 * Filter Prisma untuk membatasi data ke organisasi sesi (dan unit untuk Risk Owner).
 * orgId selalu berasal dari sesi, tidak pernah dari input klien.
 */
export function riskScope(actor: Actor): { orgId: string; unitId?: string } {
  const scope: { orgId: string; unitId?: string } = { orgId: actor.orgId ?? NO_UNIT };
  if (!seesAllUnits(actor)) scope.unitId = actor.unitId ?? NO_UNIT;
  return scope;
}

export function orgScope(actor: Actor): { orgId: string } {
  return { orgId: actor.orgId ?? NO_UNIT };
}

/**
 * Unit efektif untuk filter/ekspor. Pengguna yang hanya melihat unitnya sendiri
 * tidak boleh menggeser filter lewat query string ke unit lain.
 */
export function unitFilter(actor: Actor, requested?: string | null): string | undefined {
  if (seesAllUnits(actor)) return requested || undefined;
  return actor.unitId ?? NO_UNIT;
}
