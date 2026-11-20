'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { formatRupiah } from '@/lib/format';

interface Settings {
  btr: number;
  totalRevenue: number;
  probPct: Record<string, number>;
  levels: { low: number; medium: number; high: number };
}

export function SettingsForm({ initial }: { initial: Settings }) {
  const router = useRouter();
  const [form, setForm] = useState({
    btr: initial.btr,
    totalRevenue: initial.totalRevenue,
    probPct: { ...initial.probPct },
    levels: { ...initial.levels },
  });
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pct = form.totalRevenue > 0 ? (form.btr / form.totalRevenue) * 100 : 0;

  async function save() {
    setBusy(true);
    setStatus(null);
    setError(null);
    const res = await fetch('/api/v1/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        btr: Number(form.btr),
        totalRevenue: Number(form.totalRevenue),
        probPct: {
          1: Number(form.probPct['1']) / 100,
          2: Number(form.probPct['2']) / 100,
          3: Number(form.probPct['3']) / 100,
          4: Number(form.probPct['4']) / 100,
          5: Number(form.probPct['5']) / 100,
        },
        levels: {
          low: Number(form.levels.low),
          medium: Number(form.levels.medium),
          high: Number(form.levels.high),
        },
      }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(json?.error?.message ?? 'Gagal menyimpan pengaturan.');
      return;
    }
    setStatus('Pengaturan tersimpan. Jalankan hitung ulang agar nilai risiko lama ikut menyesuaikan.');
    router.refresh();
  }

  async function recalculate() {
    if (!confirm('Hitung ulang skor seluruh risiko dengan pengaturan terbaru?')) return;
    setBusy(true);
    setStatus(null);
    setError(null);
    const res = await fetch('/api/v1/settings/recalculate', { method: 'POST' });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(json?.error?.message ?? 'Gagal menghitung ulang.');
      return;
    }
    setStatus(`Selesai: ${json.data.updated} risiko dihitung ulang.`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card-pad space-y-4">
          <h2 className="text-sm font-bold text-navy">Batas toleransi risiko (BTR)</h2>
          <div>
            <label className="label" htmlFor="totalRevenue">
              Total pendapatan (Rp)
            </label>
            <input
              id="totalRevenue"
              type="number"
              min={0}
              className="input"
              value={form.totalRevenue}
              onChange={(e) => setForm({ ...form, totalRevenue: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="label" htmlFor="btr">
              BTR (Rp)
            </label>
            <input
              id="btr"
              type="number"
              min={0}
              className="input"
              value={form.btr}
              onChange={(e) => setForm({ ...form, btr: Number(e.target.value) })}
            />
            <p className="mt-1 text-xs text-muted">
              {formatRupiah(form.btr)} = <strong>{pct.toFixed(2)}%</strong> dari total pendapatan.
            </p>
          </div>
          <div className="rounded-lg bg-mist p-3 text-xs text-[#536174] ring-1 ring-line">
            Dampak finansial = (indeks dampak ÷ 5) × BTR. Indeks 4 berarti 80% dari BTR.
          </div>
        </div>

        <div className="card-pad space-y-4">
          <h2 className="text-sm font-bold text-navy">Probabilitas per indeks</h2>
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="flex items-center gap-3">
              <span className="w-16 text-sm text-[#536174]">Indeks {n}</span>
              <input
                type="number"
                min={0}
                max={100}
                className="input"
                value={Math.round((form.probPct[String(n)] ?? 0) * 100)}
                onChange={(e) =>
                  setForm({ ...form, probPct: { ...form.probPct, [String(n)]: Number(e.target.value) / 100 } })
                }
              />
              <span className="text-sm text-muted">%</span>
            </div>
          ))}
          <div className="rounded-lg bg-mist p-3 text-xs text-[#536174] ring-1 ring-line">
            Nilai bersih = probabilitas (%) × dampak finansial.
          </div>
        </div>
      </div>

      <div className="card-pad space-y-4">
        <h2 className="text-sm font-bold text-navy">Batas tingkat risiko</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label">Low, skor ≤</label>
            <input
              type="number"
              min={1}
              max={24}
              className="input"
              value={form.levels.low}
              onChange={(e) => setForm({ ...form, levels: { ...form.levels, low: Number(e.target.value) } })}
            />
          </div>
          <div>
            <label className="label">Medium, skor ≤</label>
            <input
              type="number"
              min={2}
              max={24}
              className="input"
              value={form.levels.medium}
              onChange={(e) => setForm({ ...form, levels: { ...form.levels, medium: Number(e.target.value) } })}
            />
          </div>
          <div>
            <label className="label">High, skor ≤</label>
            <input
              type="number"
              min={3}
              max={25}
              className="input"
              value={form.levels.high}
              onChange={(e) => setForm({ ...form, levels: { ...form.levels, high: Number(e.target.value) } })}
            />
          </div>
        </div>
        <p className="text-xs text-muted">
          Di atas batas High, skor dikategorikan <strong>Extreme High</strong>. Bawaan: 3 / 6 / 12.
        </p>
      </div>

      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">{error}</p>}
      {status && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-200">{status}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button className="btn-secondary" onClick={recalculate} disabled={busy}>
          Hitung ulang semua risiko
        </button>
        <button className="btn-primary" onClick={save} disabled={busy}>
          {busy ? 'Menyimpan…' : 'Simpan pengaturan'}
        </button>
      </div>
    </div>
  );
}
