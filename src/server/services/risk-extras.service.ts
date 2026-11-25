import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '@/lib/db';
import { HttpError } from '@/lib/session';
import { can } from '@/lib/rbac';
import type { CurrentUser } from '@/lib/session';
import { writeAudit } from '@/lib/audit';
import { getRisk } from '@/server/services/risk.service';

/** Batas ukuran lampiran: 10 MB. */
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'text/csv': '.csv',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
};

/** Hanya Admin dan Risk Owner unit terkait yang boleh mengubah data tambahan risiko. */
async function editableRisk(actor: CurrentUser, riskId: string) {
  const risk = await getRisk(actor, riskId); // sekaligus cek tenant + unit visibility
  if (!can(actor, 'risk.update')) throw new HttpError(403, 'FORBIDDEN', 'Peran Anda tidak boleh mengubah risiko.');
  if (actor.role === 'RISK_OWNER' && actor.unitId !== risk.unitId) {
    throw new HttpError(403, 'FORBIDDEN', 'Risk Owner hanya boleh mengubah risiko unitnya.');
  }
  return risk;
}

function requireOrg(actor: CurrentUser): string {
  if (!actor.orgId) throw new HttpError(403, 'FORBIDDEN', 'Akun tanpa organisasi.');
  return actor.orgId;
}

/* ---------------------------------- Mitigasi ---------------------------------- */

export async function addMitigation(
  actor: CurrentUser,
  riskId: string,
  input: { description: string; deadline?: string | null; owner?: string | null },
  ip?: string | null,
) {
  const risk = await editableRisk(actor, riskId);
  return prisma.$transaction(async (tx) => {
    const created = await tx.riskMitigation.create({
      data: {
        riskId: risk.id,
        description: input.description,
        deadline: input.deadline ? new Date(input.deadline) : null,
        owner: input.owner ?? null,
      },
    });
    await writeAudit(
      {
        orgId: risk.orgId,
        actorId: actor.id,
        entity: 'RiskMitigation',
        entityId: created.id,
        action: 'CREATE',
        after: { riskId: risk.id, description: created.description },
        ip,
      },
      tx,
    );
    return created;
  });
}

export async function updateMitigation(
  actor: CurrentUser,
  id: string,
  input: { status?: string; description?: string; deadline?: string | null; owner?: string | null },
  ip?: string | null,
) {
  const existing = await prisma.riskMitigation.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Tindakan tidak ditemukan.');
  const risk = await editableRisk(actor, existing.riskId);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.riskMitigation.update({
      where: { id },
      data: {
        ...(input.status ? { status: input.status } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.deadline !== undefined ? { deadline: input.deadline ? new Date(input.deadline) : null } : {}),
        ...(input.owner !== undefined ? { owner: input.owner } : {}),
      },
    });
    await writeAudit(
      {
        orgId: risk.orgId,
        actorId: actor.id,
        entity: 'RiskMitigation',
        entityId: id,
        action: 'UPDATE',
        before: { status: existing.status, description: existing.description },
        after: { status: updated.status, description: updated.description },
        ip,
      },
      tx,
    );
    return updated;
  });
}

export async function deleteMitigation(actor: CurrentUser, id: string, ip?: string | null) {
  const existing = await prisma.riskMitigation.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Tindakan tidak ditemukan.');
  const risk = await editableRisk(actor, existing.riskId);

  await prisma.$transaction(async (tx) => {
    await tx.riskMitigation.delete({ where: { id } });
    await writeAudit(
      {
        orgId: risk.orgId,
        actorId: actor.id,
        entity: 'RiskMitigation',
        entityId: id,
        action: 'DELETE',
        before: { description: existing.description },
        ip,
      },
      tx,
    );
  });
  return { deleted: true };
}

/* ------------------------------------- KRI ------------------------------------ */

export async function addKri(
  actor: CurrentUser,
  riskId: string,
  input: { name: string; unit: string; threshold: number },
  ip?: string | null,
) {
  const risk = await editableRisk(actor, riskId);
  return prisma.$transaction(async (tx) => {
    const created = await tx.kRI.create({
      data: { riskId: risk.id, name: input.name, unit: input.unit, threshold: input.threshold },
      include: { values: true },
    });
    await writeAudit(
      {
        orgId: risk.orgId,
        actorId: actor.id,
        entity: 'KRI',
        entityId: created.id,
        action: 'CREATE',
        after: { riskId: risk.id, name: created.name, threshold: created.threshold },
        ip,
      },
      tx,
    );
    return created;
  });
}

