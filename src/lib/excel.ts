import ExcelJS from 'exceljs';
import { LEVEL_LABEL, type Level } from '@/lib/scoring';
import { STRATEGY_LABEL, STATUS_LABEL } from '@/lib/format';

export interface SheetData {
  headers: string[];
  rows: Record<string, string>[];
}

/** Baca sheet pertama menjadi header + baris teks. */
export async function parseSheet(buffer: Buffer): Promise<SheetData> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  const ws = wb.worksheets[0];
  if (!ws) return { headers: [], rows: [] };

  const headers: string[] = [];
  const headerRow = ws.getRow(1);
  headerRow.eachCell({ includeEmpty: false }, (cell, col) => {
    headers[col] = String(cell.text ?? cell.value ?? '').trim();
  });

  const rows: Record<string, string>[] = [];
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const obj: Record<string, string> = {};
    let hasValue = false;
    headers.forEach((header, col) => {
      if (!header) return;
      const cell = row.getCell(col);
      const text = String(cell.text ?? '').trim();
      if (text) hasValue = true;
      obj[header] = text;
    });
    if (hasValue) rows.push(obj);
  });

  return { headers: headers.filter(Boolean), rows };
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

const AUTO_MAP: Record<string, string> = {
  koderisiko: 'code',
  kode: 'code',
  idrisiko: 'code',
  tipe: 'type',
  jenisrisiko: 'type',
  kategoririsiko: 'category',
  kategori: 'category',
  unitkerja: 'unit',
  unit: 'unit',
  sasaran: 'goal',
  tujuan: 'goal',
  tanggalidentifikasi: 'identifiedAt',
  tglidentifikasi: 'identifiedAt',
  deskripsirisiko: 'description',
  deskripsi: 'description',
  risiko: 'description',
  akarpenyebab: 'rootCause',
  penyebab: 'rootCause',
  indikatorrisiko: 'indicator',
  indikator: 'indicator',
  internalcontrol: 'existingControl',
  pengendalian: 'existingControl',
  dampakkualitatif: 'qualitativeImpact',
  probabilitas: 'p',
  p: 'p',
  dampak: 'i',
  i: 'i',
  strategi: 'strategy',
  rencanapenanganan: 'treatment',
  penanganan: 'treatment',
  biayapenanganan: 'treatmentCost',
  biaya: 'treatmentCost',
  probabilitasresidual: 'rp',
  rp: 'rp',
  dampakresidual: 'ri',
  ri: 'ri',
  pemilikrisiko: 'owner',
  pemilik: 'owner',
  jabatanpemilik: 'ownerTitle',
  jabatan: 'ownerTitle',
  reviewberikutnya: 'nextReviewAt',
  tanggalreview: 'nextReviewAt',
};

/** Usulkan pemetaan kolom file -> field risiko. */
export function suggestMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const h of headers) mapping[h] = AUTO_MAP[norm(h)] ?? '';
  return mapping;
}

export const RISK_FIELDS: { key: string; label: string }[] = [
  { key: 'code', label: 'Kode Risiko' },
  { key: 'type', label: 'Tipe' },
  { key: 'category', label: 'Kategori Risiko' },
  { key: 'unit', label: 'Unit Kerja' },
  { key: 'goal', label: 'Sasaran' },
  { key: 'identifiedAt', label: 'Tanggal Identifikasi' },
  { key: 'description', label: 'Deskripsi Risiko' },
  { key: 'rootCause', label: 'Akar Penyebab' },
  { key: 'indicator', label: 'Indikator' },
  { key: 'existingControl', label: 'Internal Control' },
  { key: 'qualitativeImpact', label: 'Dampak Kualitatif' },
  { key: 'p', label: 'Probabilitas (P)' },
  { key: 'i', label: 'Dampak (I)' },
  { key: 'strategy', label: 'Strategi' },
  { key: 'treatment', label: 'Rencana Penanganan' },
  { key: 'treatmentCost', label: 'Biaya Penanganan' },
  { key: 'rp', label: "Probabilitas Residual (P')" },
  { key: 'ri', label: "Dampak Residual (I')" },
  { key: 'owner', label: 'Pemilik Risiko' },
  { key: 'ownerTitle', label: 'Jabatan Pemilik' },
  { key: 'nextReviewAt', label: 'Review Berikutnya' },
];

interface ExportRisk {
  code: string;
  type: string;
  category: string;
  unit?: { name: string } | null;
  goal: string;
  identifiedAt: Date | string;
  description: string;
  rootCause: string;
  indicator: string;
  existingControl: string;
  qualitativeImpact: string;
  p: number;
  i: number;
  score: number;
  level: string;
  probPct: number;
  financialImpact: number;
  netValue: number;
  owner?: { name: string } | null;
  ownerTitle: string;
  strategy: string;
  treatment: string;
  treatmentCost: number;
  rp: number;
  ri: number;
  scoreRes: number;
  levelRes: string;
  probPctRes: number;
  financialImpactRes: number;
  netValueRes: number;
  status: string;
  aboveAppetite: boolean;
  nextReviewAt: Date | string | null;
}

const dateOnly = (v: Date | string | null) => {
  if (!v) return '';
  const d = typeof v === 'string' ? new Date(v) : v;
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
};

function styleHeader(ws: ExcelJS.Worksheet) {
  const row = ws.getRow(1);
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  row.alignment = { vertical: 'middle' };
  ws.views = [{ state: 'frozen', ySplit: 1 }];
}

