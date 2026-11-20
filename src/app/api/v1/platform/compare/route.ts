import { requireUser, HttpError } from '@/lib/session';
import { handle, ok } from '@/lib/api';
import { compareOrganizations } from '@/server/services/platform.service';

export async function GET(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    if (user.role !== 'PLATFORM_ADMIN') {
      throw new HttpError(403, 'FORBIDDEN', 'Hanya Platform Admin yang boleh membandingkan organisasi.');
    }

    const url = new URL(req.url);
    const requested = (url.searchParams.get('orgIds') ?? '').split(',').filter(Boolean);
    return ok(await compareOrganizations(requested));
  });
}
