'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { evaluate, type ScoringConfig } from '@/lib/scoring';
import { formatRupiah, STRATEGY_LABEL } from '@/lib/format';
import { LevelBadge } from '@/components/ui';

export interface RiskFormDefaults {
  id?: string;
  version?: number;
  type: string;
  category: string;
  unitId: string;
  goal: string;
  identifiedAt: string;
  description: string;
  rootCause: string;
  indicator: string;
  existingControl: string;
  qualitativeImpact: string;
  p: number;
  i: number;
  ownerId: string;
  ownerTitle: string;
  strategy: string;
  treatment: string;
  treatmentCost: number;
  actionsDone: string;
  rp: number;
  ri: number;
  nextReviewAt: string;
}

interface Props {
  mode: 'create' | 'edit';
  defaults: RiskFormDefaults;
  units: { id: string; name: string }[];
  categories: { name: string }[];
  users: { id: string; name: string; role: string }[];
  config: ScoringConfig;
}

const INDEX = [1, 2, 3, 4, 5] as const;

const THREAT_STRATEGIES = ['AVOID', 'TRANSFER', 'MITIGATE', 'ACCEPT'];
const OPPORTUNITY_STRATEGIES = ['EXPLOIT', 'SHARE', 'ENHANCE', 'ACCEPT'];