export async function recordKriValue(
  actor: CurrentUser,
  kriId: string,
  input: { period: string; value: number; note?: string | null },
  ip?: string | null,
) {
  const kri = await prisma.kRI.findUnique({ where: { id: kriId } });
  if (!kri) throw new HttpError(404, 'NOT_FOUND', 'KRI tidak ditemukan.');
  const risk = await editableRisk(actor, kri.riskId);

  const saved = await prisma.kRIValue.upsert({
    where: { kriId_period: { kriId, period: input.period } },
    create: { kriId, period: input.period, value: input.value, note: input.note ?? null },
    update: { value: input.value, note: input.note ?? null },
  });

  await writeAudit({
    orgId: risk.orgId,
    actorId: actor.id,
    entity: 'KRIValue',
    entityId: saved.id,
    action: 'UPDATE',
    after: { kriId, period: saved.period, value: saved.value },
    ip,
  });
  return saved;
}

export async function deleteKri(actor: CurrentUser, id: string, ip?: string | null) {
  const existing = await prisma.kRI.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'KRI tidak ditemukan.');
  const risk = await editableRisk(actor, existing.riskId);

  await prisma.$transaction(async (tx) => {
    await tx.kRI.delete({ where: { id } });
    await writeAudit(
      {
        orgId: risk.orgId,
        actorId: actor.id,
        entity: 'KRI',
        entityId: id,
        action: 'DELETE',
        before: { name: existing.name },
        ip,
      },
      tx,
    );
  });
  return { deleted: true };
}

/* --------------------------------- Lampiran ---------------------------------- */

function uploadDir(orgId: string) {
  return path.join(process.cwd(), 'public', 'uploads', orgId);
}

export async function addAttachment(actor: CurrentUser, riskId: string, file: File, ip?: string | null) {
  const risk = await editableRisk(actor, riskId);
  const orgId = requireOrg(actor);

  if (file.size <= 0) throw new HttpError(422, 'VALIDATION_ERROR', 'Berkas kosong.');
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new HttpError(422, 'VALIDATION_ERROR', 'Ukuran berkas melebihi 10 MB.');
  }
  const ext = ALLOWED_MIME[file.type];
  if (!ext) throw new HttpError(422, 'VALIDATION_ERROR', 'Tipe berkas tidak didukung.');

  const dir = uploadDir(orgId);
  await mkdir(dir, { recursive: true });
  const storedName = `${randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, storedName), buffer);

  const relativePath = `/uploads/${orgId}/${storedName}`;
  const created = await prisma.attachment.create({
    data: {
      riskId: risk.id,
      name: file.name.slice(0, 200),
      mimeType: file.type,
      path: relativePath,
      size: file.size,
    },
  });

  await writeAudit({
    orgId,
    actorId: actor.id,
    entity: 'Attachment',
    entityId: created.id,
    action: 'CREATE',
    after: { riskId: risk.id, name: created.name, size: created.size },
    ip,
  });
  return created;
}

export async function deleteAttachment(actor: CurrentUser, id: string, ip?: string | null) {
  const existing = await prisma.attachment.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Lampiran tidak ditemukan.');
  const risk = await editableRisk(actor, existing.riskId);

  await prisma.$transaction(async (tx) => {
    await tx.attachment.delete({ where: { id } });
    await writeAudit(
      {
        orgId: risk.orgId,
        actorId: actor.id,
        entity: 'Attachment',
        entityId: id,
        action: 'DELETE',
        before: { name: existing.name },
        ip,
      },
      tx,
    );
  });

  // Hapus berkas fisik; abaikan bila sudah tidak ada.
  try {
    const full = path.join(process.cwd(), 'public', existing.path.replace(/^\/+/, ''));
    await unlink(full);
  } catch {
    /* noop */
  }
  return { deleted: true };
}
