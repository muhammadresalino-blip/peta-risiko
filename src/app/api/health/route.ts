import { prisma } from '@/lib/db';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: 'ok', database: 'up', at: new Date().toISOString() });
  } catch {
    return Response.json({ status: 'degraded', database: 'down' }, { status: 503 });
  }
}
