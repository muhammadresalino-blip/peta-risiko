import { prisma } from '@/lib/db';
import { requireOrgUser } from '@/lib/session';
import { can, seesAllUnits } from '@/lib/rbac';
import { fail, handle, ok, paging } from '@/lib/api';

export async function GET(req: Request) {
  return handle(async () => {
    const user = await requireOrgUser();
    if (!can(user, 'audit.view')) return fail(403, 'FORBIDDEN', 'Peran Anda tidak berhak melihat audit log.');

    const url = new URL(req.url);
    const { page, limit, skip } = paging(url.searchParams);
    const entity = url.searchParams.get('entity') ?? undefined;
    const actor = url.searchParams.get('actor') ?? undefined;
    const from = url.searchParams.get('from') ?? undefined;
    const to = url.searchParams.get('to') ?? undefined;

    const where: Record<string, unknown> = { orgId: user.orgId };
    if (entity) where.entity = entity;
    if (actor) where.actorId = actor;
    if (from || to) {
      where.at = {
        ...(from ? { gte: new Date(`${from}T00:00:00`) } : {}),
        ...(to ? { lte: new Date(`${to}T23:59:59`) } : {}),
      };
    }

    if (!seesAllUnits(user)) {
      const own = await prisma.risk.findMany({
        where: { orgId: user.orgId, unitId: user.unitId ?? '__none__' },
        select: { id: true },
      });
      where.entityId = { in: own.map((r) => r.id) };
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({ where, orderBy: { at: 'desc' }, skip, take: limit }),
    ]);

    const actorIds = Array.from(new Set(logs.map((l) => l.actorId)));
    const actors = await prisma.user.findMany({
      where: { id: { in: actorIds } },
      select: { id: true, name: true },
    });
    const nameById = new Map(actors.map((a) => [a.id, a.name]));

    return ok(
      logs.map((l) => ({ ...l, actorName: nameById.get(l.actorId) ?? l.actorId })),
      { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    );
  });
}
