'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Props {
  riskId: string;
  status: string;
  canSubmit: boolean;
  canApprove: boolean;
  canRetire: boolean;
  canReview: boolean;
  canDelete: boolean;
  canEdit: boolean;
  scoreRes: number;
  rp: number;
  ri: number;
}

export function RiskActions(props: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [panel, setPanel] = useState<'reject' | 'review' | null>(null);
  const [note, setNote] = useState('');
  const [rp, setRp] = useState(props.rp);
  const [ri, setRi] = useState(props.ri);

  async function act(kind: 'submit' | 'approve' | 'retire' | 'delete', body?: unknown) {
    if (kind === 'delete' && !confirm('Hapus risiko Draft ini? Tindakan tidak bisa dibatalkan.')) return;
    setBusy(kind);
    setError(null);
    try {
      const res = await fetch(kind === 'delete' ? `/api/v1/risks/${props.riskId}` : `/api/v1/risks/${props.riskId}/${kind}`, {
        method: kind === 'delete' ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: kind === 'delete' ? undefined : JSON.stringify(body ?? {}),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? 'Aksi gagal.');
        return;
      }
      if (kind === 'delete') {
        router.push('/risks');
      } else {
        setPanel(null);
        setNote('');
        router.refresh();
      }
    } catch {
      setError('Tidak dapat menghubungi server.');
    } finally {
      setBusy(null);
    }
  }

  async function submitReject() {
    if (!note.trim()) {
      setError('Alasan penolakan wajib diisi.');
      return;
    }
    setBusy('reject');
    setError(null);
    const res = await fetch(`/api/v1/risks/${props.riskId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    });
    const json = await res.json();
    setBusy(null);
    if (!res.ok) {
      setError(json?.error?.message ?? 'Gagal menolak risiko.');
      return;
    }
    setPanel(null);
    setNote('');
    router.refresh();
  }

  async function submitReview() {
    if (!note.trim()) {
      setError('Catatan kajian wajib diisi.');
      return;
    }
    setBusy('review');
    setError(null);
    const res = await fetch(`/api/v1/risks/${props.riskId}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note, rpAfter: rp, riAfter: ri }),
    });
    const json = await res.json();
    setBusy(null);
    if (!res.ok) {
      setError(json?.error?.message ?? 'Gagal menyimpan kajian.');
      return;
    }
    setPanel(null);
    setNote('');
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {props.canEdit && (
          <a href={`/risks/${props.riskId}/edit`} className="btn-secondary">
            Ubah
          </a>
        )}
        {props.canSubmit && (props.status === 'DRAFT' || props.status === 'ACTIVE') && (
          <button className="btn-primary" onClick={() => act('submit')} disabled={busy !== null}>
            {busy === 'submit' ? 'Mengajukan…' : props.status === 'ACTIVE' ? 'Ajukan ulang' : 'Ajukan'}
          </button>
        )}
        {props.canApprove && props.status === 'SUBMITTED' && (
          <>
            <button className="btn-primary" onClick={() => act('approve')} disabled={busy !== null}>
              {busy === 'approve' ? 'Menyetujui…' : 'Setujui'}
            </button>
            <button className="btn-danger" onClick={() => setPanel(panel === 'reject' ? null : 'reject')} disabled={busy !== null}>
              Tolak
            </button>
          </>
        )}
        {props.canReview && props.status === 'ACTIVE' && (
          <button className="btn-secondary" onClick={() => setPanel(panel === 'review' ? null : 'review')} disabled={busy !== null}>
            Catat kajian
          </button>
        )}
        {props.canRetire && props.status === 'ACTIVE' && (
          <button className="btn-secondary" onClick={() => act('retire')} disabled={busy !== null}>
            {busy === 'retire' ? 'Memproses…' : 'Retire'}
          </button>
        )}
        {props.canDelete && props.status === 'DRAFT' && (
          <button className="btn-ghost !text-rose-600 hover:!bg-rose-50" onClick={() => act('delete')} disabled={busy !== null}>
            Hapus
          </button>
        )}
      </div>

      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-rose-200">{error}</p>}

      {panel === 'reject' && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4">
          <label className="label" htmlFor="reject-note">
            Alasan penolakan
          </label>
          <textarea id="reject-note" rows={3} className="input" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="mt-3 flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setPanel(null)}>
              Batal
            </button>
            <button className="btn-danger" onClick={submitReject} disabled={busy !== null}>
              {busy === 'reject' ? 'Menolak…' : 'Tolak risiko'}
            </button>
          </div>
        </div>
      )}

      {panel === 'review' && (
        <div className="rounded-xl border border-[#cfe4e2] bg-teal-soft/60 p-4">
          <p className="mb-3 text-xs text-[#536174]">
            Penilaian ulang residual setelah pemantauan. Tanggal review berikutnya diatur otomatis tiga bulan.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="rp-after">
                P&apos; setelah kajian
              </label>
              <select id="rp-after" className="input" value={rp} onChange={(e) => setRp(Number(e.target.value))}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="ri-after">
                I&apos; setelah kajian
              </label>
              <select id="ri-after" className="input" value={ri} onChange={(e) => setRi(Number(e.target.value))}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-3">
            <label className="label" htmlFor="review-note">
              Catatan kajian
            </label>
            <textarea id="review-note" rows={3} className="input" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setPanel(null)}>
              Batal
            </button>
            <button className="btn-primary" onClick={submitReview} disabled={busy !== null}>
              {busy === 'review' ? 'Menyimpan…' : 'Simpan kajian'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
