import { requireOrgUser } from '@/lib/session';
import { deleteKri } from '@/server/services/risk-extras.service';
import { clientIp, handle, ok } from '@/lib/api';

type Ctx = { params: Promise<{ id: string; kriId: string }> };

export async function DELETE(req: Request, { params }: Ctx) {
  return handle(async () => {
    const user = await requireOrgUser();
    const { kriId } = await params;
    const result = await deleteKri(user, kriId, clientIp(req));
    return ok(result);
  });
}
