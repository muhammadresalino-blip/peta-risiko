'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function SnapshotButton({ canCreate }: { canCreate: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!canCreate) return null;

  async function takeSnapshot() {
    setBusy(true);
    setMessage(null);
    setError(null);

    const res = await fetch('/api/v1/snapshots', { method: 'POST' });
    const json = await res.json();
    setBusy(false);

    if (!res.ok) {
      setError(json?.error?.message ?? 'Gagal membuat snapshot.');
      return;
    }

    setMessage(`Snapshot ${json.data.period} tersimpan untuk ${json.data.risks} risiko aktif.`);
    router.refresh();
  }

  return (
    <div className="text-right">
      <button className="btn-secondary btn-sm" onClick={takeSnapshot} disabled={busy}>
        {busy ? 'Menyimpanâ€¦' : 'Ambil snapshot'}
      </button>
      {message && <p className="mt-1 text-[11px] font-medium text-emerald-600">{message}</p>}
      {error && <p className="mt-1 text-[11px] font-medium text-rose-600">{error}</p>}
    </div>
  );
}
