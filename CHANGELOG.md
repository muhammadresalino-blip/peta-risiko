# Changelog

Format repo commit ama. Versi akan dipinta seiring rilis.

## [Unreleased]

### Tambahkan UI & Pola (mungkin akan pacuan ke versi)
- refactor: entire UI migrasi ke desain token corporate navy & teal
- feature: sidebar & topbar menggunakan token yang benar
- feature: residual score validation (warning di API + detail banner)
- feature: buat badge tingkat risiko menggunakan token risk-low/medium/high/extreme
- fix: replace seluruh hex hardcoded di JSX ke kelas token
- fix: buat heatmap langsung menampilkan label teks tanpa hanya warna
- fix: border tabel & baris tabel token border-line/60

### Dokumentasi
- docs: tambahkan tutorial.md (22 bagian + demo workflow)
- docs: tambahkan AGENTS.md (spesifikasi bisnis & desain token)
- docs: tambahkan contribiying.md (perizinan maintainers)

### CI/CD
- ci: add GitHub Actions workflow typecheck, lint, test

## [0.1.0] - 2026-01-XX

### Fitur Awal
- Landing page login
- Dashboard ringkasan risiko
- Register & management risiko
- Detail risiko dengan inherent & residual
- Heat map 5x5
- Risk appetite management
- Import Excel (dry run + commit valid transactions)
- Ekspor Excel (risk register)
- Cetak dekstop/register
- Omega tenant -> multi-org
- Risk Owner, Reviewer, Viewer, Platform Admin
- Audit log append-only
- Kajian berkala (review)
- Lampiran bukti

### Produk
- Skor P × I inherent/residual
- Scoring configurable (BTR, probabilitas %, batas tingkat)
- Warna tingkat risiko corporate navy & teal
- Cookie session HMAC bertanda tangan
- Keamanan: scrypt password hash, authorized di server semua entity

### Stack
- Next.js 15 (App Router, TypeScript)
- Tailwind CSS v4
- Prisma + SQLite (ready to PostgreSQL/Neon)
- ExcelJS, lucide-react, Zod
- Hubungan API REST (heaeders: semantic error format)