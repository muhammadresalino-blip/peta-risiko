import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'SUBMIT'
  | 'APPROVE'
  | 'REJECT'
  | 'RETIRE'
  | 'IMPORT'
  | 'RECALCULATE'
  | 'SETTINGS'
  | 'LOGIN';

interface AuditInput {
  orgId: string;
  actorId: string;
  entity: string;
  entityId: string;
  action: AuditAction;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
}

type Tx = Prisma.TransactionClient | typeof prisma;

const stringify = (v: unknown) => (v === undefined ? null : JSON.stringify(v));

/** Tulis audit log. Panggil di dalam transaksi yang sama dengan perubahan data. */
export async function writeAudit(input: AuditInput, tx: Tx = prisma) {
  return tx.auditLog.create({
    data: {
      orgId: input.orgId,
      actorId: input.actorId,
      entity: input.entity,
      entityId: input.entityId,
      action: input.action,
      before: stringify(input.before),
      after: stringify(input.after),
      ip: input.ip ?? null,
    },
  });
}
