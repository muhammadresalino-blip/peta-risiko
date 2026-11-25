import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPassword, signSession, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth';
import { loginSchema } from '@/validators/risk';
import { clientIp, fail, handle } from '@/lib/api';

/**
 * Rate limiter in-memory: 5 percobaan per 5 menit per IP.
 * Pada deployment multi-instance, ganti dengan Redis/Upstash karena state Map
 * hanya berlaku di satu proses.
 */
const RATE_WINDOW_MS = 5 * 60 * 1000;
const RATE_MAX = 5;
const rateLimitKeyMap = new Map<string, number[]>();
let lastPruneAt = 0;

/** Buang entri lama agar Map tidak tumbuh tanpa batas. */
function pruneRateLimit(now: number) {
  if (now - lastPruneAt < RATE_WINDOW_MS) return;
  lastPruneAt = now;
  for (const [key, hits] of rateLimitKeyMap) {
    const recent = hits.filter((t) => now - t < RATE_WINDOW_MS);
    if (recent.length === 0) rateLimitKeyMap.delete(key);
    else rateLimitKeyMap.set(key, recent);
  }
}

function rateLimitCheck(key: string): null | { status: number; body: unknown } {
  const now = Date.now();
  pruneRateLimit(now);
  const recentHistory = (rateLimitKeyMap.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);

  if (recentHistory.length >= RATE_MAX) {
    rateLimitKeyMap.set(key, recentHistory);
    return {
      status: 429,
      body: { error: { code: 'TOO_MANY_REQUESTS', message: 'Terlalu banyak percobaan login. Silakan tunggu 5 menit.' } },
    };
  }

  recentHistory.push(now);
  rateLimitKeyMap.set(key, recentHistory);
  return null;
}

export async function POST(req: Request) {
  return handle(async () => {
    const ip = clientIp(req) ?? 'unknown';
    const rl = rateLimitCheck(ip);
    if (rl) return NextResponse.json(rl.body, { status: rl.status });

    const body = loginSchema.parse(await req.json());
    const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    
    if (!user || !user.isActive || !verifyPassword(body.password, user.passwordHash)) {
      return fail(401, 'UNAUTHENTICATED', 'Email atau kata sandi salah.');
    }

    const res = NextResponse.json({
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        orgId: user.orgId,
      },
    });
    res.cookies.set(SESSION_COOKIE, signSession(user.id), sessionCookieOptions);
    return res;
  });
}
