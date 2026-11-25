'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

interface PreviewRow {
  rowNumber: number;
  ok: boolean;
  errors: string[];
  data: { code: string; unit: string; category: string; description: string; p: number; i: number; score: number; level: string };
}

interface Preview {
  total: number;
  valid: number;
  invalid: number;
  rows: PreviewRow[];
}

interface MappingTemplate {
  id: string;
  name: string;
  columns: Record<string, string>;
}

const FIELDS: { key: string; label: string }[] = [
  { key: '', label: '— abaikan —' },
  { key: 'code', label: 'Kode risiko' },
  { key: 'type', label: 'Tipe' },
  { key: 'category', label: 'Kategori' },
  { key: 'unit', label: 'Unit kerja' },
  { key: 'goal', label: 'Sasaran' },
  { key: 'identifiedAt', label: 'Tanggal identifikasi' },
  { key: 'description', label: 'Deskripsi' },
  { key: 'rootCause', label: 'Akar penyebab' },
  { key: 'indicator', label: 'Indikator' },
  { key: 'existingControl', label: 'Internal control' },
  { key: 'qualitativeImpact', label: 'Dampak kualitatif' },
  { key: 'p', label: 'Probabilitas (P)' },
  { key: 'i', label: 'Dampak (I)' },
  { key: 'strategy', label: 'Strategi' },
  { key: 'treatment', label: 'Rencana penanganan' },
  { key: 'treatmentCost', label: 'Biaya penanganan' },
  { key: 'rp', label: "Probabilitas residual (P')" },
  { key: 'ri', label: "Dampak residual (I')" },
  { key: 'owner', label: 'Pemilik (email/nama)' },
  { key: 'ownerTitle', label: 'Jabatan pemilik' },
  { key: 'nextReviewAt', label: 'Review berikutnya' },
];

