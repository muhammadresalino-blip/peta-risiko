'use client';

import { useState } from 'react';
import { SectionCard } from '@/components/ui';

export function ExportPanel({
  units,
  riskCount,
  activeCount,
  unitCounts,
}: {
  units: { id: string; name: string }[];
  riskCount: number;
  activeCount: number;
  unitCounts: Record<string, { total: number; active: number }>;
}) {
  const [unitId, setUnitId] = useState('');
  const qs = unitId ? `?unitId=${encodeURIComponent(unitId)}` : '';
  const unit = units.find((u) => u.id === unitId);
  const counts = unit ? (unitCounts[unit.id] ?? { total: 0, active: 0 }) : { total: riskCount, active: activeCount };

  return (
    <div className="space-y-6">
      <div className="card-pad">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[240px] max-w-sm flex-1">
            <label className="label" htmlFor="export-unit">
              Filter unit kerja
            </label>
            <select
              id="export-unit"
              className="input"
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
            >
              <option value="">Semua unit</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <p className="max-w-md text-xs text-muted">
            Filter berlaku untuk unduhan Excel dan versi cetak register. Data tetap dibatasi oleh peran dan unit
            Anda.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Risk Input" description="Format kolom sama dengan sheet Risk Input.">
          <p className="text-sm text-[#536174]">
            {counts.total} risiko{unit ? ` di unit ${unit.name}` : ' di seluruh unit'}, lengkap dengan skor inherent,
            residual, dan status.
          </p>
          <a className="btn-primary mt-4 w-full" href={`/api/v1/exports/risks.xlsx${qs}`}>
            ⇩ Unduh risk-input.xlsx
          </a>
        </SectionCard>

        <SectionCard title="Risk Register" description="Ringkasan untuk manajemen.">
          <p className="text-sm text-[#536174]">
            {counts.active} risiko aktif/diajukan{unit ? ` di unit ${unit.name}` : ' di seluruh unit'}: P, I, skor,
            tingkat, residual, dan status appetite.
          </p>
          <a className="btn-primary mt-4 w-full" href={`/api/v1/exports/risk-register.xlsx${qs}`}>
            ⇩ Unduh risk-register.xlsx
          </a>
        </SectionCard>

        <SectionCard title="Cetak register" description="Halaman siap cetak A4 landscape.">
          <p className="text-sm text-[#536174]">
            Buka tampilan cetak lalu gunakan tombol Cetak atau Ctrl+P. Navigasi dan sidebar tidak ikut tercetak.
          </p>
          <a className="btn-secondary mt-4 w-full" href={`/risks/print${qs}`}>
            ⎙ Buka versi cetak
          </a>
        </SectionCard>

        <SectionCard title="Templat impor" description="Kerangka kolom untuk pengisian data baru.">
          <p className="text-sm text-[#536174]">
            Kosong dengan header kolom standar. Isi satu baris per risiko, lalu impor lewat menu Impor Excel.
          </p>
          <a className="btn-secondary mt-4 w-full" href="/api/v1/imports/risks">
            ⇩ Unduh templat
          </a>
        </SectionCard>
      </div>
    </div>
  );
}
