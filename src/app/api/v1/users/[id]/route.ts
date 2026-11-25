import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireOrgUser, HttpError } from '@/lib/session';
import { can } from '@/lib/rbac';
import { hashPassword } from '@/lib/auth';
import { writeAudit } from '@/lib/audit';
import { clientIp, fail, handle, ok } from '@/lib/api';

type Ctx = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(['ADMIN', 'RISK_OWNER', 'REVIEWER', 'VIEWER']).optional(),
  unitId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(10).optional(),
});

export async function PATCH(req: Request, { params }: Ctx) {
  return handle(async () => {
    const user = await requireOrgUser();
    if (!can(user, 'user.manage')) return fail(403, 'FORBIDDEN', 'Hanya Admin yang boleh mengelola pengguna.');
    const { id } = await params;
    const target = await prisma.user.findFirst({ where: { id, orgId: user.orgId } });
    if (!target) throw new HttpError(404, 'NOT_FOUND', 'Pengguna tidak ditemukan.');

    const input = patchSchema.parse(await req.json());
    if (target.id === user.id && (input.isActive === false || (input.role !== undefined && input.role !== 'ADMIN'))) {
      throw new HttpError(409, 'CONFLICT', 'Anda tidak dapat menonaktifkan atau menurunkan peran akun sendiri.');
    }
    if (input.unitId) {
      const unit = await prisma.unit.findFirst({ where: { id: input.unitId, orgId: user.orgId }, select: { id: true } });
      if (!unit) throw new HttpError(422, 'VALIDATION_ERROR', 'Unit kerja tidak dikenal.');
    }
    const updated = await prisma.user.update({
      where: { id },
      data: {
        name: input.name,
        role: input.role,
        unitId: input.unitId === undefined ? undefined : input.unitId || null,
        isActive: input.isActive,
        passwordHash: input.password ? hashPassword(input.password) : undefined,
      },
      select: { id: true, name: true, email: true, role: true, unitId: true, isActive: true },
    });
    await writeAudit({
      orgId: user.orgId,
      actorId: user.id,
      entity: 'User',
      entityId: id,
      action: 'UPDATE',
      before: { role: target.role, unitId: target.unitId, isActive: target.isActive },
      after: updated,
      ip: clientIp(req),
    });
    return ok(updated);
  });
}
