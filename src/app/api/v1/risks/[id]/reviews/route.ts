import { requireOrgUser } from '@/lib/session';
import { addReview, getRisk } from '@/server/services/risk.service';
import { can } from '@/lib/rbac';
import { reviewSchema } from '@/validators/risk';
import { clientIp, fail, handle, ok } from '@/lib/api';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const user = await requireOrgUser();
    const { id } = await params;
    const risk = await getRisk(user, id);
    return ok(risk.reviews);
  });
}

export async function POST(req: Request, { params }: Ctx) {
  return handle(async () => {
    const user = await requireOrgUser();
    if (!can(user, 'risk.review')) return fail(403, 'FORBIDDEN', 'Peran Anda tidak berhak mencatat kajian.');
    const { id } = await params;
    const input = reviewSchema.parse(await req.json());
    const result = await addReview(user, id, input, clientIp(req));
    return ok(result);
  });
}
