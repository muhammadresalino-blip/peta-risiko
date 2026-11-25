'use client';

import { useState } from 'react';
import { ArrowRight, AlertCircle } from 'lucide-react';

export function LoginForm() {
  const [email, setEmail] = useState('admin@petarisiko.local');
  const [password, setPassword] = useState('Admin12345!');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? 'Gagal masuk.');
        return;
      }
      // Navigasi penuh agar cookie sesi HttpOnly langsung dipakai server.
      // router.replace + router.refresh dapat saling membatalkan di App Router.
      window.location.assign('/dashboard');
      return;
    } catch {
      setError('Tidak dapat menghubungi server.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="password">
          Kata sandi
        </label>
        <input
          id="password"
          type="password"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
      </div>

      {error && (
        <p className="flex items-start gap-2 rounded-lg bg-risk-extreme/10 px-3 py-2 text-xs text-risk-extreme ring-1 ring-risk-extreme/20">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}

      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? 'Memproses…' : 'Masuk'}
        {!loading && <ArrowRight size={15} />}
      </button>

      <div className="rounded-lg bg-mist p-3 text-[11px] leading-relaxed text-muted">
        <p className="font-bold text-ink">Akun demo (sandi: Admin12345!)</p>
        <p className="mt-0.5">
          admin@petarisiko.local · owner@petarisiko.local · reviewer@petarisiko.local · viewer@petarisiko.local
        </p>
      </div>
    </form>
  );
}
