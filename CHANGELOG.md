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

### Keamanan & Perbaikan (hasil audit)
- fix: Risk Owner tidak bisa lagi melihat/mengekspor unit lain lewat query `?unit=`
- fix: filter unit dan ekspor selalu dibatasi scope sesi (`unitFilter`)
- fix: update risiko memvalidasi `unitId`/`ownerId` milik organisasi; Risk Owner tidak bisa memindahkan risiko antar-unit
- fix: impor Excel untuk Risk Owner dibatasi ke unitnya sendiri
- fix: `AUTH_SECRET` wajib diisi di produksi untuk mencegah pemalsuan sesi
- fix: rate limit login dibersihkan berkala dan memakai fallback `x-real-ip`
- fix: penghapusan lampiran divalidasi agar tetap di dalam folder `uploads`
- fix: unit pengguna divalidasi saat dibuat/diubah; Admin tidak bisa menonaktifkan akun sendiri
- fix: hapus rate limiter mati di `next.config.ts`; tambah header HSTS di produksi
- test: tambah `tests/tenant.test.ts` untuk scope unit dan sentinel
- chore: tambah `vitest.config.ts` (alias `@`)

### Dokumentasi
- docs: tambahkan tutorial.md (22 bagian + demo workflow)
- docs: tambahkan AGENTS.md (spesifikasi bisnis & desain token)
- docs: tambahkan CONTRIBUTING.md (panduan kontribusi)

### CI/CD
- ci: GitHub Actions menjalankan typecheck, build, dan test

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