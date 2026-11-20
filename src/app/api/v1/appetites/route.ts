import { requireOrgUser } from '@/lib/session';
import { listAppetites, upsertAppetite } from '@/server/services/appetite.service';
import { appetiteSchema } from '@/validators/risk';
import { clientIp, handle, ok } from '@/lib/api';

export async function GET() {
  return handle(async () => {
    const user = await requireOrgUser();
    const { appetites, units } = await listAppetites(user);
    return ok(appetites, { units });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireOrgUser();
    const input = appetiteSchema.parse(await req.json());
    return ok(await upsertAppetite(user, input, clientIp(req)));
  });
}
