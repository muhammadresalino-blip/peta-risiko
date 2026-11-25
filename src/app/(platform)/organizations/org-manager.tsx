'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { formatDate } from '@/lib/format';

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  currency: string;
  isActive: boolean;
  createdAt: string | Date;
  counts: { users: number; units: number; risks: number };
}

const emptyForm = {
  name: '',
  slug: '',
  currency: 'IDR',
  adminName: '',
  adminEmail: '',
  adminPassword: '',
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export function OrgManager({ orgs }: { orgs: OrgRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function createOrg(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);

    const res = await fetch('/api/v1/organizations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    setBusy(false);

    if (!res.ok) {
      setError(json?.error?.message ?? 'Gagal membuat organisasi.');
      return;
    }

    setOpen(false);
    setForm(emptyForm);
    setNotice(`Organisasi "${json.data.name}" dibuat dengan Admin ${json.data.admin.email}.`);
    router.refresh();
  }

  async function toggleActive(org: OrgRow) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/v1/organizations/${org.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !org.isActive }),
    });
    const json = await res.json();
    setBusy(false);

    if (!res.ok) {
      setError(json?.error?.message ?? 'Gagal mengubah status organisasi.');
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {notice && (
        <p className="rounded-lg bg-risk-low/10 px-3 py-2 text-sm text-risk-low ring-1 ring-risk-low/20">{notice}</p>
      )}
      {error && <p className="rounded-lg bg-risk-extreme/10 px-3 py-2 text-sm text-risk-extreme ring-1 ring-risk-extreme/20">{error}</p>}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead className="bg-mist/80">
              <tr>
                <th className="th">Organisasi</th>
                <th className="th text-right">Pengguna</th>
                <th className="th text-right">Unit</th>
                <th className="th text-right">Risiko</th>
                <th className="th">Status</th>
                <th className="th">Dibuat</th>
                <th className="th text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((org) => (
                <tr key={org.id} className="border-t border-line">
                  <td className="td">
                    <p className="font-semibold text-ink">{org.name}</p>
                    <p className="text-xs text-muted">
                      <span className="font-mono">{org.slug}</span> · {org.currency}
                    </p>
                  </td>
                  <td className="td text-right tabular-nums">{org.counts.users}</td>
                  <td className="td text-right tabular-nums">{org.counts.units}</td>
                  <td className="td text-right tabular-nums">{org.counts.risks}</td>
                  <td className="td">
                    <span
                      className={`badge ${
                        org.isActive
                          ? 'bg-risk-low/10 text-risk-low ring-risk-low/20'
                          : 'bg-mist text-muted ring-line'
                      }`}
                    >
                      {org.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="td whitespace-nowrap text-xs text-muted">{formatDate(org.createdAt)}</td>
                  <td className="td text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/platform/compare?orgIds=${org.id}`}
                        className="text-xs font-semibold text-teal hover:text-navy"
                      >
                        Bandingkan
                      </Link>
                      <button
                        className="text-xs font-semibold text-muted hover:text-navy disabled:opacity-50"
                        onClick={() => toggleActive(org)}
                        disabled={busy}
                      >
                        {org.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {orgs.length === 0 && (
                <tr>
                  <td className="td py-8 text-center text-sm text-muted" colSpan={7}>
                    Belum ada organisasi. Tambahkan organisasi pertama.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {open ? (
        <form onSubmit={createOrg} className="rounded-xl border border-teal/20 bg-teal-soft/40 p-4">
          <h2 className="text-sm font-bold text-navy">Organisasi baru</h2>
          <p className="mt-0.5 text-xs text-muted">
            Admin pertama dibuat bersama organisasi dan dapat mengatur BTR, unit, serta pengguna lain.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Nama organisasi</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value, slug: slugify(e.target.value) })}
                required
              />
            </div>
            <div>
              <label className="label">Slug</label>
              <input
                className="input font-mono"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
                minLength={2}
                required
              />
            </div>
            <div>
              <label className="label">Mata uang</label>
              <select
                className="input"
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
              >
                <option value="IDR">IDR</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div />
            <div>
              <label className="label">Nama Admin pertama</label>
              <input
                className="input"
                value={form.adminName}
                onChange={(e) => setForm({ ...form, adminName: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Email Admin</label>
              <input
                type="email"
                className="input"
                value={form.adminEmail}
                onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Kata sandi awal Admin</label>
              <input
                type="text"
                className="input"
                value={form.adminPassword}
                onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                minLength={10}
                required
              />
              <p className="mt-1 text-[11px] text-muted">Minimal 10 karakter; sampaikan lewat saluran aman.</p>
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
              Batal
            </button>
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? 'Menyimpan…' : 'Buat organisasi'}
            </button>
          </div>
        </form>
      ) : (
        <button className="btn-primary" onClick={() => setOpen(true)}>
          + Tambah organisasi
        </button>
      )}
    </div>
  );
}