export function ImportWizard({
  categories,
  templates: initialTemplates,
}: {
  categories: { name: string }[];
  templates: MappingTemplate[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<Preview | null>(null);
  const [fallbackCategory, setFallbackCategory] = useState(categories[0]?.name ?? '');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ created: number; failed: number } | null>(null);
  const [templates, setTemplates] = useState<MappingTemplate[]>(initialTemplates);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [templateMessage, setTemplateMessage] = useState<string | null>(null);

  async function send(dryRun: boolean, map: Record<string, string> | null, mappingId?: string) {
    if (!file) {
      setError('Pilih file Excel terlebih dahulu.');
      return;
    }
    setBusy(dryRun ? 'preview' : 'commit');
    setError(null);
    const form = new FormData();
    form.set('file', file);
    form.set('fallbackCategory', fallbackCategory);
    if (map) form.set('mapping', JSON.stringify(map));
    else if (mappingId) form.set('mappingId', mappingId);

    const res = await fetch(`/api/v1/imports/risks?dryRun=${dryRun}`, { method: 'POST', body: form });
    const json = await res.json();
    setBusy(null);

    if (!res.ok) {
      setError(json?.error?.message ?? 'Gagal memproses file.');
      return;
    }
    if (dryRun) {
      setHeaders(json.data.headers);
      setMapping(json.data.mapping);
      setPreview(json.data.preview);
    } else {
      setDone({ created: json.data.created, failed: json.data.failed });
      router.refresh();
    }
  }

  function chooseTemplate(id: string) {
    setSelectedTemplate(id);
    setTemplateMessage(null);
    setError(null);
    // Pemetaan manual dibuang agar server memakai templat tersimpan.
    setMapping({});
    setPreview(null);
  }

  async function saveTemplate() {
    const name = templateName.trim();
    if (!name) {
      setError('Nama templat wajib diisi.');
      return;
    }
    if (!Object.keys(mapping).length) {
      setError('Jalankan dry run terlebih dahulu agar pemetaan kolom tersedia.');
      return;
    }

    setBusy('template');
    setError(null);
    const res = await fetch('/api/v1/import-mappings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, columns: mapping }),
    });
    const json = await res.json();
    setBusy(null);

    if (!res.ok) {
      setError(json?.error?.message ?? 'Gagal menyimpan templat.');
      return;
    }

    const saved = json.data as MappingTemplate;
    setTemplates((prev) =>
      [...prev.filter((t) => t.id !== saved.id), saved].sort((a, b) => a.name.localeCompare(b.name)),
    );
    setSelectedTemplate(saved.id);
    setTemplateName('');
    setTemplateMessage(`Templat "${saved.name}" disimpan dan siap dipakai ulang.`);
  }

  async function deleteTemplate() {
    if (!selectedTemplate) return;
    const target = templates.find((t) => t.id === selectedTemplate);
    if (!target) return;
    if (!window.confirm(`Hapus templat "${target.name}"?`)) return;

    setBusy('template');
    setError(null);
    const res = await fetch(`/api/v1/import-mappings/${selectedTemplate}`, { method: 'DELETE' });
    const json = await res.json();
    setBusy(null);

    if (!res.ok) {
      setError(json?.error?.message ?? 'Gagal menghapus templat.');
      return;
    }

    setTemplates((prev) => prev.filter((t) => t.id !== selectedTemplate));
    setSelectedTemplate('');
    setTemplateMessage(`Templat "${target.name}" dihapus.`);
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-dashed border-line bg-mist p-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[240px] flex-1">
            <label className="label" htmlFor="file">
              File Excel (.xlsx / .xlsm, maks. 5 MB)
            </label>
            <input
              id="file"
              ref={fileRef}
              type="file"
              accept=".xlsx,.xlsm"
              className="input !py-1.5 file:mr-3 file:rounded-md file:border-0 file:bg-navy file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                setHeaders([]);
                setMapping({});
                setPreview(null);
                setDone(null);
                setTemplateMessage(null);
              }}
            />
          </div>
          <div className="min-w-[200px]">
            <label className="label" htmlFor="template">
              Templat pemetaan
            </label>
            <select
              id="template"
              className="input"
              value={selectedTemplate}
              onChange={(e) => chooseTemplate(e.target.value)}
            >
              <option value="">— auto-deteksi —</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="fallbackCategory">
              Kategori cadangan
            </label>
            <select
              id="fallbackCategory"
              className="input"
              value={fallbackCategory}
              onChange={(e) => setFallbackCategory(e.target.value)}
            >
              <option value="">—</option>
              {categories.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <button
            className="btn-primary"
            onClick={() =>
              send(
                true,
                Object.keys(mapping).length ? mapping : null,
                selectedTemplate || undefined,
              )
            }
            disabled={busy !== null}
          >
            {busy === 'preview' ? 'Memeriksa…' : 'Jalankan dry run'}
          </button>
          <a className="btn-secondary" href="/api/v1/imports/risks">
            ⇩ Templat
          </a>
        </div>
        <p className="mt-3 text-xs text-muted">
          Dry run memvalidasi tipe data, P dan I (1–5), unit dan kategori yang dikenal, serta kode ganda — sebelum ada data disimpan.
        </p>
      </div>

      {error && <p className="rounded-lg bg-risk-extreme/10 px-3 py-2 text-sm text-risk-extreme ring-1 ring-risk-extreme/20">{error}</p>}

      {done && (
        <div className="rounded-lg bg-risk-low/10 px-4 py-3 text-sm text-risk-low ring-1 ring-risk-low/20">
          <p className="font-semibold">Impor selesai: {done.created} risiko dibuat sebagai Draft.</p>
          <p className="mt-1 text-xs">
            {done.failed > 0 ? `${done.failed} baris dilewati karena error.` : 'Semua baris berhasil disimpan.'}{' '}
            <Link href="/risks" className="font-semibold underline">
              Lihat register
            </Link>
          </p>
        </div>
      )}

      {headers.length > 0 && (
        <div className="card">
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-sm font-bold text-navy">Pemetaan kolom</h2>
            <p className="text-xs text-muted">
              Cocokkan setiap kolom file dengan field risiko. Pemetaan otomatis bisa disesuaikan.
            </p>
          </div>
          <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {headers.map((h) => (
              <div key={h}>
                <label className="label">{h}</label>
                <select
                  className="input"
                  value={mapping[h] ?? ''}
                  onChange={(e) => {
                    setMapping({ ...mapping, [h]: e.target.value });
                    setSelectedTemplate('');
                    setTemplateMessage(null);
                  }}
                >
                  {FIELDS.map((f) => (
                    <option key={f.key || 'none'} value={f.key}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div className="border-t border-line px-5 py-3">
            <div className="flex flex-wrap items-end justify-end gap-2">
              <div className="mr-auto min-w-[220px] flex-1">
                <label className="label" htmlFor="templateName">
                  Simpan pemetaan sebagai templat
                </label>
                <input
                  id="templateName"
                  className="input"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="mis. Format Risk Input 2026"
                />
              </div>
              <button className="btn-secondary" onClick={saveTemplate} disabled={busy !== null}>
                {busy === 'template' ? 'Menyimpan…' : 'Simpan templat'}
              </button>
              {selectedTemplate && (
                <button
                  className="btn-ghost !px-2.5 text-risk-extreme hover:bg-risk-extreme/10"
                  onClick={deleteTemplate}
                  disabled={busy !== null}
                >
                  Hapus templat
                </button>
              )}
              <button className="btn-primary" onClick={() => send(true, mapping)} disabled={busy !== null}>
                Perbarui pratinjau
              </button>
            </div>
            {templateMessage && <p className="mt-2 text-xs font-medium text-risk-low">{templateMessage}</p>}
          </div>
        </div>
      )}

      {preview && (
        <div className="card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
            <div>
              <h2 className="text-sm font-bold text-navy">Hasil validasi (dry run)</h2>
              <p className="text-xs text-muted">
                {preview.total} baris · {preview.valid} valid · {preview.invalid} error
              </p>
            </div>
            <button
              className="btn-primary"
              disabled={preview.valid === 0 || busy !== null}
              onClick={() => send(false, mapping)}
            >
              {busy === 'commit' ? 'Menyimpan…' : `Simpan ${preview.valid} baris valid`}
            </button>
          </div>

          <div className="max-h-[420px] overflow-auto">
            <table className="w-full min-w-[760px]">
              <thead className="sticky top-0 bg-mist">
                <tr>
                  <th className="th">Baris</th>
                  <th className="th">Status</th>
                  <th className="th">Kode</th>
                  <th className="th">Unit</th>
                  <th className="th">Deskripsi</th>
                  <th className="th">P × I</th>
                  <th className="th">Catatan</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r) => (
                  <tr key={r.rowNumber} className="border-b border-line/60 last:border-0 align-top">
                    <td className="td text-muted">{r.rowNumber}</td>
                    <td className="td">
                      <span
                        className={`badge ${
                          r.ok ? 'bg-risk-low/10 text-risk-low ring-risk-low/20' : 'bg-risk-extreme/10 text-risk-extreme ring-risk-extreme/20'
                        }`}
                      >
                        {r.ok ? 'Valid' : 'Error'}
                      </span>
                    </td>
                    <td className="td font-mono text-xs">{r.data.code || '—'}</td>
                    <td className="td text-xs">{r.data.unit || '—'}</td>
                    <td className="td max-w-xs truncate text-xs">{r.data.description || '—'}</td>
                    <td className="td text-xs tabular-nums">
                      {r.data.p && r.data.i ? `${r.data.p} × ${r.data.i} = ${r.data.score}` : '—'}
                    </td>
                    <td className="td text-xs text-risk-extreme">{r.errors.join(' ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
