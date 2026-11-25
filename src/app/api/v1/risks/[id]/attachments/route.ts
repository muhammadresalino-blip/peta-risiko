import { requireOrgUser } from '@/lib/session';
import { getRisk } from '@/server/services/risk.service';
import { addAttachment } from '@/server/services/risk-extras.service';
import { clientIp, fail, handle, ok } from '@/lib/api';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const user = await requireOrgUser();
    const { id } = await params;
    const risk = await getRisk(user, id);
    return ok(risk.attachments);
  });
}

export async function POST(req: Request, { params }: Ctx) {
  return handle(async () => {
    const user = await requireOrgUser();
    const { id } = await params;
    const form = await req.formData().catch(() => null);
    if (!form) return fail(422, 'VALIDATION_ERROR', 'Gunakan multipart/form-data dengan field "file".');
    const file = form.get('file');
    if (!(file instanceof File)) return fail(422, 'VALIDATION_ERROR', 'Berkas tidak ditemukan pada field "file".');
    const created = await addAttachment(user, id, file, clientIp(req));
    return ok(created);
  });
}
