import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireOrgUser, HttpError } from '@/lib/session';
import { can } from '@/lib/rbac';
import { handle, ok } from '@/lib/api';

const schema = z.object({
  name: z.string().min(1, 'Nama templat wajib diisi'),
  columns: z.record(z.string(), z.string()),
});

export async function GET() {
  return handle(async () => {
    const user = await requireOrgUser();
    if (!can(user, 'import.run')) throw new HttpError(403, 'FORBIDDEN', 'Peran Anda tidak boleh mengimpor.');

    const rows = await prisma.importMapping.findMany({
      where: { orgId: user.orgId },
      orderBy: { name: 'asc' },
    });
    return ok(
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        columns: JSON.parse(r.columns) as Record<string, string>,
      })),
    );
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireOrgUser();
    if (!can(user, 'import.run')) throw new HttpError(403, 'FORBIDDEN', 'Peran Anda tidak boleh mengimpor.');

    const input = schema.parse(await req.json());
    const record = await prisma.importMapping.upsert({
      where: { orgId_name: { orgId: user.orgId, name: input.name } },
      create: { orgId: user.orgId, name: input.name, columns: JSON.stringify(input.columns) },
      update: { columns: JSON.stringify(input.columns) },
    });
    return ok({ id: record.id, name: record.name, columns: input.columns });
  });
}
