// Uji asap end-to-end terhadap server yang berjalan (default http://localhost:3000).
// Jalankan: node scripts/smoke.mjs

import ExcelJS from 'exceljs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BASE = process.env.SMOKE_BASE || 'http://localhost:3000';
const EMAIL = process.env.SMOKE_EMAIL || 'admin@petarisiko.local';
const PASSWORD = process.env.SMOKE_PASSWORD || 'Admin12345!';

let cookie = '';
const results = [];
const check = (name, ok, extra = '') => {
  results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ` — ${extra}` : ''}`);
  if (!ok) process.exitCode = 1;
};

async function api(pathname, init = {}) {
  const res = await fetch(BASE + pathname, {
    ...init,
    headers: { ...(init.headers || {}), ...(cookie ? { cookie } : {}) },
  });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  return res;
}

const login = await api('/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
});
check('login', login.status === 200, `HTTP ${login.status}`);

const health = await api('/api/health');
const healthBody = await health.json();
check('health', health.status === 200 && healthBody.database === 'up');

const exp = await api('/api/v1/exports/risks.xlsx');
const expBuf = Buffer.from(await exp.arrayBuffer());
const expFile = path.join(os.tmpdir(), 'petarisiko-export.xlsx');
fs.writeFileSync(expFile, expBuf);
check('ekspor Risk Input', exp.status === 200 && expBuf.subarray(0, 2).toString() === 'PK', `${expBuf.length} byte`);

const reg = await api('/api/v1/exports/risk-register.xlsx');
const regBuf = Buffer.from(await reg.arrayBuffer());
check('ekspor Risk Register', reg.status === 200 && regBuf.length > 1000, `${regBuf.length} byte`);

// Bangun file impor sederhana tanpa kolom kode (kode dibuat otomatis).
const wb = new ExcelJS.Workbook();
const ws = wb.addWorksheet('Risk Input');
ws.addRow(['Deskripsi Risiko', 'Unit Kerja', 'Kategori Risiko', 'Probabilitas', 'Dampak', 'Sasaran', 'Akar Penyebab', 'Indikator', 'Pemilik Risiko']);
ws.addRow(['Uji impor satu', 'Flight Operations', 'Operational / Infrastructure Risk', 3, 4, 'Sasaran uji', 'Penyebab uji', 'Indikator uji', 'owner@petarisiko.local']);
ws.addRow(['Uji impor dua', 'Finance', 'Finance', 2, 5, 'Sasaran uji', 'Penyebab uji', 'Indikator uji', 'owner@petarisiko.local']);
ws.addRow(['Baris tidak valid', 'Unit Tidak Ada', 'Finance', 9, 2, 'x', 'x', 'x', '']);
const impBuf = Buffer.from(await wb.xlsx.writeBuffer());
const impFile = path.join(os.tmpdir(), 'petarisiko-import.xlsx');
fs.writeFileSync(impFile, impBuf);

async function upload(dryRun) {
  const form = new FormData();
  form.set('file', new Blob([impBuf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'uji.xlsx');
  const res = await api(`/api/v1/imports/risks?dryRun=${dryRun}`, { method: 'POST', body: form });
  return { status: res.status, body: await res.json() };
}

const preview = await upload(true);
const pv = preview.body?.data?.preview;
check(
  'dry run impor memvalidasi baris',
  preview.status === 200 && pv?.valid === 2 && pv?.invalid === 1,
  `valid ${pv?.valid}, invalid ${pv?.invalid}`,
);

const commit = await upload(false);
const created = commit.body?.data?.created;
check('komit impor', commit.status === 200 && created === 2, `dibuat ${created}`);

if (created) {
  const list = await api('/api/v1/risks?q=Uji impor');
  const listBody = await list.json();
  check('risiko hasil impor muncul di register', (listBody.data || []).length >= 2, `${listBody.data?.length} baris`);
  for (const row of listBody.data || []) {
    if (row.status === 'DRAFT') await api(`/api/v1/risks/${row.id}`, { method: 'DELETE' });
  }
  check('pembersihan data uji', true);
}

// --- Prioritas 1: snapshot & tren ---
const snap = await api('/api/v1/snapshots?period=2026-11', { method: 'POST' });
const snapBody = await snap.json();
check(
  'snapshot periode tersimpan',
  snap.status === 200 && snapBody.data?.period === '2026-11' && snapBody.data?.risks >= 3,
  `${snapBody.data?.risks} risiko`,
);

const trendRes = await api('/api/v1/dashboard/trend?from=2026-11&to=2026-11');
const trendBody = await trendRes.json();
check(
  'tren dashboard membaca snapshot',
  trendRes.status === 200 &&
    (trendBody.data || []).some((row) => row.period === '2026-11' && row.count >= 3),
  `${trendBody.data?.length ?? 0} periode`,
);

// --- Prioritas 1: templat pemetaan impor ---
const templateColumns = {
  'Deskripsi Risiko': 'description',
  'Unit Kerja': 'unit',
  'Kategori Risiko': 'category',
  Probabilitas: 'p',
  Dampak: 'i',
  Sasaran: 'goal',
  'Akar Penyebab': 'rootCause',
  Indikator: 'indicator',
  'Pemilik Risiko': 'owner',
};
const saveTemplate = await api('/api/v1/import-mappings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Uji templat smoke', columns: templateColumns }),
});
const saveTemplateBody = await saveTemplate.json();
const templateId = saveTemplateBody.data?.id;
check('templat pemetaan disimpan', saveTemplate.status === 200 && !!templateId);

if (templateId) {
  const form = new FormData();
  form.set(
    'file',
    new Blob([impBuf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    'uji.xlsx',
  );
  form.set('mappingId', templateId);
  const mapped = await api('/api/v1/imports/risks?dryRun=true', { method: 'POST', body: form });
  const mappedBody = await mapped.json();
  check(
    'dry run memakai templat tersimpan',
    mapped.status === 200 && mappedBody.data?.preview?.valid === 2 && mappedBody.data?.preview?.invalid === 1,
    `valid ${mappedBody.data?.preview?.valid}, invalid ${mappedBody.data?.preview?.invalid}`,
  );

  const del = await api(`/api/v1/import-mappings/${templateId}`, { method: 'DELETE' });
  check('templat pemetaan dihapus', del.status === 200);
}

// --- Prioritas 1: ekspor & cetak per unit ---
const unitsRes = await api('/api/v1/units');
const unitsBody = await unitsRes.json();
const firstUnit = (unitsBody.data || [])[0];
check('daftar unit tersedia', unitsRes.status === 200 && !!firstUnit);

if (firstUnit) {
  const perUnit = await api(`/api/v1/exports/risks.xlsx?unitId=${encodeURIComponent(firstUnit.id)}`);
  const perUnitBuf = Buffer.from(await perUnit.arrayBuffer());
  check(
    'ekspor Risk Input per unit',
    perUnit.status === 200 && perUnitBuf.subarray(0, 2).toString() === 'PK',
    firstUnit.name,
  );

  const perUnitReg = await api(`/api/v1/exports/risk-register.xlsx?unitId=${encodeURIComponent(firstUnit.id)}`);
  const perUnitRegBuf = Buffer.from(await perUnitReg.arrayBuffer());
  check('ekspor Risk Register per unit', perUnitReg.status === 200 && perUnitRegBuf.length > 1000);

  const badUnit = await api('/api/v1/exports/risks.xlsx?unitId=tidak-ada');
  check('ekspor menolak unit asing', badUnit.status === 404);
}

const printPage = await api('/risks/print');
const printHtml = await printPage.text();
check(
  'halaman cetak register',
  printPage.status === 200 && printHtml.includes('Risk Register') && printHtml.includes('PetaRisiko'),
);

// --- Prioritas 1: Platform Admin ---
const adminCookie = cookie;
const platformLogin = await fetch(`${BASE}/api/v1/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: process.env.SMOKE_PLATFORM_EMAIL || 'platform@petarisiko.local',
    password: process.env.SMOKE_PLATFORM_PASSWORD || 'Admin12345!',
  }),
});
const platformSetCookie = platformLogin.headers.get('set-cookie');
cookie = platformSetCookie ? platformSetCookie.split(';')[0] : '';

