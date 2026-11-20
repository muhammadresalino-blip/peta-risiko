import { prisma } from '@/lib/db';
import { requireOrgUser } from '@/lib/session';
import { can } from '@/lib/rbac';
import { writeAudit } from '@/lib/audit';
import { unitSchema } from '@/validators/risk';
import { clientIp, fail, handle, ok } from '@/lib/api';

export async function GET() {
  return handle(async () => {
    const user = await requireOrgUser();
    const units = await prisma.unit.findMany({
      where: { orgId: user.orgId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { risks: true, users: true } } },
    });
    return ok(units);
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireOrgUser();
    if (!can(user, 'unit.manage')) return fail(403, 'FORBIDDEN', 'Hanya Admin yang boleh mengelola unit.');
    const input = unitSchema.parse(await req.json());
    const unit = await prisma.unit.create({ data: { orgId: user.orgId, ...input } });
    await writeAudit({
      orgId: user.orgId,
      actorId: user.id,
      entity: 'Unit',
      entityId: unit.id,
      action: 'CREATE',
      after: unit,
      ip: clientIp(req),
    });
    return ok(unit);
  });
}
