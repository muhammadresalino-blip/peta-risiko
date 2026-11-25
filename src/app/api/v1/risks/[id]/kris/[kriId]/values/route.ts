import { z } from 'zod';
import { requireOrgUser } from '@/lib/session';
import { recordKriValue } from '@/server/services/risk-extras.service';
import { clientIp, handle, ok } from '@/lib/api';

type Ctx = { params: Promise<{ id: string; kriId: string }> };

const valueSchema = z.object({
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Format periode harus YYYY-MM.'),
  value: z.number().finite(),
  note: z.string().trim().max(300).nullish(),
});

export async function POST(req: Request, { params }: Ctx) {
  return handle(async () => {
    const user = await requireOrgUser();
    const { kriId } = await params;
    const input = valueSchema.parse(await req.json());
    const saved = await recordKriValue(user, kriId, input, clientIp(req));
    return ok(saved);
  });
}
