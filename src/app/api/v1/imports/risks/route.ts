import { requireOrgUser, HttpError } from '@/lib/session';
import { prisma } from '@/lib/db';
import { commitImport, previewImport, type ImportRow } from '@/server/services/import.service';
import { parseSheet, suggestMapping, buildRiskInputWorkbook } from '@/lib/excel';
import { clientIp, handle, ok } from '@/lib/api';

const MAX_BYTES = 5 * 1024 * 1024;

async function readUpload(req: Request) {
  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) throw new HttpError(422, 'VALIDATION_ERROR', 'File Excel wajib diunggah.');
  if (file.size > MAX_BYTES) throw new HttpError(422, 'VALIDATION_ERROR', 'Ukuran file maksimal 5 MB.');
  if (!/\.(xlsx|xlsm)$/i.test(file.name)) {
    throw new HttpError(422, 'VALIDATION_ERROR', 'Hanya file .xlsx atau .xlsm yang didukung.');
  }
  const mappingRaw = form.get('mapping');
  const mapping = typeof mappingRaw === 'string' && mappingRaw ? (JSON.parse(mappingRaw) as Record<string, string>) : null;
  const mappingId = typeof form.get('mappingId') === 'string' && form.get('mappingId') ? String(form.get('mappingId')) : null;
  const category = typeof form.get('fallbackCategory') === 'string' ? String(form.get('fallbackCategory')) : '';
  const buffer = Buffer.from(await file.arrayBuffer());
  return { mapping, mappingId, category, buffer };
}

/** GET: unduh templat impor kosong (kolom sesuai sheet Risk Input). */
export async function GET() {
  return handle(async () => {
    await requireOrgUser();
    const buffer = await buildRiskInputWorkbook([]);
    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="templat-impor-risk-input.xlsx"',
      },
    });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireOrgUser();
    const dryRun = new URL(req.url).searchParams.get('dryRun') !== 'false';
    const { buffer, mapping, mappingId, category } = await readUpload(req);
    const sheet = await parseSheet(buffer);

    if (!sheet.rows.length) {
      throw new HttpError(422, 'VALIDATION_ERROR', 'File tidak berisi baris data.');
    }

    let savedMapping: Record<string, string> | null = null;
    if (mappingId) {
      const template = await prisma.importMapping.findFirst({ where: { id: mappingId, orgId: user.orgId } });
      if (!template) throw new HttpError(404, 'NOT_FOUND', 'Templat pemetaan tidak ditemukan.');
      savedMapping = JSON.parse(template.columns) as Record<string, string>;
    }

    const usedMapping = mapping ?? savedMapping ?? suggestMapping(sheet.headers);

    if (dryRun) {
      return ok({
        headers: sheet.headers,
        mapping: usedMapping,
        preview: await previewImport(user, sheet.rows as ImportRow[], usedMapping, category),
      });
    }

    return ok(await commitImport(user, sheet.rows as ImportRow[], usedMapping, category, clientIp(req)));
  });
}
