import { requireOrgUser } from '@/lib/session';
import { createRisk, listRisks } from '@/server/services/risk.service';
import { riskCreateSchema } from '@/validators/risk';
import { clientIp, handle, ok, paging } from '@/lib/api';

export async function GET(req: Request) {
  return handle(async () => {
    const user = await requireOrgUser();
    const url = new URL(req.url);
    const { page, limit } = paging(url.searchParams);
    const result = await listRisks(user, {
      q: url.searchParams.get('q') ?? undefined,
      unit: url.searchParams.get('unit') ?? undefined,
      category: url.searchParams.get('category') ?? undefined,
      level: url.searchParams.get('level') ?? undefined,
      status: url.searchParams.get('status') ?? undefined,
      appetite: url.searchParams.get('appetite') ?? undefined,
      sort: url.searchParams.get('sort') ?? undefined,
      page,
      limit,
    });
    return ok(result.rows, { page, limit, total: result.total, pages: result.pages });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireOrgUser();
    const input = riskCreateSchema.parse(await req.json());
    const { risk, warning } = await createRisk(user, input, clientIp(req));
    return ok({ ...risk, warning });
  });
}
