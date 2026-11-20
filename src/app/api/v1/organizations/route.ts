import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireUser, HttpError } from '@/lib/session';
import { hashPassword } from '@/lib/auth';
import { handle, ok } from '@/lib/api';

const createOrgSchema = z.object({
  name: z.string().min(1, 'Nama organisasi wajib diisi'),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, 'Slug hanya huruf kecil, angka, dan tanda hubung'),
  currency: z.string().min(1).default('IDR'),
  adminName: z.string().min(1, 'Nama Admin pertama wajib diisi'),
  adminEmail: z.string().email('Email Admin tidak valid'),
  adminPassword: z.string().min(10, 'Kata sandi minimal 10 karakter'),
});

export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    if (user.role !== 'PLATFORM_ADMIN') {
      throw new HttpError(403, 'FORBIDDEN', 'Hanya Platform Admin yang boleh melihat daftar organisasi.');
    }

    const orgs = await prisma.organization.findMany({
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { users: true, risks: true, units: true } } },
    });
    return ok(orgs);
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    if (user.role !== 'PLATFORM_ADMIN') {
      throw new HttpError(403, 'FORBIDDEN', 'Hanya Platform Admin yang boleh membuat organisasi.');
    }

    const input = createOrgSchema.parse(await req.json());

    const existing = await prisma.user.findUnique({ where: { email: input.adminEmail.toLowerCase() } });
    if (existing) throw new HttpError(409, 'CONFLICT', 'Email Admin sudah dipakai.');

    const org = await prisma.$transaction(async (tx) => {
      const created = await tx.organization.create({
        data: { name: input.name, slug: input.slug, currency: input.currency },
      });

      // Pengaturan bawaan; BTR dikosongkan (0) sampai Admin organisasi mengisinya.
      await tx.setting.createMany({
        data: [
          { orgId: created.id, key: 'btr', value: '0' },
          { orgId: created.id, key: 'totalRevenue', value: '0' },
          {
            orgId: created.id,
            key: 'probPct',
            value: JSON.stringify({ 1: 0.1, 2: 0.25, 3: 0.5, 4: 0.7, 5: 0.9 }),
          },
          { orgId: created.id, key: 'levelThresholds', value: JSON.stringify({ low: 3, medium: 6, high: 12 }) },
        ],
      });

      const admin = await tx.user.create({
        data: {
          orgId: created.id,
          name: input.adminName,
          email: input.adminEmail.toLowerCase(),
          passwordHash: hashPassword(input.adminPassword),
          role: 'ADMIN',
        },
        select: { id: true, name: true, email: true, role: true },
      });

      await tx.auditLog.create({
        data: {
          orgId: created.id,
          actorId: user.id,
          entity: 'Organization',
          entityId: created.id,
          action: 'CREATE',
          after: JSON.stringify({ name: created.name, slug: created.slug, adminEmail: admin.email }),
        },
      });

      return { ...created, admin };
    });

    return ok(org);
  });
}
