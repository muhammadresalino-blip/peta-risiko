import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PetaRisiko — Risk Register',
  description:
    'PetaRisiko: aplikasi web risk register dengan skor otomatis, heat map 5×5, Risk Appetite, dan audit log.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
