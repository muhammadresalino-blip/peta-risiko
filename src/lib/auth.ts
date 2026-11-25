import crypto from 'node:crypto';

const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 jam

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value) {
    // Jangan pernah memakai secret publik di produksi: sesi bisa dipalsukan.
    if (process.env.NODE_ENV === 'production') {
      throw new Error('AUTH_SECRET wajib diisi di produksi dengan nilai acak yang kuat.');
    }
    return 'petarisiko-dev-secret';
  }
  return value;
}

/* ---------------- Kata sandi ---------------- */

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  if (candidate.length !== expected.length) return false;
  return crypto.timingSafeEqual(candidate, expected);
}

/* ---------------- Sesi (cookie bertanda tangan) ---------------- */

export interface SessionPayload {
  uid: string;
  exp: number;
}

export const SESSION_COOKIE = 'pr_session';

export function signSession(uid: string): string {
  const payload: SessionPayload = { uid, exp: Date.now() + SESSION_TTL_MS };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifySession(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as SessionPayload;
    if (!payload.uid || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: SESSION_TTL_MS / 1000,
};
