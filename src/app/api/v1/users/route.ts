import { prisma } from '@/lib/db';
import { requireOrgUser } from '@/lib/session';
import { can } from '@/lib/rbac';
import { hashPassword } from '@/lib/auth';
import { writeAudit } from '@/lib/audit';
import { userSchema } from '@/validators/risk';
import { clientIp, fail, handle, ok } from '@/lib/api';

export async function GET() {
  return handle(async () => {
    const user = await requireOrgUser();
    if (!can(user, 'user.manage')) return fail(403, 'FORBIDDEN', 'Hanya Admin yang boleh mengelola pengguna.');
    const users = await prisma.user.findMany({
      where: { orgId: user.orgId },
      select: { id: true, name: true, email: true, role: true, unitId: true, isActive: true, createdAt: true },
      orderBy: { name: 'asc' },
    });
    const units = await prisma.unit.findMany({ where: { orgId: user.orgId }, orderBy: { name: 'asc' } });
    return ok(users, { units });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireOrgUser();
    if (!can(user, 'user.manage')) return fail(403, 'FORBIDDEN', 'Hanya Admin yang boleh mengelola pengguna.');
    const input = userSchema.parse(await req.json());
    const created = await prisma.user.create({
      data: {
        orgId: user.orgId,
        name: input.name,
        email: input.email.toLowerCase(),
        passwordHash: hashPassword(input.password),
        role: input.role,
        unitId: input.unitId || null,
      },
      select: { id: true, name: true, email: true, role: true, unitId: true, isActive: true },
    });
    await writeAudit({
      orgId: user.orgId,
      actorId: user.id,
      entity: 'User',
      entityId: created.id,
      action: 'CREATE',
      after: created,
      ip: clientIp(req),
    });
    return ok(created);
  });
}
