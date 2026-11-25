import { requireOrgUser } from '@/lib/session';
import { deleteAttachment } from '@/server/services/risk-extras.service';
import { clientIp, handle, ok } from '@/lib/api';

type Ctx = { params: Promise<{ id: string; attachmentId: string }> };

export async function DELETE(req: Request, { params }: Ctx) {
  return handle(async () => {
    const user = await requireOrgUser();
    const { attachmentId } = await params;
    const result = await deleteAttachment(user, attachmentId, clientIp(req));
    return ok(result);
  });
}
