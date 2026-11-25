'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  Plus,
  Trash2,
  TrendingUp,
  Upload,
  X,
} from 'lucide-react';
import { formatDate, formatNumber } from '@/lib/format';

export interface MitigationDTO {
  id: string;
  description: string;
  deadline: string | null;
  status: string;
  owner: string | null;
}

export interface KRIValueDTO {
  id: string;
  period: string;
  value: number;
}

export interface KRIDTO {
  id: string;
  name: string;
  unit: string;
  threshold: number;
  values: KRIValueDTO[];
}

export interface AttachmentDTO {
  id: string;
  name: string;
  mimeType: string;
  path: string;
  size: number;
  uploadedAt: string;
}

async function api(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error?.message ?? 'Permintaan gagal.');
  return json?.data;
}

const STATUS_LABEL: Record<string, string> = {
  TODO: 'Belum',
  IN_PROGRESS: 'Berjalan',
  DONE: 'Selesai',
};

const STATUS_STYLE: Record<string, string> = {
  TODO: 'bg-mist text-muted',
  IN_PROGRESS: 'bg-teal-soft text-teal',
  DONE: 'bg-risk-low/10 text-risk-low',
};

export function RiskMitigations({
  riskId,
  initialData,
  canEdit = false,
}: {
  riskId: string;
  initialData: MitigationDTO[];
  canEdit?: boolean;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialData);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [owner, setOwner] = useState('');

  async function refresh() {
    const data = await api(`/api/v1/risks/${riskId}/mitigations`);
    setItems(data);
    router.refresh();
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy('add');
    setError(null);
    try {
      await api(`/api/v1/risks/${riskId}/mitigations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, deadline: deadline || null, owner: owner || null }),
      });
      setDescription('');
      setDeadline('');
      setOwner('');
      setShowForm(false);
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function cycle(item: MitigationDTO) {
    const next = item.status === 'TODO' ? 'IN_PROGRESS' : item.status === 'IN_PROGRESS' ? 'DONE' : 'TODO';
    setBusy(item.id);
    setError(null);
    try {
      await api(`/api/v1/risks/${riskId}/mitigations/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: next } : i)));
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function remove(item: MitigationDTO) {
    if (!confirm(`Hapus tindakan "${item.description}"?`)) return;
    setBusy(item.id);
    setError(null);
    try {
      await api(`/api/v1/risks/${riskId}/mitigations/${item.id}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-sm font-bold text-navy">Rencana Tindakan</h3>
          <p className="mt-0.5 text-[11px] text-muted">{items.length} tindakan · klik status untuk mengubah</p>
        </div>
        {canEdit && (
          <button type="button" className="btn-secondary btn-sm" onClick={() => setShowForm((v) => !v)}>
            {showForm ? <X size={14} /> : <Plus size={14} />} {showForm ? 'Batal' : 'Tambah'}
          </button>
        )}
      </div>

      {error && <p className="rounded-lg bg-risk-extreme/10 px-3 py-2 text-xs text-risk-extreme">{error}</p>}

      {showForm && canEdit && (
        <form onSubmit={add} className="grid gap-2 rounded-lg border border-line bg-mist/40 p-3">
          <input
            className="input"
            placeholder="Tindakan mitigasi yang akan dilakukan"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            maxLength={500}
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <input className="input" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} aria-label="Tenggat" />
            <input
              className="input"
              placeholder="Penanggung jawab (opsional)"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              maxLength={120}
            />
          </div>
          <button type="submit" className="btn-primary btn-sm justify-self-start" disabled={busy === 'add'}>
            {busy === 'add' ? 'Menyimpan…' : 'Simpan tindakan'}
          </button>
        </form>
      )}

      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
        {items.length === 0 ? (
          <li className="px-4 py-6 text-center text-xs italic text-muted">Belum ada tindakan terencana.</li>
        ) : (
          items.map((item) => (
            <li key={item.id} className="group flex items-start gap-3 px-4 py-3 transition hover:bg-mist/40">
              <button
                type="button"
                onClick={() => canEdit && cycle(item)}
                disabled={!canEdit || busy === item.id}
                title="Ubah status"
                className="mt-0.5 text-muted transition hover:text-teal disabled:opacity-50"
              >
                {item.status === 'DONE' ? <CheckCircle2 size={18} className="text-teal" /> : <Circle size={18} />}
              </button>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${item.status === 'DONE' ? 'text-muted line-through' : 'text-ink'}`}>
                  {item.description}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
                  <span className={`badge ${STATUS_STYLE[item.status] ?? STATUS_STYLE.TODO}`}>{STATUS_LABEL[item.status] ?? item.status}</span>
                  {item.deadline && (
                    <span className="inline-flex items-center gap-1">
                      <Clock size={11} /> {formatDate(item.deadline)}
                    </span>
                  )}
                  {item.owner && <span>{item.owner}</span>}
                </div>
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => remove(item)}
                  disabled={busy === item.id}
                  className="rounded p-1 text-muted opacity-0 transition hover:text-risk-extreme group-hover:opacity-100 disabled:opacity-40"
                  aria-label="Hapus tindakan"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

export function RiskKRI({
  riskId,
  initialData,
  canEdit = false,
}: {
  riskId: string;
  initialData: KRIDTO[];
  canEdit?: boolean;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialData);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [threshold, setThreshold] = useState('');

  async function refresh() {
    const data = await api(`/api/v1/risks/${riskId}/kris`);
    setItems(data);
    router.refresh();
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy('add');
    setError(null);
    try {
      await api(`/api/v1/risks/${riskId}/kris`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, unit, threshold: Number(threshold) }),
      });
      setName('');
      setUnit('');
      setThreshold('');
      setShowForm(false);
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function record(kri: KRIDTO, period: string, value: string) {
    setBusy(kri.id);
    setError(null);
    try {
      await api(`/api/v1/risks/${riskId}/kris/${kri.id}/values`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period, value: Number(value) }),
      });
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function remove(kri: KRIDTO) {
    if (!confirm(`Hapus KRI "${kri.name}" beserta riwayat nilainya?`)) return;
    setBusy(kri.id);
    setError(null);
    try {
      await api(`/api/v1/risks/${riskId}/kris/${kri.id}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((i) => i.id !== kri.id));
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-sm font-bold text-navy">Indikator Risiko (KRI)</h3>
          <p className="mt-0.5 text-[11px] text-muted">Pemantauan berkala dan peringatan dini</p>
        </div>
        {canEdit && (
          <button type="button" className="btn-secondary btn-sm" onClick={() => setShowForm((v) => !v)}>
            {showForm ? <X size={14} /> : <Plus size={14} />} {showForm ? 'Batal' : 'Tambah KRI'}
          </button>
        )}
      </div>

      {error && <p className="rounded-lg bg-risk-extreme/10 px-3 py-2 text-xs text-risk-extreme">{error}</p>}

      {showForm && canEdit && (
        <form onSubmit={add} className="grid gap-2 rounded-lg border border-line bg-mist/40 p-3 sm:grid-cols-[2fr_1fr_1fr_auto]">
          <input className="input" placeholder="Nama indikator" value={name} onChange={(e) => setName(e.target.value)} required maxLength={200} />
          <input className="input" placeholder="Satuan (Jam, %)" value={unit} onChange={(e) => setUnit(e.target.value)} required maxLength={40} />
          <input
            className="input"
            type="number"
            step="any"
            placeholder="Ambang"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            required
          />
          <button type="submit" className="btn-primary btn-sm" disabled={busy === 'add'}>
            {busy === 'add' ? '…' : 'Simpan'}
          </button>
        </form>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {items.length === 0 ? (
          <p className="col-span-full rounded-xl border border-dashed border-line px-4 py-6 text-center text-xs italic text-muted">
            Belum ada indikator risiko yang dipantau.
          </p>
        ) : (
          items.map((kri) => {
            const last = kri.values[kri.values.length - 1];
            const warning = last ? last.value > kri.threshold : false;
            return (
              <div key={kri.id} className="rounded-xl border border-line bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[10px] font-bold uppercase tracking-[0.8px] text-muted">{kri.name}</p>
                    <p className="data-value mt-1 text-xl font-extrabold text-navy">
                      {last ? formatNumber(last.value) : '—'}{' '}
                      <span className="text-[11px] font-medium text-muted">{kri.unit}</span>
                    </p>
                  </div>
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                      warning ? 'bg-risk-extreme/10 text-risk-extreme' : 'bg-teal-soft text-teal'
                    }`}
                  >
                    {warning ? <AlertTriangle size={16} /> : <TrendingUp size={16} />}
                  </span>
                </div>

                <p className={`mt-2 text-[11px] ${warning ? 'font-semibold text-risk-extreme' : 'text-muted'}`}>
                  {warning ? 'Melampaui ambang' : 'Dalam ambang'} · batas {formatNumber(kri.threshold)} {kri.unit}
                </p>

                {canEdit && (
                  <div className="mt-3 flex items-center gap-1.5 border-t border-line pt-3">
                    <input
                      type="month"
                      className="input !py-1.5 text-[11px]"
                      defaultValue={new Date().toISOString().slice(0, 7)}
                      id={`period-${kri.id}`}
                    />
                    <input
                      type="number"
                      step="any"
                      className="input !py-1.5 text-[11px]"
                      placeholder="Nilai"
                      id={`value-${kri.id}`}
                    />
                    <button
                      type="button"
                      className="btn-secondary btn-sm shrink-0"
                      disabled={busy === kri.id}
                      onClick={() => {
                        const p = (document.getElementById(`period-${kri.id}`) as HTMLInputElement)?.value;
                        const v = (document.getElementById(`value-${kri.id}`) as HTMLInputElement)?.value;
                        if (!p || v === '') {
                          setError('Isi periode dan nilai KRI.');
                          return;
                        }
                        void record(kri, p, v);
                      }}
                    >
                      Catat
                    </button>
                    <button
                      type="button"
                      className="ml-auto rounded p-1 text-muted transition hover:text-risk-extreme"
                      onClick={() => remove(kri)}
                      aria-label="Hapus KRI"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}

                {kri.values.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {kri.values.slice(-6).map((v) => (
                      <span key={v.id} className="rounded bg-mist px-1.5 py-0.5 text-[10px] text-muted">
                        {v.period} · {formatNumber(v.value)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export function RiskAttachments({
  riskId,
  initialData,
  canEdit = false,
}: {
  riskId: string;
  initialData: AttachmentDTO[];
  canEdit?: boolean;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialData);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function upload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      await api(`/api/v1/risks/${riskId}/attachments`, { method: 'POST', body: form });
      const data = await api(`/api/v1/risks/${riskId}/attachments`);
      setItems(data);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function remove(item: AttachmentDTO) {
    if (!confirm(`Hapus lampiran "${item.name}"?`)) return;
    setBusy(item.id);
    setError(null);
    try {
      await api(`/api/v1/risks/${riskId}/attachments/${item.id}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-display text-sm font-bold text-navy">Lampiran Bukti</h3>
          <p className="mt-0.5 text-[11px] text-muted">PDF, gambar, atau spreadsheet · maks. 10 MB</p>
        </div>
        {canEdit && (
          <label className={`btn-secondary btn-sm cursor-pointer ${uploading ? 'pointer-events-none opacity-50' : ''}`}>
            <Upload size={14} /> {uploading ? 'Mengunggah…' : 'Unggah File'}
            <input
              type="file"
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.csv,.xls,.xlsx,.docx"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void upload(file);
                e.target.value = '';
              }}
            />
          </label>
        )}
      </div>

      {error && <p className="rounded-lg bg-risk-extreme/10 px-3 py-2 text-xs text-risk-extreme">{error}</p>}

      <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
        {items.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs italic text-muted">Belum ada lampiran.</p>
        ) : (
          items.map((file) => (
            <div key={file.id} className="group flex items-center gap-3 px-4 py-2.5 transition hover:bg-mist/40">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-mist text-muted">
                <FileText size={15} />
              </span>
              <div className="min-w-0 flex-1">
                <a
                  href={file.path}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate text-xs font-semibold text-ink hover:text-teal"
                >
                  {file.name}
                </a>
                <p className="text-[10px] text-muted">
                  {(file.size / 1024).toFixed(1)} KB · {formatDate(file.uploadedAt)}
                </p>
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => remove(file)}
                  disabled={busy === file.id}
                  className="rounded p-1 text-muted opacity-0 transition hover:text-risk-extreme group-hover:opacity-100 disabled:opacity-40"
                  aria-label="Hapus lampiran"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
