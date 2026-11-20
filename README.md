# PetaRisiko

Aplikasi web **risk register** untuk organisasi, dibangun dari dokumen *PetaRisiko: Dokumen Produk dan Teknis v1.0* (kasus contoh: PT Cakrawala Nusantara Air Tbk., nama fiktif).

Stack: **Next.js 15 (App Router, TypeScript)**, **Prisma + SQLite** (mudah dipindah ke PostgreSQL/Neon), **Tailwind CSS v4**, **ExcelJS**, **Zod**, **Lucide** (ikon). Autentikasi sesi cookie bertanda tangan (HMAC) dengan kata sandi di-hash scrypt.

Antarmuka memakai arah visual **Corporate Navy & Teal**: navy `#142D4E` untuk struktur, teal `#168C87` untuk aksi dan data terpilih, kanvas `#F5F7FA`, serta font **Manrope** (judul), **DM Sans** (teks), dan **JetBrains Mono** (kode risiko serta angka). Warna tingkat risiko: low `#23865A`, medium `#B7791F`, high `#D36B32`, extreme `#C43D4D`. Badge tingkat risiko selalu menyertakan label teks agar tidak bergantung pada warna saja.

---

## Menjalankan

```bash
npm install
npm run db:push      # buat skema SQLite (prisma/dev.db)
npm run db:seed      # organisasi demo + unit + kategori + 3 risiko contoh
npm run dev          # http://localhost:3000
```

Akun demo (sandi `Admin12345!`):

| Peran | Email |
| --- | --- |
| Admin | `admin@petarisiko.local` |
| Risk Owner | `owner@petarisiko.local` |
| Reviewer | `reviewer@petarisiko.local` |
| Viewer | `viewer@petarisiko.local` |
| Platform Admin (tanpa organisasi) | `platform@petarisiko.local` |

Perintah lain:

```bash
npm test             # unit test scoring + rbac (vitest)
npm run build        # build produksi
node scripts/smoke.mjs   # uji asap end-to-end ke server yang berjalan
npm run db:reset     # hapus database lokal, lalu db:push + db:seed
```

---

## Yang sudah diimplementasikan

### PRD & aturan bisnis
- Skor `P × I` (1–25), tingkat **Low / Medium / High / Extreme High** dengan batas 3 / 6 / 12 yang dapat diubah Admin.
- Dampak finansial `(I ÷ 5) × BTR`; nilai bersih `probabilitas(%) × dampak finansial`.
- Probabilitas per indeks bawaan 10 / 25 / 50 / 70 / 90 %, dapat diubah.
- Skor dihitung **di server** saat menyimpan; klien hanya menampilkan pratinjau memakai fungsi `scoring.ts` yang sama.
- Peringatan bila skor residual lebih tinggi dari inherent.
- Risk Appetite per kategori dengan pengecualian per unit; penandaan “di atas appetite” otomatis saat risiko disimpan, appetite berubah, atau hitung ulang.
- Kode risiko otomatis dari inisial unit (mis. `FLI001`), unik per organisasi.
- Residual otomatis dan penilaian ulang lewat kajian berkala (tanggal review berikutnya +3 bulan).

### Alur & peran
- Siklus **Draft → Diajukan → Aktif → Retired**; perubahan risiko Aktif oleh Risk Owner mengembalikannya ke Diajukan; penolakan mewajibkan catatan.
- Matriks hak akses bagian 4.5 diterapkan di server (bukan hanya menyembunyikan tombol): Admin, Risk Owner (unit sendiri), Reviewer, Viewer, Platform Admin.
- Audit log append-only untuk setiap perubahan (CREATE/UPDATE/DELETE/SUBMIT/APPROVE/REJECT/RETIRE/IMPORT/SETTINGS/RECALCULATE), disimpan dalam transaksi yang sama dengan perubahan data.
- Audit log dapat difilter entitas, pelaku, dan tanggal; Risk Owner hanya melihat audit risiko unitnya.

### Halaman
- **Login** dan sesi 8 jam.
- **Dashboard**: jumlah risiko, nilai bersih inherent & residual, biaya penanganan, sebaran tingkat, rekap per unit, nilai bersih terbesar, daftar di atas appetite, **tren snapshot** (12 periode terakhir), tombol **ambil snapshot**, dan **daftar review jatuh tempo**.
- **Register Risiko**: pencarian, filter unit/kategori/tingkat/status/appetite, pengurutan skor & nilai bersih, paginasi, ekspor Excel.
- **Detail risiko**: dua panel skor, identifikasi, penanganan, kajian berkala, audit log, aksi sesuai peran.
- **Form risiko**: 5 bagian, pratinjau skor langsung, validasi Zod di klien dan server.
- **Heat Map 5 × 5** inherent/residual dengan kode risiko di tiap sel dan legenda berlabel teks (bukan hanya warna).
- **Risk Appetite**: CRUD batas per kategori/unit + daftar risiko yang melampaui.
- **Impor Excel**: unggah, pemetaan kolom otomatis + dapat disesuaikan, **dry run** per baris, simpan baris valid sebagai Draft dalam satu transaksi (audit `IMPORT`), serta **templat pemetaan tersimpan** per organisasi (pilih, simpan, perbarui, hapus).
- **Ekspor & cetak**: `risk-input.xlsx` (format Risk Input), `risk-register.xlsx`, templat impor, filter **per unit kerja**, dan halaman **cetak register** A4 landscape tanpa sidebar.
- **Platform Admin**: kelola organisasi (buat tenant + Admin pertama, aktif/nonaktifkan) dan **perbandingan antarorganisasi** memakai skor/tingkat risiko (bukan rupiah).
- **Pengaturan**: BTR, total pendapatan, probabilitas %, batas tingkat, tombol hitung ulang seluruh risiko.
- **Pengguna & Unit**: kelola anggota, peran, unit, status aktif; unit tidak dapat dihapus bila masih dipakai.
- **Audit Log** global.

