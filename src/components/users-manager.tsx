'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ROLE_LABEL } from '@/lib/format';

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  unitId: string | null;
  isActive: boolean;
}

const ROLES = ['ADMIN', 'RISK_OWNER', 'REVIEWER', 'VIEWER'];

export function UsersManager({ users, units }: { users: UserRow[]; units: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'RISK_OWNER', unitId: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch('/api/v1/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, unitId: form.unitId || null }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(json?.error?.message ?? 'Gagal menambah pengguna.');
      return;
    }
    setOpen(false);
    setForm({ name: '', email: '', password: '', role: 'RISK_OWNER', unitId: '' });
    router.refresh();
  }

  async function patch(id: string, data: Record<string, unknown>) {
    setBusy(true);
    await fetch(`/api/v1/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr className="border-b border-line">
              <th className="th">Nama</th>
              <th className="th">Email</th>
              <th className="th">Peran</th>
              <th className="th">Unit</th>
              <th className="th">Status</th>
              <th className="th text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-slate-50 last:border-0">
                <td className="td font-medium text-ink">{u.name}</td>
                <td className="td text-[#536174]">{u.email}</td>
                <td className="td">
                  <select
                    className="rounded-md border border-[#d8e0e8] bg-white px-2 py-1 text-xs"
                    value={u.role}
                    onChange={(e) => patch(u.id, { role: e.target.value })}
                    disabled={busy}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="td">
                  <select
                    className="rounded-md border border-[#d8e0e8] bg-white px-2 py-1 text-xs"
                    value={u.unitId ?? ''}
                    onChange={(e) => patch(u.id, { unitId: e.target.value || null })}
                    disabled={busy}
                  >
                    <option value="">—</option>
                    {units.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="td">
                  <span className={`badge ${u.isActive ? 'bg-emerald-100 text-emerald-700 ring-emerald-200' : 'bg-[#f0f2f5] text-muted ring-line'}`}>
                    {u.isActive ? 'Aktif' : 'Nonaktif'}
                  </span>
                </td>
                <td className="td text-right">
                  <button
                    className="text-xs font-semibold text-[#536174] hover:text-navy"
                    onClick={() => patch(u.id, { isActive: !u.isActive })}
                    disabled={busy}
                  >
                    {u.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open ? (
        <form onSubmit={createUser} className="rounded-xl border border-[#cfe4e2] bg-teal-soft/40 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Nama</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <label className="label">Kata sandi awal</label>
              <input
                type="text"
                className="input"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                minLength={10}
                required
              />
              <p className="mt-1 text-[11px] text-muted">Minimal 10 karakter; minta pengguna menggantinya.</p>
            </div>
            <div>
              <label className="label">Peran</label>
              <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Unit kerja</label>
              <select className="input" value={form.unitId} onChange={(e) => setForm({ ...form, unitId: e.target.value })}>
                <option value="">—</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
              Batal
            </button>
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? 'Menyimpan…' : 'Tambah pengguna'}
            </button>
          </div>
        </form>
      ) : (
        <button className="btn-primary" onClick={() => setOpen(true)}>
          + Tambah pengguna
        </button>
      )}
    </div>
  );
}
