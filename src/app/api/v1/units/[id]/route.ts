import { prisma } from '@/lib/db';
import { requireOrgUser, HttpError } from '@/lib/session';
import { can } from '@/lib/rbac';
import { writeAudit } from '@/lib/audit';
import { clientIp, fail, handle, ok } from '@/lib/api';

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(req: Request, { params }: Ctx) {
  return handle(async () => {
    const user = await requireOrgUser();
    if (!can(user, 'unit.manage')) return fail(403, 'FORBIDDEN', 'Hanya Admin yang boleh menghapus unit.');
    const { id } = await params;
    const unit = await prisma.unit.findFirst({
      where: { id, orgId: user.orgId },
      include: { _count: { select: { risks: true, users: true } } },
    });
    if (!unit) throw new HttpError(404, 'NOT_FOUND', 'Unit tidak ditemukan.');
    if (unit._count.risks > 0 || unit._count.users > 0) {
      throw new HttpError(409, 'CONFLICT', 'Unit masih dipakai pengguna atau risiko.');
    }
    await prisma.unit.delete({ where: { id } });
    await writeAudit({
      orgId: user.orgId,
      actorId: user.id,
      entity: 'Unit',
      entityId: id,
      action: 'DELETE',
      before: unit,
      ip: clientIp(req),
    });
    return ok({ deleted: true });
  });
}
