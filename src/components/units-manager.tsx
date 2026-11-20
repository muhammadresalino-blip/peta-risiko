'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface UnitRow {
  id: string;
  name: string;
  kind: string;
  _count: { risks: number; users: number };
}

export function UnitsManager({ units }: { units: UnitRow[] }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [kind, setKind] = useState('HEAD_OFFICE');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch('/api/v1/units', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, kind }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(json?.error?.message ?? 'Gagal menambah unit.');
      return;
    }
    setName('');
    router.refresh();
  }

  async function remove(unit: UnitRow) {
    if (!confirm(`Hapus unit "${unit.name}"?`)) return;
    setBusy(true);
    const res = await fetch(`/api/v1/units/${unit.id}`, { method: 'DELETE' });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(json?.error?.message ?? 'Gagal menghapus unit.');
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px]">
          <thead>
            <tr className="border-b border-line">
              <th className="th">Unit kerja</th>
              <th className="th">Tipe</th>
              <th className="th text-center">Risiko</th>
              <th className="th text-center">Pengguna</th>
              <th className="th text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {units.map((u) => (
              <tr key={u.id} className="border-b border-slate-50 last:border-0">
                <td className="td font-medium text-ink">{u.name}</td>
                <td className="td text-[#536174]">{u.kind === 'BRANCH' ? 'Branch Office' : 'Head Office'}</td>
                <td className="td text-center tabular-nums">{u._count.risks}</td>
                <td className="td text-center tabular-nums">{u._count.users}</td>
                <td className="td text-right">
                  <button
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 disabled:opacity-40"
                    onClick={() => remove(u)}
                    disabled={busy}
                  >
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form onSubmit={add} className="flex flex-wrap items-end gap-3 rounded-xl border border-line bg-mist p-4">
        <div className="min-w-[220px] flex-1">
          <label className="label" htmlFor="unit-name">
            Nama unit baru
          </label>
          <input id="unit-name" className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="unit-kind">
            Tipe
          </label>
          <select id="unit-kind" className="input" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="HEAD_OFFICE">Head Office</option>
            <option value="BRANCH">Branch Office</option>
          </select>
        </div>
        <button type="submit" className="btn-primary" disabled={busy}>
          Tambah unit
        </button>
        {error && <p className="w-full text-xs text-rose-600">{error}</p>}
      </form>
    </div>
  );
}
