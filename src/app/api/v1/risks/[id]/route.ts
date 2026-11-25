import { requireOrgUser } from '@/lib/session';
import { deleteRisk, getRisk, updateRisk } from '@/server/services/risk.service';
import { riskUpdateSchema } from '@/validators/risk';
import { clientIp, handle, ok } from '@/lib/api';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const user = await requireOrgUser();
    const { id } = await params;
    return ok(await getRisk(user, id));
  });
}

export async function PATCH(req: Request, { params }: Ctx) {
  return handle(async () => {
    const user = await requireOrgUser();
    const { id } = await params;
    const patch = riskUpdateSchema.parse(await req.json());
    const risk = await updateRisk(user, id, patch, clientIp(req));
    return ok({
      ...risk,
      warning: risk.scoreRes > risk.score ? 'Skor residual lebih tinggi dari inherent.' : null,
    });
  });
}

export async function DELETE(req: Request, { params }: Ctx) {
  return handle(async () => {
    const user = await requireOrgUser();
    const { id } = await params;
    return ok(await deleteRisk(user, id, clientIp(req)));
  });
}
