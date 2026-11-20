import type { Actor } from '@/lib/rbac';
import { seesAllUnits } from '@/lib/rbac';

/**
 * Filter Prisma untuk membatasi data ke organisasi sesi (dan unit untuk Risk Owner).
 * orgId selalu berasal dari sesi, tidak pernah dari input klien.
 */
export function riskScope(actor: Actor): { orgId: string; unitId?: string } {
  const scope: { orgId: string; unitId?: string } = { orgId: actor.orgId ?? '__none__' };
  if (!seesAllUnits(actor) && actor.unitId) scope.unitId = actor.unitId;
  return scope;
}

export function orgScope(actor: Actor): { orgId: string } {
  return { orgId: actor.orgId ?? '__none__' };
}
