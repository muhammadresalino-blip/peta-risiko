import { requireOrgUser } from '@/lib/session';
import { heatmap } from '@/server/services/dashboard.service';
import { handle, ok } from '@/lib/api';

export async function GET(req: Request) {
  return handle(async () => {
    const user = await requireOrgUser();
    const view = new URL(req.url).searchParams.get('view') === 'residual' ? 'residual' : 'inherent';
    return ok(await heatmap(user, view));
  });
}
