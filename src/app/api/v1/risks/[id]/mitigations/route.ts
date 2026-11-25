import { z } from 'zod';
import { requireOrgUser } from '@/lib/session';
import { getRisk } from '@/server/services/risk.service';
import { addMitigation } from '@/server/services/risk-extras.service';
import { clientIp, handle, ok } from '@/lib/api';

type Ctx = { params: Promise<{ id: string }> };

const createSchema = z.object({
  description: z.string().trim().min(1, 'Deskripsi wajib diisi.').max(500),
  deadline: z.string().trim().min(1).nullish(),
  owner: z.string().trim().max(120).nullish(),
});

export async function GET(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const user = await requireOrgUser();
    const { id } = await params;
    const risk = await getRisk(user, id);
    return ok(risk.mitigations);
  });
}

export async function POST(req: Request, { params }: Ctx) {
  return handle(async () => {
    const user = await requireOrgUser();
    const { id } = await params;
    const input = createSchema.parse(await req.json());
    const created = await addMitigation(user, id, input, clientIp(req));
    return ok(created);
  });
}
