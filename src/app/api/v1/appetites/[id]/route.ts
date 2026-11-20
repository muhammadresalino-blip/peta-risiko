import { requireOrgUser } from '@/lib/session';
import { deleteAppetite, upsertAppetite } from '@/server/services/appetite.service';
import { appetiteSchema } from '@/validators/risk';
import { clientIp, handle, ok } from '@/lib/api';

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Ctx) {
  return handle(async () => {
    const user = await requireOrgUser();
    const { id } = await params;
    const input = appetiteSchema.parse(await req.json());
    return ok(await upsertAppetite(user, { ...input, id }, clientIp(req)));
  });
}

export async function DELETE(req: Request, { params }: Ctx) {
  return handle(async () => {
    const user = await requireOrgUser();
    const { id } = await params;
    return ok(await deleteAppetite(user, id, clientIp(req)));
  });
}
