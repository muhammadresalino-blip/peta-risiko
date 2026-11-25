import { z } from 'zod';
import { requireOrgUser } from '@/lib/session';
import { getRisk } from '@/server/services/risk.service';
import { addKri } from '@/server/services/risk-extras.service';
import { clientIp, handle, ok } from '@/lib/api';

type Ctx = { params: Promise<{ id: string }> };

const createSchema = z.object({
  name: z.string().trim().min(1, 'Nama KRI wajib diisi.').max(200),
  unit: z.string().trim().min(1).max(40),
  threshold: z.number().finite(),
});

export async function GET(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const user = await requireOrgUser();
    const { id } = await params;
    const risk = await getRisk(user, id);
    return ok(risk.kris);
  });
}

export async function POST(req: Request, { params }: Ctx) {
  return handle(async () => {
    const user = await requireOrgUser();
    const { id } = await params;
    const input = createSchema.parse(await req.json());
    const created = await addKri(user, id, input, clientIp(req));
    return ok(created);
  });
}
