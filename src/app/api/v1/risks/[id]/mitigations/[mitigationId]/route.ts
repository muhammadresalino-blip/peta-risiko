import { z } from 'zod';
import { requireOrgUser } from '@/lib/session';
import { deleteMitigation, updateMitigation } from '@/server/services/risk-extras.service';
import { clientIp, handle, ok } from '@/lib/api';

type Ctx = { params: Promise<{ id: string; mitigationId: string }> };

const updateSchema = z.object({
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  description: z.string().trim().min(1).max(500).optional(),
  deadline: z.string().trim().min(1).nullish(),
  owner: z.string().trim().max(120).nullish(),
});

export async function PATCH(req: Request, { params }: Ctx) {
  return handle(async () => {
    const user = await requireOrgUser();
    const { mitigationId } = await params;
    const input = updateSchema.parse(await req.json());
    const updated = await updateMitigation(user, mitigationId, input, clientIp(req));
    return ok(updated);
  });
}

export async function DELETE(req: Request, { params }: Ctx) {
  return handle(async () => {
    const user = await requireOrgUser();
    const { mitigationId } = await params;
    const result = await deleteMitigation(user, mitigationId, clientIp(req));
    return ok(result);
  });
}
