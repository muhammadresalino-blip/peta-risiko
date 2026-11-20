import { requireOrgUser } from '@/lib/session';
import { transitionRisk } from '@/server/services/risk.service';
import { rejectSchema } from '@/validators/risk';
import { clientIp, handle, ok } from '@/lib/api';

type Ctx = { params: Promise<{ id: string }> };

/** Handler POST untuk aksi siklus hidup risiko (submit/approve/reject/retire). */
export function transitionHandler(kind: 'submit' | 'approve' | 'reject' | 'retire') {
  return async function POST(req: Request, { params }: Ctx) {
    return handle(async () => {
      const user = await requireOrgUser();
      const { id } = await params;
      let note: string | undefined;
      if (kind === 'reject' || kind === 'submit') {
        const body = await req.json().catch(() => ({}));
        if (kind === 'reject') note = rejectSchema.parse(body).note;
        else note = typeof body?.note === 'string' ? body.note : undefined;
      }
      return ok(await transitionRisk(user, id, kind, note, clientIp(req)));
    });
  };
}
