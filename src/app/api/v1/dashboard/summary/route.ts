import { requireOrgUser } from '@/lib/session';
import { summary } from '@/server/services/dashboard.service';
import { handle, ok } from '@/lib/api';

export async function GET() {
  return handle(async () => {
    const user = await requireOrgUser();
    return ok(await summary(user));
  });
}
