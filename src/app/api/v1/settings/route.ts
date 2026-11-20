import { requireOrgUser } from '@/lib/session';
import { getSettings, saveSettings } from '@/lib/settings';
import { settingsSchema } from '@/validators/risk';
import { can } from '@/lib/rbac';
import { writeAudit } from '@/lib/audit';
import { clientIp, fail, handle, ok } from '@/lib/api';

export async function GET() {
  return handle(async () => {
    const user = await requireOrgUser();
    return ok(await getSettings(user.orgId));
  });
}

export async function PUT(req: Request) {
  return handle(async () => {
    const user = await requireOrgUser();
    if (!can(user, 'settings.manage')) return fail(403, 'FORBIDDEN', 'Hanya Admin yang boleh mengubah kriteria.');
    const before = await getSettings(user.orgId);
    const patch = settingsSchema.parse(await req.json());
    const after = await saveSettings(user.orgId, patch);
    await writeAudit({
      orgId: user.orgId,
      actorId: user.id,
      entity: 'Setting',
      entityId: user.orgId,
      action: 'SETTINGS',
      before,
      after,
      ip: clientIp(req),
    });
    return ok(after);
  });
}
