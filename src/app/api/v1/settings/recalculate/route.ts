import { requireOrgUser } from '@/lib/session';
import { recalculateAll } from '@/server/services/risk.service';
import { can } from '@/lib/rbac';
import { clientIp, fail, handle, ok } from '@/lib/api';

export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireOrgUser();
    if (!can(user, 'settings.manage')) return fail(403, 'FORBIDDEN', 'Hanya Admin yang boleh menghitung ulang.');
    return ok(await recalculateAll(user, clientIp(req)));
  });
}
