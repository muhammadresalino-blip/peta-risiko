import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { HttpError } from '@/lib/session';

export function ok(data: unknown, meta?: Record<string, unknown>) {
  return NextResponse.json(meta ? { data, meta } : { data });
}

export function fail(status: number, code: string, message: string, details?: unknown) {
  return NextResponse.json({ error: { code, message, details } }, { status });
}

/** Bungkus route handler: menerjemahkan error menjadi format { error: { code, message } }. */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof HttpError) return fail(err.status, err.code, err.message, err.details);
    if (err instanceof ZodError) {
      return fail(
        422,
        'VALIDATION_ERROR',
        'Data tidak lolos validasi.',
        err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      );
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002') return fail(409, 'CONFLICT', 'Kode atau nama sudah dipakai.');
      if (err.code === 'P2025') return fail(404, 'NOT_FOUND', 'Data tidak ditemukan.');
      if (err.code === 'P2034') return fail(409, 'CONFLICT', 'Versi data sudah berubah, muat ulang.');
    }
    console.error('[api]', err);
    return fail(500, 'INTERNAL_ERROR', 'Kesalahan server.');
  }
}

export function paging(searchParams: URLSearchParams) {
  const page = Math.max(1, Number(searchParams.get('page') ?? 1) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? 20) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

export function clientIp(req: Request): string | null {
  const fwd = req.headers.get('x-forwarded-for');
  return fwd ? fwd.split(',')[0].trim() : null;
}
