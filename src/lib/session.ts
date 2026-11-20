import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { SESSION_COOKIE, verifySession } from '@/lib/auth';
import type { Actor, Role } from '@/lib/rbac';

export interface CurrentUser extends Actor {
  email: string;
  name: string;
  orgName: string | null;
}

/** Baca sesi dari cookie dan muat pengguna aktif. Null bila belum login. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const jar = await cookies();
  const payload = verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.uid },
    include: { org: true },
  });
  if (!user || !user.isActive) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as Role,
    orgId: user.orgId,
    unitId: user.unitId,
    orgName: user.org?.name ?? null,
  };
}

export class HttpError extends Error {
  status: number;
  code: string;
  details?: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** Untuk halaman: lempar error bila belum login (ditangkap layout). */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, 'UNAUTHENTICATED', 'Silakan login terlebih dahulu.');
  return user;
}

/** Untuk API route: butuh organisasi (semua peran kecuali Platform Admin). */
export async function requireOrgUser(): Promise<CurrentUser & { orgId: string }> {
  const user = await requireUser();
  if (!user.orgId) {
    throw new HttpError(403, 'FORBIDDEN', 'Akun Platform Admin tidak memiliki organisasi.');
  }
  return user as CurrentUser & { orgId: string };
}