export function RiskForm({ mode, defaults, units, categories, users, config }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<RiskFormDefaults>(defaults);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<{ path: string; message: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof RiskFormDefaults>(key: K, value: RiskFormDefaults[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const inherent = useMemo(() => evaluate(form.p, form.i, config), [form.p, form.i, config]);
  const residual = useMemo(() => evaluate(form.rp, form.ri, config), [form.rp, form.ri, config]);
  const strategies = form.type === 'OPPORTUNITY' ? OPPORTUNITY_STRATEGIES : THREAT_STRATEGIES;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setDetails([]);

    const payload = {
      type: form.type,
      category: form.category,
      unitId: form.unitId,
      goal: form.goal,
      identifiedAt: form.identifiedAt,
      description: form.description,
      rootCause: form.rootCause,
      indicator: form.indicator,
      existingControl: form.existingControl,
      qualitativeImpact: form.qualitativeImpact,
      p: Number(form.p),
      i: Number(form.i),
      ownerId: form.ownerId,
      ownerTitle: form.ownerTitle,
      strategy: form.strategy,
      treatment: form.treatment,
      treatmentCost: Number(form.treatmentCost || 0),
      actionsDone: form.actionsDone || null,
      rp: Number(form.rp),
      ri: Number(form.ri),
      nextReviewAt: form.nextReviewAt || null,
      version: form.version,
    };

    try {
      const res = await fetch(mode === 'create' ? '/api/v1/risks' : `/api/v1/risks/${form.id}`, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? 'Gagal menyimpan risiko.');
        if (Array.isArray(json?.error?.details)) setDetails(json.error.details);
        return;
      }
      router.push(`/risks/${json.data.id}`);
      router.refresh();
    } catch {
      setError('Tidak dapat menghubungi server.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-risk-extreme/10 px-4 py-3 text-sm text-risk-extreme ring-1 ring-risk-extreme/20">
          <p className="font-semibold">{error}</p>
          {details.length > 0 && (
            <ul className="mt-1 list-inside list-disc text-xs">
              {details.map((d) => (
                <li key={`${d.path}-${d.message}`}>
                  {d.path}: {d.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <section className="card">
        <header className="border-b border-line px-5 py-4">
          <h2 className="text-sm font-bold text-navy">1. Identifikasi risiko</h2>
          <p className="text-xs text-muted">Konteks risiko, sasaran yang terancam, dan penyebabnya.</p>
        </header>
        <div className="grid gap-4 p-5 md:grid-cols-2">
          <div>
            <label className="label" htmlFor="type">
              Tipe
            </label>
            <select id="type" className="input" value={form.type} onChange={(e) => {
              const type = e.target.value;
              set('type', type);
              const allowed = type === 'OPPORTUNITY' ? OPPORTUNITY_STRATEGIES : THREAT_STRATEGIES;
              if (!allowed.includes(form.strategy)) set('strategy', allowed[0]);
            }}>
              <option value="THREAT">Ancaman (threat)</option>
              <option value="OPPORTUNITY">Peluang (opportunity)</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="category">
              Kategori risiko
            </label>
            <select id="category" className="input" value={form.category} onChange={(e) => set('category', e.target.value)} required>
              {categories.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="unitId">
              Unit kerja
            </label>
            <select id="unitId" className="input" value={form.unitId} onChange={(e) => set('unitId', e.target.value)} required>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="identifiedAt">
              Tanggal identifikasi
            </label>
            <input
              id="identifiedAt"
              type="date"
              className="input"
              value={form.identifiedAt}
              onChange={(e) => set('identifiedAt', e.target.value)}
              required
            />
          </div>
          <div className="md:col-span-2">
            <label className="label" htmlFor="goal">
              Sasaran
            </label>
            <input id="goal" className="input" value={form.goal} onChange={(e) => set('goal', e.target.value)} required />
          </div>
          <div className="md:col-span-2">
            <label className="label" htmlFor="description">
              Deskripsi risiko
            </label>
            <input
              id="description"
              className="input"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Contoh: Keterlambatan jam terbang"
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="rootCause">
              Akar penyebab
            </label>
            <textarea id="rootCause" rows={3} className="input" value={form.rootCause} onChange={(e) => set('rootCause', e.target.value)} required />
          </div>
          <div>
            <label className="label" htmlFor="indicator">
              Indikator risiko
            </label>
            <textarea id="indicator" rows={3} className="input" value={form.indicator} onChange={(e) => set('indicator', e.target.value)} required />
          </div>
          <div>
            <label className="label" htmlFor="existingControl">
              Internal control
            </label>
            <textarea id="existingControl" rows={3} className="input" value={form.existingControl} onChange={(e) => set('existingControl', e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="qualitativeImpact">
              Dampak kualitatif
            </label>
            <textarea id="qualitativeImpact" rows={3} className="input" value={form.qualitativeImpact} onChange={(e) => set('qualitativeImpact', e.target.value)} />
          </div>
        </div>
      </section>

      <section className="card">
        <header className="border-b border-line px-5 py-4">
          <h2 className="text-sm font-bold text-navy">2. Analisis inherent</h2>
          <p className="text-xs text-muted">Skor = P × I. Dampak finansial = (I ÷ 5) × BTR.</p>
        </header>
        <div className="grid gap-5 p-5 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label" htmlFor="p">
                  Probabilitas (P)
                </label>
                <select id="p" className="input" value={form.p} onChange={(e) => set('p', Number(e.target.value))}>
                  {INDEX.map((n) => (
                    <option key={n} value={n}>
                      {n} — {Math.round(config.probPct[n] * 100)}%
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="i">
                  Dampak (I)
                </label>
                <select id="i" className="input" value={form.i} onChange={(e) => set('i', Number(e.target.value))}>
                  {INDEX.map((n) => (
                    <option key={n} value={n}>
                      {n} — {Math.round((n / 5) * 100)}% BTR
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-line bg-mist p-4 lg:col-span-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Pratinjau</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="data-value text-2xl font-bold text-navy">{inherent.score}</span>
              <LevelBadge level={inherent.level} />
            </div>
            <dl className="mt-3 space-y-1 text-xs text-muted">
              <div className="flex justify-between">
                <dt>Probabilitas</dt>
                <dd>{Math.round(inherent.probPct * 100)}%</dd>
              </div>
              <div className="flex justify-between">
                <dt>Dampak finansial</dt>
                <dd>{formatRupiah(inherent.financialImpact, { compact: true })}</dd>
              </div>
              <div className="flex justify-between font-semibold text-ink">
                <dt>Nilai bersih</dt>
                <dd>{formatRupiah(inherent.netValue, { compact: true })}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="card">
        <header className="border-b border-line px-5 py-4">
          <h2 className="text-sm font-bold text-navy">3. Penanganan</h2>
          <p className="text-xs text-muted">Strategi, rencana, dan biaya penanganan.</p>
        </header>
        <div className="grid gap-4 p-5 md:grid-cols-2">
          <div>
            <label className="label" htmlFor="strategy">
              Strategi
            </label>
            <select id="strategy" className="input" value={form.strategy} onChange={(e) => set('strategy', e.target.value)}>
              {strategies.map((s) => (
                <option key={s} value={s}>
                  {STRATEGY_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="treatmentCost">
              Biaya penanganan (Rp)
            </label>
            <input
              id="treatmentCost"
              type="number"
              min={0}
              step={1000}
              className="input"
              value={form.treatmentCost}
              onChange={(e) => set('treatmentCost', Number(e.target.value))}
            />
          </div>
          <div className="md:col-span-2">
            <label className="label" htmlFor="treatment">
              Rencana penanganan
            </label>
            <textarea id="treatment" rows={2} className="input" value={form.treatment} onChange={(e) => set('treatment', e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="label" htmlFor="actionsDone">
              Penanganan yang sudah dilakukan
            </label>
            <textarea id="actionsDone" rows={2} className="input" value={form.actionsDone} onChange={(e) => set('actionsDone', e.target.value)} />
          </div>
        </div>
      </section>

      <section className="card">
        <header className="border-b border-line px-5 py-4">
          <h2 className="text-sm font-bold text-navy">4. Analisis residual</h2>
          <p className="text-xs text-muted">Nilai setelah penanganan. Idealnya lebih rendah dari inherent.</p>
        </header>
        <div className="grid gap-5 p-5 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label" htmlFor="rp">
                  Probabilitas residual (P&apos;)
                </label>
                <select id="rp" className="input" value={form.rp} onChange={(e) => set('rp', Number(e.target.value))}>
                  {INDEX.map((n) => (
                    <option key={n} value={n}>
                      {n} — {Math.round(config.probPct[n] * 100)}%
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="ri">
                  Dampak residual (I&apos;)
                </label>
                <select id="ri" className="input" value={form.ri} onChange={(e) => set('ri', Number(e.target.value))}>
                  {INDEX.map((n) => (
                    <option key={n} value={n}>
                      {n} — {Math.round((n / 5) * 100)}% BTR
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="label" htmlFor="nextReviewAt">
                  Review berikutnya
                </label>
                <input
                  id="nextReviewAt"
                  type="date"
                  className="input"
                  value={form.nextReviewAt}
                  onChange={(e) => set('nextReviewAt', e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-line bg-mist p-4 lg:col-span-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Pratinjau residual</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="data-value text-2xl font-bold text-navy">{residual.score}</span>
              <LevelBadge level={residual.level} />
            </div>
            <dl className="mt-3 space-y-1 text-xs text-muted">
              <div className="flex justify-between">
                <dt>Probabilitas</dt>
                <dd>{Math.round(residual.probPct * 100)}%</dd>
              </div>
              <div className="flex justify-between">
                <dt>Dampak finansial</dt>
                <dd>{formatRupiah(residual.financialImpact, { compact: true })}</dd>
              </div>
              <div className="flex justify-between font-semibold text-ink">
                <dt>Nilai bersih</dt>
                <dd>{formatRupiah(residual.netValue, { compact: true })}</dd>
              </div>
            </dl>
            {residual.score > inherent.score && (
              <p className="mt-3 rounded-md bg-risk-medium/10 px-2 py-1.5 text-[11px] text-risk-medium ring-1 ring-risk-medium/20">
                Skor residual lebih tinggi dari inherent. Periksa kembali penilaian.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="card">
        <header className="border-b border-line px-5 py-4">
          <h2 className="text-sm font-bold text-navy">5. Pemilik risiko</h2>
        </header>
        <div className="grid gap-4 p-5 md:grid-cols-2">
          <div>
            <label className="label" htmlFor="ownerId">
              Pemilik risiko
            </label>
            <select id="ownerId" className="input" value={form.ownerId} onChange={(e) => set('ownerId', e.target.value)} required>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="ownerTitle">
              Jabatan pemilik
            </label>
            <input
              id="ownerTitle"
              className="input"
              value={form.ownerTitle}
              onChange={(e) => set('ownerTitle', e.target.value)}
              placeholder="Contoh: Operational Director"
            />
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted">
          Risiko disimpan sebagai <strong>Draft</strong>. Ajukan ke Reviewer dari halaman detail.
        </p>
        <div className="flex gap-2">
          <Link href={mode === 'edit' && form.id ? `/risks/${form.id}` : '/risks'} className="btn-secondary">
            Batal
          </Link>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Menyimpan…' : mode === 'create' ? 'Simpan risiko' : 'Simpan perubahan'}
          </button>
        </div>
      </div>
    </form>
  );
}
