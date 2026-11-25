import { prisma } from '@/lib/db';
import { requireOrgUser } from '@/lib/session';
import { can } from '@/lib/rbac';
import { riskScope, unitFilter, NO_UNIT } from '@/lib/tenant';
import { buildRiskInputWorkbook } from '@/lib/excel';
import { fail, handle } from '@/lib/api';

export async function GET(req: Request) {
  return handle(async () => {
    const user = await requireOrgUser();
    if (!can(user, 'export.run')) return fail(403, 'FORBIDDEN', 'Peran Anda tidak berhak mengekspor data.');

    const unitId = unitFilter(user, new URL(req.url).searchParams.get('unitId'));
    let unitName = '';
    if (unitId && unitId !== NO_UNIT) {
      const unit = await prisma.unit.findFirst({
        where: { id: unitId, orgId: user.orgId },
        select: { name: true },
      });
      if (!unit) return fail(404, 'NOT_FOUND', 'Unit kerja tidak ditemukan.');
      unitName = unit.name;
    }

    const risks = await prisma.risk.findMany({
      where: { ...riskScope(user), ...(unitId ? { unitId } : {}) },
      include: { unit: true, owner: { select: { name: true } } },
      orderBy: { code: 'asc' },
    });
    const buffer = await buildRiskInputWorkbook(risks);
    const suffix = unitName
      ? `-${unitName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`
      : '';

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="risk-input${suffix}-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  });
}