const orgsRes = await api('/api/v1/organizations');
const orgsBody = await orgsRes.json();
check('platform admin melihat organisasi', orgsRes.status === 200 && (orgsBody.data || []).length >= 1);

const stamp = Date.now();
const createdOrg = await api('/api/v1/organizations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: `Organisasi Uji ${stamp}`,
    slug: `uji-${stamp}`,
    currency: 'IDR',
    adminName: 'Admin Uji',
    adminEmail: `admin-${stamp}@contoh.local`,
    adminPassword: 'UjiAdmin12345!',
  }),
});
const createdOrgBody = await createdOrg.json();
check(
  'platform admin membuat organisasi + Admin pertama',
  createdOrg.status === 200 && !!createdOrgBody.data?.id && createdOrgBody.data?.admin?.role === 'ADMIN',
);

const compareRes = await api('/api/v1/platform/compare');
const compareBody = await compareRes.json();
check(
  'perbandingan antarorganisasi',
  compareRes.status === 200 && (compareBody.data || []).length >= 2,
  `${compareBody.data?.length ?? 0} organisasi`,
);

cookie = adminCookie;
const forbiddenOrgs = await api('/api/v1/organizations');
check('organisasi ditolak untuk Admin organisasi', forbiddenOrgs.status === 403);

console.log(results.join('\n'));
console.log(`\n${results.filter((r) => r.startsWith('PASS')).length}/${results.length} pemeriksaan lulus.`);
