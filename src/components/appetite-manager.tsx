'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Appetite {
  id: string;
  category: string;
  unitId: string | null;
  maxScore: number;
  note: string | null;
}

export function AppetiteManager({
  appetites,
  units,
  categories,
  canManage,
}: {
  appetites: Appetite[];
  units: { id: string; name: string }[];
  categories: { name: string }[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Appetite | 'new' | null>(null);
  const [form, setForm] = useState({ category: categories[0]?.name ?? '', unitId: '', maxScore: 6, note: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function openNew() {
    setForm({ category: categories[0]?.name ?? '', unitId: '', maxScore: 6, note: '' });
    setEditing('new');
    setError(null);
  }

  function openEdit(a: Appetite) {
    setForm({ category: a.category, unitId: a.unitId ?? '', maxScore: a.maxScore, note: a.note ?? '' });
    setEditing(a);
    setError(null);
  }

  async function save() {
    setBusy(true);
    setError(null);
    const editingId = editing && editing !== 'new' ? editing.id : undefined;
    const res = await fetch(editingId ? `/api/v1/appetites/${editingId}` : '/api/v1/appetites', {
      method: editingId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: form.category,
        unitId: form.unitId || null,
        maxScore: Number(form.maxScore),
        note: form.note || null,
      }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(json?.error?.message ?? 'Gagal menyimpan appetite.');
      return;
    }
    setEditing(null);
    router.refresh();
  }

  async function remove(a: Appetite) {
    if (!confirm(`Hapus appetite untuk ${a.category}?`)) return;
    setBusy(true);
    await fetch(`/api/v1/appetites/${a.id}`, { method: 'DELETE' });
    setBusy(false);
    router.refresh();
  }

  const unitName = (id: string | null) => (id ? units.find((u) => u.id === id)?.name ?? '—' : 'Semua unit');

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-line">
              <th className="th">Kategori</th>
              <th className="th">Berlaku untuk</th>
              <th className="th text-center">Batas skor residual</th>
              <th className="th">Catatan</th>
              {canManage && <th className="th text-right">Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {appetites.length === 0 && (
              <tr>
                <td className="td text-muted" colSpan={canManage ? 5 : 4}>
                  Belum ada Risk Appetite. Risiko tanpa batas tidak akan ditandai di atas appetite.
                </td>
              </tr>
            )}
            {appetites.map((a) => (
              <tr key={a.id} className="border-b border-line/60 last:border-0">
                <td className="td font-medium text-ink">{a.category}</td>
                <td className="td text-muted">{unitName(a.unitId)}</td>
                <td className="td text-center">
                  <span className="badge bg-mist text-ink ring-line">≤ {a.maxScore}</span>
                </td>
                <td className="td text-muted">{a.note ?? '—'}</td>
                {canManage && (
                  <td className="td text-right">
                    <button className="text-xs font-semibold text-teal hover:text-navy" onClick={() => openEdit(a)}>
                      Ubah
                    </button>
                    <span className="mx-2 text-line">|</span>
                    <button className="text-xs font-semibold text-risk-extreme hover:text-risk-extreme/80" onClick={() => remove(a)} disabled={busy}>
                      Hapus
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canManage && (
        <div>
          {editing ? (
            <div className="rounded-xl border border-teal/20 bg-teal-soft/50 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label">Kategori</label>
                  <select
                    className="input"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    {categories.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Berlaku untuk</label>
                  <select className="input" value={form.unitId} onChange={(e) => setForm({ ...form, unitId: e.target.value })}>
                    <option value="">Semua unit (umum)</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Batas skor residual</label>
                  <input
                    type="number"
                    min={1}
                    max={25}
                    className="input"
                    value={form.maxScore}
                    onChange={(e) => setForm({ ...form, maxScore: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="label">Catatan (opsional)</label>
                  <input className="input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
                </div>
              </div>
              {error && <p className="mt-2 text-xs text-risk-extreme">{error}</p>}
              <div className="mt-3 flex justify-end gap-2">
                <button className="btn-secondary" onClick={() => setEditing(null)}>
                  Batal
                </button>
                <button className="btn-primary" onClick={save} disabled={busy}>
                  {busy ? 'Menyimpan…' : 'Simpan'}
                </button>
              </div>
            </div>
          ) : (
            <button className="btn-primary" onClick={openNew}>
              + Tambah batas appetite
            </button>
          )}
        </div>
      )}
    </div>
  );
}
