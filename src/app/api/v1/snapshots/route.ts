import { requireOrgUser } from '@/lib/session';
import { takeSnapshot } from '@/server/services/dashboard.service';
import { can } from '@/lib/rbac';
import { fail, handle, ok } from '@/lib/api';

export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireOrgUser();
    if (!can(user, 'settings.manage')) return fail(403, 'FORBIDDEN', 'Hanya Admin yang boleh membuat snapshot.');
    const period = new URL(req.url).searchParams.get('period') ?? undefined;
    return ok(await takeSnapshot(user, period));
  });
}
