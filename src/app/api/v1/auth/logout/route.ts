import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth';
import { handle } from '@/lib/api';

export async function POST() {
  return handle(async () => {
    const res = NextResponse.json({ data: { ok: true } });
    res.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 });
    return res;
  });
}
