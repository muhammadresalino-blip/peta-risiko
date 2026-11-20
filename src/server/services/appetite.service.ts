import { prisma } from '@/lib/db';
import { HttpError } from '@/lib/session';
import { can, type Actor } from '@/lib/rbac';
import { writeAudit } from '@/lib/audit';
import { refreshAppetiteFlags } from '@/server/services/risk.service';
import { riskScope } from '@/lib/tenant';

export async function listAppetites(actor: Actor) {
  const appetites = await prisma.riskAppetite.findMany({
    where: { orgId: actor.orgId ?? '__none__' },
    orderBy: [{ category: 'asc' }, { unitId: 'asc' }],
  });
  const units = await prisma.unit.findMany({
    where: { orgId: actor.orgId ?? '__none__' },
    orderBy: { name: 'asc' },
  });
  return { appetites, units };
}

export async function gapRisks(actor: Actor) {
  return prisma.risk.findMany({
    where: { ...riskScope(actor), aboveAppetite: true, status: 'ACTIVE' },
    include: { unit: { select: { name: true } } },
    orderBy: { scoreRes: 'desc' },
  });
}

export async function upsertAppetite(
  actor: Actor,
  input: { id?: string; category: string; unitId?: string | null; maxScore: number; note?: string | null },
  ip?: string | null,
) {
  if (!can(actor, 'appetite.manage') || !actor.orgId) {
    throw new HttpError(403, 'FORBIDDEN', 'Hanya Admin yang boleh mengatur Risk Appetite.');
  }
  const orgId = actor.orgId;
  const unitId = input.unitId || null;

  if (unitId) {
    const unit = await prisma.unit.findFirst({ where: { id: unitId, orgId } });
    if (!unit) throw new HttpError(422, 'VALIDATION_ERROR', 'Unit tidak dikenal.');
  }

  const existing = input.id
    ? await prisma.riskAppetite.findFirst({ where: { id: input.id, orgId } })
    : await prisma.riskAppetite.findFirst({ where: { orgId, category: input.category, unitId } });

  const record = existing
    ? await prisma.riskAppetite.update({
        where: { id: existing.id },
        data: { maxScore: input.maxScore, note: input.note ?? null },
      })
    : await prisma.riskAppetite.create({
        data: { orgId, category: input.category, unitId, maxScore: input.maxScore, note: input.note ?? null },
      });

  await writeAudit({
    orgId,
    actorId: actor.id,
    entity: 'RiskAppetite',
    entityId: record.id,
    action: existing ? 'UPDATE' : 'CREATE',
    before: existing ?? undefined,
    after: record,
    ip,
  });

  await refreshAppetiteFlags(orgId);
  return record;
}

export async function deleteAppetite(actor: Actor, id: string, ip?: string | null) {
  if (!can(actor, 'appetite.manage') || !actor.orgId) {
    throw new HttpError(403, 'FORBIDDEN', 'Hanya Admin yang boleh mengubah Risk Appetite.');
  }
  const record = await prisma.riskAppetite.findFirst({ where: { id, orgId: actor.orgId } });
  if (!record) throw new HttpError(404, 'NOT_FOUND', 'Risk Appetite tidak ditemukan.');

  await prisma.riskAppetite.delete({ where: { id } });
  await writeAudit({
    orgId: actor.orgId,
    actorId: actor.id,
    entity: 'RiskAppetite',
    entityId: id,
    action: 'DELETE',
    before: record,
    ip,
  });
  await refreshAppetiteFlags(actor.orgId);
  return { deleted: true };
}
