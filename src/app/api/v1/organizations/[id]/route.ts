import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireUser, HttpError } from '@/lib/session';
import { handle, ok } from '@/lib/api';

type Ctx = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  currency: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: Ctx) {
  return handle(async () => {
    const user = await requireUser();
    if (user.role !== 'PLATFORM_ADMIN') {
      throw new HttpError(403, 'FORBIDDEN', 'Hanya Platform Admin yang boleh mengubah organisasi.');
    }
    const { id } = await params;
    const before = await prisma.organization.findUnique({ where: { id } });
    if (!before) throw new HttpError(404, 'NOT_FOUND', 'Organisasi tidak ditemukan.');

    const input = patchSchema.parse(await req.json());
    const after = await prisma.organization.update({ where: { id }, data: input });

    await prisma.auditLog.create({
      data: {
        orgId: id,
        actorId: user.id,
        entity: 'Organization',
        entityId: id,
        action: 'UPDATE',
        before: JSON.stringify({ name: before.name, currency: before.currency, isActive: before.isActive }),
        after: JSON.stringify({ name: after.name, currency: after.currency, isActive: after.isActive }),
      },
    });

    return ok(after);
  });
}
