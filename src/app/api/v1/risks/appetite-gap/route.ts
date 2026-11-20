import { requireOrgUser } from '@/lib/session';
import { gapRisks } from '@/server/services/appetite.service';
import { handle, ok } from '@/lib/api';

export async function GET() {
  return handle(async () => {
    const user = await requireOrgUser();
    return ok(await gapRisks(user));
  });
}
