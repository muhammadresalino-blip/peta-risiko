import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireOrgUser, HttpError } from '@/lib/session';
import { can } from '@/lib/rbac';
import { handle, ok } from '@/lib/api';

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  name: z.string().min(1).optional(),
  columns: z.record(z.string(), z.string()).optional(),
});

export async function PUT(req: Request, { params }: Ctx) {
  return handle(async () => {
    const user = await requireOrgUser();
    if (!can(user, 'import.run')) throw new HttpError(403, 'FORBIDDEN', 'Peran Anda tidak boleh mengimpor.');
    const { id } = await params;

    const existing = await prisma.importMapping.findFirst({ where: { id, orgId: user.orgId } });
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Templat pemetaan tidak ditemukan.');

    const input = schema.parse(await req.json());
    const updated = await prisma.importMapping.update({
      where: { id },
      data: {
        name: input.name ?? undefined,
        columns: input.columns ? JSON.stringify(input.columns) : undefined,
      },
    });
    return ok({ id: updated.id, name: updated.name, columns: JSON.parse(updated.columns) });
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const user = await requireOrgUser();
    if (!can(user, 'import.run')) throw new HttpError(403, 'FORBIDDEN', 'Peran Anda tidak boleh mengimpor.');
    const { id } = await params;

    const existing = await prisma.importMapping.findFirst({ where: { id, orgId: user.orgId } });
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Templat pemetaan tidak ditemukan.');

    await prisma.importMapping.delete({ where: { id } });
    return ok({ deleted: true });
  });
}