/** Ekspor format Risk Input (kolom sama dengan sheet asli). */
export async function buildRiskInputWorkbook(risks: ExportRisk[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Risk Input');
  ws.columns = [
    { header: 'Kode Risiko', key: 'code', width: 12 },
    { header: 'Tipe', key: 'type', width: 12 },
    { header: 'Kategori Risiko', key: 'category', width: 30 },
    { header: 'Unit Kerja', key: 'unit', width: 24 },
    { header: 'Sasaran', key: 'goal', width: 30 },
    { header: 'Tanggal Identifikasi', key: 'identifiedAt', width: 16 },
    { header: 'Deskripsi Risiko', key: 'description', width: 40 },
    { header: 'Akar Penyebab', key: 'rootCause', width: 36 },
    { header: 'Indikator', key: 'indicator', width: 30 },
    { header: 'Internal Control', key: 'existingControl', width: 30 },
    { header: 'Dampak Kualitatif', key: 'qualitativeImpact', width: 30 },
    { header: 'Probabilitas', key: 'p', width: 11 },
    { header: 'Dampak', key: 'i', width: 9 },
    { header: 'Skor', key: 'score', width: 8 },
    { header: 'Tingkat', key: 'level', width: 14 },
    { header: 'Probabilitas (%)', key: 'probPct', width: 15 },
    { header: 'Dampak Finansial', key: 'financialImpact', width: 18 },
    { header: 'Nilai Bersih', key: 'netValue', width: 18 },
    { header: 'Pemilik Risiko', key: 'owner', width: 22 },
    { header: 'Jabatan Pemilik', key: 'ownerTitle', width: 22 },
    { header: 'Strategi', key: 'strategy', width: 12 },
    { header: 'Rencana Penanganan', key: 'treatment', width: 36 },
    { header: 'Biaya Penanganan', key: 'treatmentCost', width: 16 },
    { header: "Probabilitas Residual", key: 'rp', width: 18 },
    { header: "Dampak Residual", key: 'ri', width: 16 },
    { header: 'Skor Residual', key: 'scoreRes', width: 14 },
    { header: 'Tingkat Residual', key: 'levelRes', width: 16 },
    { header: 'Nilai Bersih Residual', key: 'netValueRes', width: 18 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Di atas Appetite', key: 'aboveAppetite', width: 15 },
    { header: 'Review Berikutnya', key: 'nextReviewAt', width: 16 },
  ];

  for (const r of risks) {
    ws.addRow({
      code: r.code,
      type: r.type === 'OPPORTUNITY' ? 'Peluang' : 'Ancaman',
      category: r.category,
      unit: r.unit?.name ?? '',
      goal: r.goal,
      identifiedAt: dateOnly(r.identifiedAt),
      description: r.description,
      rootCause: r.rootCause,
      indicator: r.indicator,
      existingControl: r.existingControl,
      qualitativeImpact: r.qualitativeImpact,
      p: r.p,
      i: r.i,
      score: r.score,
      level: LEVEL_LABEL[(r.level as Level) ?? 'LOW'],
      probPct: r.probPct,
      financialImpact: r.financialImpact,
      netValue: r.netValue,
      owner: r.owner?.name ?? '',
      ownerTitle: r.ownerTitle,
      strategy: STRATEGY_LABEL[r.strategy] ?? r.strategy,
      treatment: r.treatment,
      treatmentCost: r.treatmentCost,
      rp: r.rp,
      ri: r.ri,
      scoreRes: r.scoreRes,
      levelRes: LEVEL_LABEL[(r.levelRes as Level) ?? 'LOW'],
      netValueRes: r.netValueRes,
      status: STATUS_LABEL[r.status] ?? r.status,
      aboveAppetite: r.aboveAppetite ? 'Ya' : 'Tidak',
      nextReviewAt: dateOnly(r.nextReviewAt),
    });
  }

  ws.getColumn('probPct').numFmt = '0%';
  styleHeader(ws);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

/** Ekspor versi cetak Risk Register (ringkas, siap dibaca manajemen). */
export async function buildRiskRegisterWorkbook(orgName: string, risks: ExportRisk[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Risk Register');
  ws.addRow([`Risk Register — ${orgName}`]).font = { bold: true, size: 14 };
  ws.addRow([`Diekspor: ${new Date().toLocaleString('id-ID')}`]);
  ws.addRow([]);

  ws.addRow([
    'Kode', 'Kategori', 'Unit', 'Deskripsi', 'P', 'I', 'Skor', 'Tingkat',
    "P'", "I'", 'Skor Res', 'Tingkat Res', 'Nilai Bersih', 'Appetite', 'Status',
  ]).font = { bold: true };

  for (const r of risks) {
    ws.addRow([
      r.code,
      r.category,
      r.unit?.name ?? '',
      r.description,
      r.p,
      r.i,
      r.score,
      LEVEL_LABEL[(r.level as Level) ?? 'LOW'],
      r.rp,
      r.ri,
      r.scoreRes,
      LEVEL_LABEL[(r.levelRes as Level) ?? 'LOW'],
      Math.round(r.netValue),
      r.aboveAppetite ? 'Di atas' : 'Dalam',
      STATUS_LABEL[r.status] ?? r.status,
    ]);
  }
  ws.getColumn(13).numFmt = '#,##0';
  ws.columns.forEach((c) => (c.width = Math.max(12, Math.min(45, c.width ?? 14))));
  return Buffer.from(await wb.xlsx.writeBuffer());
}
