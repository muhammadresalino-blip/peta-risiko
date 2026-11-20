import { requireOrgUser } from '@/lib/session';
import { trend } from '@/server/services/dashboard.service';
import { handle, ok } from '@/lib/api';

export async function GET(req: Request) {
  return handle(async () => {
    const user = await requireOrgUser();
    const url = new URL(req.url);
    return ok(
      await trend(
        user,
        url.searchParams.get('from') ?? undefined,
        url.searchParams.get('to') ?? undefined,
      ),
    );
  });
}