### API (`/api/v1`)
Sesuai bagian 5 dokumen: `auth/login|logout|me`, `risks` (GET/POST), `risks/:id` (GET/PATCH/DELETE), `risks/:id/submit|approve|reject|retire`, `risks/:id/reviews`, `risks/:id/audit`, `risks/appetite-gap`, `dashboard/summary|by-unit|heatmap|trend`, `appetites` (+`:id`), `settings` (+`recalculate`), `imports/risks` (`dryRun`, `mapping`, `mappingId`), `import-mappings` (GET/POST) + `:id` (PUT/DELETE), `exports/risks.xlsx` dan `exports/risk-register.xlsx` (`?unitId=`), `users` (+`:id`), `units` (+`:id`), `audit-logs`, `snapshots`, `organizations` (GET/POST) + `:id` (PATCH), `platform/compare`, `health`.

Format: `{ "data": ..., "meta": ... }` dan error `{ "error": { "code", "message", "details" } }` dengan kode 400/401/403/404/409/422/429/500.

### Multi-organisasi (fondasi)
- `orgId` di semua tabel bisnis, berasal dari sesi dan tidak pernah dari input klien; helper scoping di `src/lib/tenant.ts`.
- Kode risiko dan nama unit unik per organisasi; pengaturan (BTR, probabilitas, batas tingkat, appetite) per organisasi.
- Platform Admin memakai ruang kerja terpisah (`/organizations`, `/platform/compare`) dan tidak dapat membuka halaman operasional organisasi.
- Pembuatan organisasi baru menyiapkan Admin pertama dan pengaturan bawaan (BTR 0, probabilitas default, batas tingkat) dalam satu transaksi.

### Keamanan
- Hash kata sandi scrypt (salt acak, perbandingan timing-safe), cookie `HttpOnly`, `SameSite=Lax`, `Secure` di produksi.
- Otorisasi di setiap endpoint; semua query lewat Prisma (parameterized); unggahan dibatasi tipe `.xlsx/.xlsm`, 5 MB, 1.000 baris.
- Rahasia hanya di environment variable (`.env` tidak di-commit).

---

## Struktur

```
prisma/schema.prisma      skema (Organization, User, Unit, Risk, RiskReview,
                          RiskAppetite, Setting, AuditLog, RiskSnapshot, ImportMapping)
prisma/seed.ts            data demo Cakrawala Air
src/app/(app)/...         halaman setelah login (organisasi)
src/app/(platform)/...    halaman Platform Admin (organisasi, perbandingan)
src/app/api/v1/...        route handler sesuai bagian 5 dokumen
src/lib/scoring.ts        rumus skor (dipakai server & pratinjau klien)
src/lib/rbac.ts           matriks peran dan aturan akses
src/lib/auth.ts           hash sandi, tanda tangan sesi
src/lib/excel.ts          baca/tulis workbook ExcelJS
src/server/services/      risk, appetite, import, dashboard, platform
src/validators/           skema Zod
tests/                    unit test scoring & rbac
docs/                     catatan pemetaan kolom Risk Input
```

---

## Catatan & batasan

- **SQLite** dipakai agar proyek langsung jalan tanpa server database. Prisma tidak mendukung `enum`/`Decimal` di SQLite, sehingga peran/status berupa `String` dan nilai uang `Float` (dibulatkan ke rupiah).
- Pindah ke **PostgreSQL/Neon**: ubah `datasource.provider` ke `postgresql`, arahkan `DATABASE_URL` ke Neon (pooled) + `DATABASE_URL_UNPOOLED` untuk migrasi, lalu `npx prisma migrate deploy`. Kolom `Float` dapat diubah ke `Decimal @db.Decimal(20,0)`.
- Jadwal snapshot bulanan dan job hitung ulang belum dijalankan otomatis; tersedia endpoint manual (`POST /api/v1/snapshots`, `POST /api/v1/settings/recalculate`), tombol snapshot di Dashboard, dan tombol hitung ulang di halaman Pengaturan.
- Sheet **Risk Input** asli tidak tersedia saat pengembangan (hanya dokumen PDF, yang menyebut “38 field” tanpa merinci nama kolomnya). Aplikasi mengekspor **31 kolom** yang terverifikasi dari model dan form; rincian serta 7 kolom yang belum terverifikasi ada di [`docs/pemetaan-kolom-risk-input.md`](docs/pemetaan-kolom-risk-input.md).
- Notifikasi email/WhatsApp, SSO, multi-bahasa, mobile native, dan integrasi ke sistem keuangan berada di luar MVP sesuai dokumen.
