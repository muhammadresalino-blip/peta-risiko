import { prisma } from '@/lib/db';
import { requireOrgUser } from '@/lib/session';
import { getRisk } from '@/server/services/risk.service';
import { canViewAuditOf } from '@/lib/rbac';
import { fail, handle, ok } from '@/lib/api';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const user = await requireOrgUser();
    const { id } = await params;
    const risk = await getRisk(user, id);
    if (!canViewAuditOf(user, risk)) return fail(403, 'FORBIDDEN', 'Anda tidak berhak melihat audit risiko ini.');

    const logs = await prisma.auditLog.findMany({
      where: { orgId: risk.orgId, entity: 'Risk', entityId: id },
      orderBy: { at: 'desc' },
      take: 100,
    });
    return ok(logs);
  });
}
