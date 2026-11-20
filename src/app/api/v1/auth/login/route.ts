import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPassword, signSession, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth';
import { loginSchema } from '@/validators/risk';
import { fail, handle } from '@/lib/api';

/**
 * Rate limiter in-memory: 5 percobaan login per 5 menit per IP.
 * State disimpan di Map global selama proses server berjalan.
 */
const rateLimitKeyMap = new Map<string, number[]>();

function rateLimitCheck(ip: string): null | { status: number; body: any } {
  const now = Date.now();
  const history = rateLimitKeyMap.get(ip) || [];
  const recentHistory = history.filter(t => now - t < 5 * 60 * 1000);
  rateLimitKeyMap.set(ip, [...recentHistory, now]);

  if (recentHistory.length >= 5) {
    return {
      status: 429,
      body: { error: { code: 'TOO_MANY_REQUESTS', message: 'Terlalu banyak percobaan login. Silakan tunggu 5 menit.' } },
    };
  }
  return null;
}

export async function POST(req: Request) {
  return handle(async () => {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
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
