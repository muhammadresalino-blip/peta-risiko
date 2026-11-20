import { requireUser } from '@/lib/session';
import { ok, handle } from '@/lib/api';

export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    return ok({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      orgId: user.orgId,
      orgName: user.orgName,
      unitId: user.unitId,
    });
  });
}
