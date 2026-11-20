'use client';

export function PrintButton({ label = 'Cetak register' }: { label?: string }) {
  return (
    <button className="btn-primary" onClick={() => window.print()}>
      ⎙ {label}
    </button>
  );
}
