# PetaRisiko: Dokumen Produk dan Teknis

Kasus contoh: PT Cakrawala Nusantara Air Tbk. (nama fiktif) · Kelompok 5 · Versi 1.0 · 16 November 2026

PetaRisiko adalah aplikasi web risk register untuk organisasi mana pun; risk register PT Cakrawala Nusantara Air Tbk. (nama fiktif) dipakai sebagai contoh data dan acuan struktur. (nama ini merujuk pada peta atau heat map risiko). Dokumen ini berisi enam bagian: PRD, Codebase, Arsitektur, Business Flow, API, dan Deployment. Stack yang dipilih: Next.js (TypeScript), PostgreSQL (Prisma), Vercel, dan Neon. Fitur tambahan yang dimasukkan: login dengan peran, audit log, impor dan ekspor Excel, serta Risk Appetite.

**Prinsip: Excel sebagai contoh, bukan batasan.** File risk register Cakrawala Air hanya menjadi contoh data dan acuan kolom. Kode aplikasi tidak boleh memuat nilai khusus Cakrawala Air (BTR, unit kerja, kategori, nama organisasi); semuanya adalah data dan pengaturan yang bisa diganti. Data Cakrawala Air tersedia sebagai data contoh bawaan yang bisa dimuat atau dikosongkan sekali klik, dan data lain masuk lewat input manual atau impor Excel/CSV dengan pemetaan kolom.

## 1. PRD (Product Requirements Document)

### 1.1 Latar belakang dan tujuan

Risk register saat ini dikelola dalam file Excel bermakro (.xlsm) dengan sheet Risk Input, Kriteria Risiko, Rekap, BTR & Kertas kerja, dan Manual. Masalahnya: satu file dipakai bergantian, tidak ada riwayat perubahan, makro tidak jalan di semua perangkat, dan grafik harus dibuat ulang lewat tombol.

Tujuan produk:

- Memusatkan pencatatan risiko dalam satu aplikasi web yang bisa diakses banyak pengguna.
- Menghitung skor, tingkat risiko, dan nilai bersih secara otomatis dan konsisten.
- Menampilkan dashboard dan heat map tanpa langkah manual.
- Menyimpan jejak siapa mengubah apa dan kapan.
- Tetap kompatibel dengan format Excel yang sudah dipakai.

### 1.2 Pengguna dan peran

| Peran | Deskripsi | Kebutuhan utama |
| --- | --- | --- |
| Admin | Pengelola sistem (tim manajemen risiko) | Kelola pengguna, unit, kriteria, BTR, dan Risk Appetite |
| Risk Owner | Pemilik risiko di unit kerja | Mencatat dan memperbarui risiko unitnya, mengajukan untuk disetujui |
| Reviewer | Penilai risiko (mis. manajer risiko) | Menyetujui atau menolak, mencatat kajian berkala |
| Viewer | Manajemen, auditor | Melihat dashboard dan register, tanpa mengubah data |

### 1.3 Ruang lingkup

**Masuk MVP:**

- Login dan peran (Admin, Risk Owner, Reviewer, Viewer).
- CRUD risiko dengan 38 field mengikuti sheet Risk Input.
- Skor otomatis: inherent dan residual, tingkat risiko, probabilitas (%), dampak finansial, dan nilai bersih.
- Alur persetujuan: Draft → Diajukan → Aktif → Retired.
- Dashboard (ringkasan, per unit, per tingkat) dan heat map 5×5 (inherent dan residual).
- Risk Appetite per kategori dan per unit, serta daftar risiko yang melampaui appetite.
- Pengaturan kriteria: BTR, total pendapatan, pemetaan probabilitas (%), dan batas skor tingkat risiko.
- Impor dan ekspor Excel.
- Audit log.

**Di luar MVP (fase berikutnya):**

- Notifikasi email atau WhatsApp untuk jadwal review.
- SSO perusahaan (Azure AD atau Google Workspace).
- Multi-bahasa (MVP hanya Bahasa Indonesia).
- Aplikasi mobile native.
- Integrasi ke sistem keuangan atau operasional.

### 1.4 User stories

| ID | Sebagai | Saya ingin | Agar |
| --- | --- | --- | --- |
| US-01 | Risk Owner | mencatat risiko baru dengan form terstruktur | risiko unit saya terdokumentasi |
| US-02 | Risk Owner | melihat skor dan tingkat risiko langsung saat mengisi P dan I | tidak perlu menghitung manual |
| US-03 | Risk Owner | mengajukan risiko untuk disetujui | ada validasi sebelum menjadi risiko aktif |
| US-04 | Reviewer | menyetujui atau menolak dengan catatan | kualitas data terjaga |
| US-05 | Reviewer | mencatat kajian berkala dan menilai ulang risiko residual | efektivitas penanganan terpantau |
| US-06 | Viewer | melihat dashboard dan heat map | memahami profil risiko perusahaan |
| US-07 | Admin | mengatur BTR dan batas tingkat risiko | kriteria bisa disesuaikan tanpa mengubah kode |
| US-08 | Admin | mengimpor data dari Excel yang sudah ada | tidak perlu input ulang |
| US-09 | Auditor | melihat riwayat perubahan sebuah risiko | perubahan dapat ditelusuri |
| US-10 | Manajemen | melihat risiko yang melampaui Risk Appetite | prioritas penanganan jelas |

### 1.5 Kebutuhan fungsional

| ID | Kebutuhan |
| --- | --- |
| FR-01 | Pengguna login dengan email dan kata sandi; sesi berakhir otomatis setelah tidak aktif. |
| FR-02 | Akses data dibatasi peran dan unit (lihat matriks di bagian 4). |
| FR-03 | Kode risiko unik, dibuat otomatis (contoh LAG001) dan boleh diubah Admin. |
| FR-04 | Skor, tingkat, dan nilai bersih dihitung server saat menyimpan; klien hanya menampilkan pratinjau. |
| FR-05 | Daftar risiko mendukung pencarian, filter (unit, kategori, tingkat, status), pengurutan, dan paginasi. |
| FR-06 | Dashboard menampilkan jumlah risiko, nilai bersih inherent dan residual, biaya penanganan, serta rekap per unit dan per tingkat. |
| FR-07 | Heat map menampilkan kode risiko pada sel P × I, dengan pilihan inherent atau residual. |
| FR-08 | Risk Appetite dapat diatur per kategori (dan per unit sebagai pengecualian); sistem menandai risiko residual yang skornya di atas appetite. |
| FR-09 | Impor Excel melalui validasi dry run: sistem menampilkan error per baris sebelum data disimpan. |
| FR-10 | Ekspor Excel dalam format yang sama dengan Risk Input, dan versi cetak (Risk Register). |
| FR-11 | Setiap perubahan data tercatat di audit log (siapa, kapan, sebelum, sesudah). |
| FR-12 | Perubahan pengaturan kriteria memicu penghitungan ulang seluruh risiko (job terjadwal atau manual oleh Admin). |

### 1.6 Aturan bisnis

- **Skor risiko** = Probabilitas (P) × Dampak (I), dengan P dan I bernilai 1 sampai 5. Berlaku sama untuk inherent (W) dan residual (W').
- **Tingkat risiko** (default dari file Excel): 1 sampai 3 = Low, 4 sampai 6 = Medium, 8 sampai 12 = High, 15 sampai 25 = Extreme High. Batas disimpan di pengaturan.
- **Dampak finansial** = (indeks dampak ÷ 5) × BTR. Pada file contoh, BTR = Rp 545.834.931.553 (tepat 43% dari total pendapatan Rp 1.269.383.561.751, dihitung di sheet BTR & Kertas kerja), sehingga indeks 1 sampai 5 bernilai 20% sampai 100% BTR.
- **Probabilitas (%)** per indeks: nilai default dipilih dari tengah rentang kriteria (5 = 90%, 4 = 70%, 3 = 50%, 2 = 25%, 1 = 10%) dan dapat diubah Admin.
- **Nilai bersih** = probabilitas (%) × dampak finansial.
- **Residual** tidak boleh lebih tinggi dari inherent; sistem memberi peringatan jika terjadi.
- **Strategi** untuk ancaman: Avoid, Transfer, Mitigate, Accept. Untuk peluang: Exploit, Share, Enhance, Accept.
- **Risk Appetite**: risiko dinyatakan "di atas appetite" jika skor residual > batas skor appetite untuk kategori atau unit tersebut.

### 1.7 Kebutuhan non-fungsional (target awal)

- Performa: halaman daftar dan dashboard dimuat kurang dari 2 detik untuk 5.000 risiko.
- Keamanan: kata sandi di-hash, HTTPS wajib, kontrol akses di server, audit log tidak bisa diubah dari aplikasi.
- Ketersediaan: target 99% pada jam kerja; backup harian.
- Kompatibilitas: browser modern (Chrome, Edge, Safari, Firefox) dan responsif hingga layar ponsel.
- Aksesibilitas: kontras warna memadai, tingkat risiko tidak hanya dibedakan lewat warna (ada label teks).

### 1.8 Metrik keberhasilan

- 100% risiko dari file Excel berhasil diimpor tanpa input ulang.
- Waktu menyusun laporan profil risiko turun dari manual (generate lewat makro) menjadi satu klik.
- Seluruh perubahan risiko dapat ditelusuri di audit log.
- Risk Owner mengisi form pertama kali tanpa bantuan dalam kurang dari 10 menit.

### 1.9 Asumsi dan pertanyaan terbuka

- BTR 43% sudah terkonfirmasi dari file; persentase probabilitas dan dampak finansial residual masih perlu keputusan pemilik proses (lihat tabel di bawah daftar ini).
- Apakah login perlu SSO sejak awal? MVP memakai email dan kata sandi.
- Jumlah pengguna dan risiko diasumsikan kecil sampai menengah (puluhan pengguna, ribuan risiko).
- Sheet Organisasi mengenal Head Office dan Branch Office; MVP memperlakukan keduanya sebagai tipe unit.

Angka di tabel ini adalah nilai contoh dari file Cakrawala Air; nilainya dipakai sebagai pengaturan bawaan dan bisa diganti tiap organisasi. Tabel berikut memisahkan angka yang sudah diperiksa terhadap file Excel dari angka yang masih berupa usulan dan perlu diputuskan pemilik proses sebelum go-live.

| Parameter | Nilai di dokumen | Hasil pemeriksaan file Excel | Keputusan yang dibutuhkan |
| --- | --- | --- | --- |
| BTR | 43% × total pendapatan Rp 1.269.383.561.751 = Rp 545.834.931.553 | Terkonfirmasi: nilai di sheet BTR & Kertas kerja tepat 43% dari total pendapatan; hanya label "XX%" yang belum diisi | Pemilik proses menyetujui 43% sebagai BTR resmi |
| Indeks dampak finansial | 20%, 40%, 60%, 80%, 100% dari BTR | Terkonfirmasi: sama dengan tabel Index Dampak di sheet BTR & Kertas kerja | Tidak ada |
| Batas tingkat risiko | Low 1 sampai 3, Medium 4 sampai 6, High 8 sampai 12, Extreme High 15 sampai 25 | Terkonfirmasi: sama dengan sheet Database; semua hasil kali P × I jatuh di salah satu rentang | Tidak ada |
| Probabilitas (%) per indeks | 5 = 90%, 4 = 70%, 3 = 50%, 2 = 25%, 1 = 10% | Usulan: file hanya memberi rentang (di atas 80%, 60 sampai 80%, 40 sampai 60%, 10 sampai 40%, sampai 10%) dan contoh manual 75%, 60%, 50%, 40%, 10%; semua contoh masuk rentangnya | Pilih satu nilai tetap per indeks, atau izinkan input manual per risiko |
| Dampak finansial residual | I’ ÷ 5 × BTR | Tidak konsisten di file contoh: LAG001 dan LAG002 memakai Rp 327,5 M (setara indeks 3) padahal I’ = 2; LAG003 memakai Rp 163,75 M (0,3 × BTR) | Pakai rumus otomatis, atau izinkan nilai manual dengan alasan wajib |
| Kriteria dampak lain (Capex, reputasi, K3, lingkungan, SDM, operasional) | Tidak dipakai di MVP | Masih placeholder "XX" di sheet Kriteria Risiko | Isi bila ingin dijadikan dasar penilaian |

### 1.10 Dukungan multi-organisasi

PetaRisiko dirancang untuk dipakai lebih dari satu organisasi, dengan data contoh Cakrawala Air sebagai organisasi demo. Data setiap organisasi terpisah dan tidak terlihat oleh organisasi lain. Peran baru: **Platform Admin**, yang membuat organisasi dan akun Admin pertamanya, tetapi tidak melihat isi risiko organisasi kecuali diberi akses oleh Admin organisasi.

| ID | Kebutuhan |
| --- | --- |
| FR-13 | Setiap data bisnis (risiko, unit, pengguna, appetite, pengaturan, audit log) dimiliki satu organisasi dan hanya bisa diakses anggotanya. |
| FR-14 | Platform Admin membuat organisasi baru beserta Admin pertamanya; Admin organisasi mengelola pengguna dan pengaturan organisasinya sendiri. |
| FR-15 | Unit kerja, kategori risiko, BTR, probabilitas (%), batas tingkat risiko, dan Risk Appetite diatur per organisasi; tidak ada daftar yang tertulis tetap di kode. |
| FR-16 | Impor Excel memakai pemetaan kolom: pengguna mencocokkan kolom file dengan field risiko, dan pemetaan dapat disimpan sebagai templat organisasi. |
| FR-17 | Snapshot bulanan menyimpan skor dan tingkat setiap risiko agar profil risiko bisa dibandingkan antarperiode. |
| FR-18 | Perbandingan antarorganisasi hanya untuk Platform Admin dan memakai skor serta tingkat risiko, bukan nilai rupiah, karena BTR tiap organisasi berbeda. |

Aturan dan asumsi tambahan:

- Setiap pengguna menjadi anggota satu organisasi; pengguna yang tergabung di beberapa organisasi masuk fase berikutnya.
- Organisasi baru memulai dari pengaturan bawaan (probabilitas % dan batas tingkat risiko dari bagian 1.6); BTR wajib diisi Admin karena tidak punya nilai bawaan.
- Pertanyaan terbuka: apakah organisasi bersedia datanya ikut dalam perbandingan antarorganisasi (FR-18)?

## 2. Codebase

### 2.1 Teknologi

| Lapisan | Pilihan |
| --- | --- |
| Framework | Next.js (App Router), React, TypeScript |
| UI | Tailwind CSS, komponen shadcn/ui |
| Grafik | Recharts |
| Database | PostgreSQL (Neon) |
| ORM | Prisma |
| Auth | Auth.js (credentials, sesi JWT), hash kata sandi dengan argon2 |
| Validasi | Zod (dipakai di klien dan server) |
| Excel | ExcelJS |
| Test | Vitest (unit), Playwright (end-to-end) |
| Kualitas | ESLint, Prettier, GitHub Actions |

### 2.2 Struktur folder

```
petarisiko/
├─ prisma/
│  ├─ schema.prisma
│  ├─ migrations/
│  └─ seed.ts            # organisasi demo, unit, admin awal, pengaturan bawaan, 3 risiko contoh Cakrawala Air (opsional)
├─ src/
│  ├─ app/
│  │  ├─ (auth)/login/
│  │  ├─ (app)/
│  │  │  ├─ dashboard/
│  │  │  ├─ risks/        # daftar, /new, /[id], /[id]/edit
│  │  │  ├─ heatmap/
│  │  │  ├─ appetite/
│  │  │  ├─ import/
│  │  │  └─ admin/        # users, units, settings, audit-logs
│  │  └─ api/v1/           # route handler (lihat bagian 5)
│  ├─ components/          # RiskForm, RiskTable, HeatMap, LevelBadge, ...
│  ├─ lib/
│  │  ├─ scoring.ts        # rumus skor, tingkat, nilai bersih
│  │  ├─ rbac.ts           # izin per peran dan unit
│  │  ├─ audit.ts          # pencatatan audit log
│  │  ├─ auth.ts, db.ts
│  │  └─ excel.ts          # parser dan penulis Excel
│  ├─ server/services/     # risk.service.ts, appetite.service.ts, import.service.ts
│  └─ validators/          # skema Zod
├─ tests/                  # unit/ dan e2e/
├─ prisma.config.ts      # koneksi langsung untuk Prisma CLI
├─ .env.example
└─ package.json
```

### 2.3 Skema database (Prisma, ringkas)

```prisma
enum Role { ADMIN RISK_OWNER REVIEWER VIEWER }
enum RiskStatus { DRAFT SUBMITTED ACTIVE RETIRED }
enum RiskType { THREAT OPPORTUNITY }

model User {
  id String @id @default(cuid())
  email String @unique
  name String
  passwordHash String
  role Role
  unitId String?
  isActive Boolean @default(true)
}

model Unit {
  id String @id @default(cuid())
  name String @unique
  kind String   // HEAD_OFFICE | BRANCH
}

model Risk {
  id String @id @default(cuid())
  code String @unique
  status RiskStatus @default(DRAFT)
  type RiskType
  category String
  unitId String
  goal String
  identifiedAt DateTime
  description String
  rootCause String
  indicator String
  existingControl String
  qualitativeImpact String
  // inherent
  p Int
  i Int
  score Int
  level String
  probPct Float
  financialImpact Decimal @db.Decimal(20,0)
  netValue Decimal @db.Decimal(20,0)
  // pemilik
  ownerId String
  ownerTitle String
  // penanganan
  strategy String
  treatment String
  treatmentCost Decimal @db.Decimal(20,0) @default(0)
  actionsDone String?
  // residual
  rp Int
  ri Int
  scoreRes Int
  levelRes String
  probPctRes Float
  financialImpactRes Decimal @db.Decimal(20,0)
  netValueRes Decimal @db.Decimal(20,0)
  nextReviewAt DateTime?
  version Int @default(1)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  reviews RiskReview[]
}

model RiskReview {
  id String @id @default(cuid())
  riskId String
  reviewerId String
  reviewedAt DateTime @default(now())
  note String
  rpAfter Int
  riAfter Int
}

model RiskAppetite {
  id String @id @default(cuid())
  category String
  unitId String?          // null = berlaku untuk semua unit
  maxScore Int            // batas skor residual yang dapat diterima
  note String?
  @@unique([category, unitId])
}

model Setting {
  key String @id          // btr, totalRevenue, probPct, levelThresholds
  value Json
}

model AuditLog {
  id String @id @default(cuid())
  actorId String
  entity String
  entityId String
  action String           // CREATE | UPDATE | DELETE | APPROVE | IMPORT ...
  before Json?
  after Json?
  ip String?
  at DateTime @default(now())
  @@index([entity, entityId])
}
```

Nilai turunan (skor, tingkat, nilai bersih) disimpan di tabel agar laporan cepat. Server menghitung ulang setiap kali P, I, atau pengaturan berubah.

**Koneksi database (Prisma 7).** Pasang `prisma`, `@prisma/client`, dan `@prisma/adapter-neon` pada versi mayor yang sama (`@7`), dengan Node.js 20.19 atau lebih baru. Blok `datasource` di `schema.prisma` tidak memuat `url`: Prisma CLI membaca koneksi langsung dari `prisma.config.ts`, sedangkan aplikasi memakai koneksi pooled lewat adapter Neon.

```prisma
// prisma/schema.prisma (bagian atas)
generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}
```

```ts
// prisma.config.ts
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: { url: env('DATABASE_URL_UNPOOLED') },
});
```

```ts
// src/lib/db.ts
import { PrismaClient } from '@/generated/prisma';
import { PrismaNeon } from '@prisma/adapter-neon';

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
export const prisma = new PrismaClient({ adapter });
```

Jika `npx prisma init` membuat `prisma7.config.ts` (Prisma 7.10 ke atas), edit file itu dan jangan membuat `prisma.config.ts` kedua: bila keduanya ada, CLI hanya memuat `prisma7.config.ts`.

**Skema multi-organisasi.** Semua tabel bisnis mendapat kolom `orgId`, kunci unik berlaku per organisasi (misalnya kode risiko unik di dalam satu organisasi), dan `Setting` memakai kunci gabungan `orgId` + `key`. Enum `Role` bertambah `PLATFORM_ADMIN`.

```prisma
enum Role { PLATFORM_ADMIN ADMIN RISK_OWNER REVIEWER VIEWER }

model Organization {
  id String @id @default(cuid())
  name String
  slug String @unique
  currency String @default("IDR")
  isActive Boolean @default(true)
  createdAt DateTime @default(now())
}

model RiskCategory {
  id String @id @default(cuid())
  orgId String
  name String
  @@unique([orgId, name])
}

model ImportMapping {
  id String @id @default(cuid())
  orgId String
  name String
  columns Json            // { "Kode Risiko": "code", "Probabilitas": "p", ... }
  @@unique([orgId, name])
}

model RiskSnapshot {
  id String @id @default(cuid())
  orgId String
  riskId String
  period String           // contoh: 2026-11
  score Int
  level String
  scoreRes Int
  levelRes String
  netValue Decimal @db.Decimal(20,0)
  netValueRes Decimal @db.Decimal(20,0)
  @@unique([riskId, period])
}
```

Perubahan pada model yang sudah ada:

- `User`: tambah `orgId String?` (kosong hanya untuk `PLATFORM_ADMIN`).
- `Unit`, `Risk`, `RiskAppetite`, `AuditLog`: tambah `orgId String`.
- `Unit.name` dan `Risk.code` berubah dari `@unique` menjadi `@@unique([orgId, name])` dan `@@unique([orgId, code])`.
- `Setting`: ganti `@id` pada `key` menjadi `@@id([orgId, key])`.
- `Risk.category` tetap berisi nama kategori, dicocokkan dengan `RiskCategory` saat validasi.

Semua akses data lewat helper `scoped(orgId)` di `src/lib/tenant.ts`; `orgId` diambil dari sesi, tidak pernah dari input klien. Tambahkan test yang memastikan pengguna organisasi A tidak bisa membaca atau mengubah data organisasi B.

### 2.4 Logika skor (src/lib/scoring.ts)

```ts
export type Level = 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';

export interface ScoringConfig {
  btr: number;                          // Rp
  probPct: Record<1 | 2 | 3 | 4 | 5, number>;  // 0..1
  levels: { low: number; medium: number; high: number };  // batas atas skor
}

export const DEFAULT_CONFIG: ScoringConfig = {
  btr: 545_834_931_553,
  probPct: { 1: 0.1, 2: 0.25, 3: 0.5, 4: 0.7, 5: 0.9 },
  levels: { low: 3, medium: 6, high: 12 },
};

export const score = (p: number, i: number) => p * i;

export function level(s: number, c = DEFAULT_CONFIG): Level {
  if (s <= c.levels.low) return 'LOW';
  if (s <= c.levels.medium) return 'MEDIUM';
  if (s <= c.levels.high) return 'HIGH';
  return 'EXTREME';
}

export const financialImpact = (i: number, c = DEFAULT_CONFIG) => (i / 5) * c.btr;

export const netValue = (p: number, i: number, c = DEFAULT_CONFIG) =>
  c.probPct[p as 1 | 2 | 3 | 4 | 5] * financialImpact(i, c);
```

### 2.5 Contoh route handler

```ts
// src/app/api/v1/risks/route.ts
import { requireRole } from '@/lib/rbac';
import { riskCreateSchema } from '@/validators/risk';
import { riskService } from '@/server/services/risk.service';

export async function POST(req: Request) {
  const user = await requireRole(['ADMIN', 'RISK_OWNER']);
  const body = riskCreateSchema.parse(await req.json());
  const risk = await riskService.create(user, body);   // hitung skor + tulis audit log
  return Response.json({ data: risk }, { status: 201 });
}
```

### 2.6 Konvensi

- Logika bisnis ada di `server/services`, bukan di route handler atau komponen.
- Semua input divalidasi dengan Zod; skema yang sama dipakai di form dan API.
- Setiap service yang mengubah data wajib memanggil `audit.log()` dalam transaksi yang sama.
- Cabang Git: `main` (produksi), `develop`, dan `feature/*`; pull request wajib lolos lint dan test.
- Commit mengikuti Conventional Commits (feat, fix, docs, chore).
- Test minimum: unit test untuk `scoring.ts` dan `rbac.ts`, serta e2e untuk alur input → ajukan → setujui.

## 3. Arsitektur

### 3.1 Gambaran

Aplikasi berupa monolith Next.js yang berisi UI dan API, terhubung ke satu database PostgreSQL.

&#91;embedded content: arsitektur · 4 komponen\]

Browser memanggil halaman dan API di aplikasi yang sama, dan hanya service layer yang menulis ke database.

### 3.2 Komponen

| Komponen | Tanggung jawab |
| --- | --- |
| UI (React) | Form, tabel, dashboard, heat map; pratinjau skor di sisi klien |
| API (route handler) | Autentikasi, otorisasi, validasi, mengembalikan JSON |
| Service layer | Aturan bisnis, penghitungan skor, alur persetujuan, impor/ekspor |
| Prisma + PostgreSQL | Penyimpanan data, transaksi, migrasi |
| Audit | Mencatat sebelum dan sesudah setiap perubahan |
| Job penghitungan ulang | Menghitung ulang seluruh risiko saat pengaturan kriteria berubah |

### 3.3 Keputusan arsitektur

| Keputusan | Alasan | Konsekuensi |
| --- | --- | --- |
| Monolith, bukan microservice | Tim kecil, domain sederhana | Mudah dibangun dan di-deploy; dipecah belakangan bila perlu |
| Skor dihitung di server | Hasil konsisten dan tidak bisa dimanipulasi klien | Pratinjau klien memakai fungsi `scoring.ts` yang sama |
| Nilai turunan disimpan | Laporan dan dashboard cepat | Perlu penghitungan ulang saat kriteria berubah |
| Kriteria di tabel Setting | Placeholder "XX" di Excel bisa diisi tanpa deploy ulang | Admin harus mengelola pengaturan dengan hati-hati |
| Sesi JWT (Auth.js) | Cocok untuk serverless di Vercel | Pencabutan sesi bergantung pada masa berlaku token pendek dan flag `isActive` |
| Audit log append-only | Kebutuhan penelusuran | Tabel tumbuh terus; arsipkan berkala |

### 3.4 Keamanan

- HTTPS wajib; cookie sesi `HttpOnly`, `Secure`, `SameSite=Lax`.
- Kata sandi di-hash (argon2), kebijakan panjang minimal 10 karakter, pembatasan percobaan login.
- Otorisasi dilakukan di server pada setiap endpoint (bukan hanya menyembunyikan tombol).
- Risk Owner hanya dapat mengakses risiko unitnya; Viewer hanya baca.
- Semua query lewat Prisma (parameterized) untuk mencegah SQL injection; output di-escape oleh React.
- Unggahan Excel dibatasi tipe, ukuran (misalnya 5 MB), dan jumlah baris (misalnya 1.000 per impor).
- Rahasia (kunci sesi, URL database) hanya di environment variable, tidak pernah di repositori.

### 3.5 Multi-organisasi

Satu database dan satu skema dipakai bersama oleh semua organisasi, dengan kolom `orgId` di setiap tabel bisnis. Pilihan ini sederhana dan murah, cukup untuk puluhan organisasi, tetapi isolasi data bergantung pada kode.

- **Isolasi**: `orgId` selalu berasal dari sesi pengguna; semua query lewat helper `scoped(orgId)`; test isolasi antarorganisasi wajib lulus di CI sebelum rilis.
- **Pengaturan per organisasi**: BTR, probabilitas (%), batas tingkat risiko, unit, kategori, dan Risk Appetite disimpan di database, jadi organisasi baru tidak butuh perubahan kode.
- **Analisis antarperiode**: job terjadwal membuat snapshot skor risiko setiap akhir bulan; dashboard tren membaca snapshot, bukan menghitung ulang riwayat.
- **Perbandingan antarorganisasi**: memakai skor dan tingkat risiko yang seragam, bukan nilai rupiah.
- **Bila butuh isolasi lebih ketat** (permintaan kepatuhan atau kontrak): pindah ke database atau branch Neon terpisah per organisasi, dengan biaya dan pekerjaan operasional lebih besar. Row Level Security PostgreSQL adalah langkah tengah yang bisa ditambahkan tanpa mengubah aplikasi.

## 4. Business Flow

### 4.1 Siklus hidup risiko

&#91;embedded content: siklus status risiko · 4 status, 2 jalur kembali\]

Risk Owner yang mengubah risiko Active mengembalikannya ke Submitted; Reviewer dapat me-retire risiko Active.

- **Draft**: Risk Owner masih mengisi dan dapat mengubah bebas.
- **Submitted**: menunggu Reviewer; data dikunci untuk Risk Owner.
- **Active**: risiko berlaku dan masuk ke dashboard, heat map, dan Risk Appetite.
- **Retired**: risiko tidak berlaku lagi; tetap tersimpan untuk riwayat.
- Perubahan pada risiko Active oleh Risk Owner membuat risiko kembali ke Submitted.

### 4.2 Alur utama

1. **Identifikasi**: Risk Owner membuat risiko baru dan mengisi kategori, unit, sasaran, deskripsi, akar penyebab, indikator, internal control, dan dampak kualitatif.
2. **Analisis inherent**: memilih P dan I; sistem menampilkan skor, tingkat, dan nilai bersih.
3. **Penanganan**: memilih strategi, mengisi rencana penanganan, biaya, dan penanganan yang sudah dilakukan.
4. **Analisis residual**: memilih P' dan I' setelah penanganan; sistem menghitung skor residual dan membandingkannya dengan Risk Appetite.
5. **Pengajuan**: Risk Owner mengajukan; Reviewer menyetujui atau menolak dengan catatan.
6. **Pemantauan**: risiko Active muncul di dashboard dan heat map. Sistem menandai risiko yang melewati tanggal review berikutnya.
7. **Kajian berkala**: Reviewer mencatat hasil kajian dan menilai ulang P' dan I'; tanggal review berikutnya diperbarui.
8. **Penutupan**: risiko yang sudah tidak relevan di-retire.

### 4.3 Alur Risk Appetite

1. Admin menetapkan batas skor residual per kategori (misalnya Operational/Infrastructure maksimal 6) dan pengecualian per unit jika perlu.
2. Saat risiko disimpan atau appetite berubah, sistem membandingkan skor residual dengan batas.
3. Risiko yang melampaui batas ditandai "Di atas appetite" dan muncul di daftar khusus untuk ditindaklanjuti.

### 4.4 Alur impor Excel

1. Admin atau Risk Owner mengunduh templat (sesuai kolom sheet Risk Input).
2. Mengunggah file; sistem menjalankan **dry run**: validasi tipe data, nilai P dan I (1 sampai 5), unit dan kategori yang dikenal, kode risiko ganda.
3. Sistem menampilkan jumlah baris valid dan daftar error per baris.
4. Pengguna memperbaiki file atau melanjutkan untuk baris valid; data masuk sebagai **Draft** dalam satu transaksi dan dicatat di audit log sebagai IMPORT.

### 4.5 Matriks hak akses

| Aksi | Admin | Risk Owner | Reviewer | Viewer |
| --- | --- | --- | --- | --- |
| Lihat dashboard dan heat map | Ya | Ya (unit sendiri) | Ya | Ya |
| Lihat daftar risiko | Semua | Unit sendiri | Semua | Semua |
| Buat dan ubah risiko | Ya | Unit sendiri (Draft) | Tidak | Tidak |
| Ajukan | Ya | Ya | Tidak | Tidak |
| Setujui atau tolak | Ya | Tidak | Ya | Tidak |
| Retire risiko | Ya | Tidak | Ya | Tidak |
| Catat kajian berkala | Ya | Tidak | Ya | Tidak |
| Atur Risk Appetite dan kriteria | Ya | Tidak | Tidak | Tidak |
| Impor Excel | Ya | Unit sendiri | Tidak | Tidak |
| Ekspor Excel | Ya | Unit sendiri | Ya | Ya |
| Kelola pengguna dan unit | Ya | Tidak | Tidak | Tidak |
| Lihat audit log | Ya | Risiko sendiri | Ya | Tidak |

### 4.6 Alur organisasi baru

1. Platform Admin membuat organisasi (nama, slug, mata uang) dan akun Admin pertamanya.
2. Sistem mengisi pengaturan bawaan: probabilitas (%) dan batas tingkat risiko. BTR dikosongkan sampai Admin mengisinya.
3. Admin organisasi mengisi BTR atau total pendapatan, unit kerja, kategori risiko, dan Risk Appetite.
4. Admin mengundang Risk Owner, Reviewer, dan Viewer.
5. Admin atau Risk Owner mengimpor risk register lama: unggah file, petakan kolom (atau pilih templat pemetaan tersimpan), jalankan dry run, lalu simpan sebagai Draft.
6. Setiap akhir bulan sistem menyimpan snapshot skor risiko untuk perbandingan antarperiode.

Platform Admin hanya mengelola organisasi dan akun Admin; akses ke isi risiko sebuah organisasi hanya bila Admin organisasi itu memberikannya.

## 5. API

### 5.1 Konvensi

- Base path: `/api/v1`. Format JSON, kecuali unggah (multipart) dan unduh (xlsx).
- Autentikasi: cookie sesi dari Auth.js. Semua endpoint selain login butuh sesi.
- Sukses: `{ "data": ..., "meta": { ... } }`. Daftar memakai `meta.page`, `meta.limit`, `meta.total`.
- Error: `{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }`.
- Paginasi: `?page=1&limit=20`. Pengurutan: `?sort=score:desc`.

### 5.2 Daftar endpoint

| Metode | Path | Fungsi | Peran |
| --- | --- | --- | --- |
| POST | /auth/login | Login | Publik |
| POST | /auth/logout | Logout | Semua |
| GET | /auth/me | Profil dan peran | Semua |
| GET | /risks | Daftar risiko (filter: q, unit, category, level, status, appetite) | Semua |
| POST | /risks | Buat risiko (Draft) | Admin, Risk Owner |
| GET | /risks/:id | Detail risiko | Semua (sesuai unit) |
| PATCH | /risks/:id | Ubah risiko | Admin, Risk Owner |
| DELETE | /risks/:id | Hapus Draft | Admin |
| POST | /risks/:id/submit | Ajukan | Admin, Risk Owner |
| POST | /risks/:id/approve | Setujui | Admin, Reviewer |
| POST | /risks/:id/reject | Tolak (wajib catatan) | Admin, Reviewer |
| POST | /risks/:id/retire | Retire | Admin, Reviewer |
| GET | /risks/:id/reviews | Riwayat kajian | Semua |
| POST | /risks/:id/reviews | Catat kajian berkala | Admin, Reviewer |
| GET | /risks/:id/audit | Audit log risiko | Admin, Reviewer, Risk Owner |
| GET | /dashboard/summary | Total risiko, nilai bersih, biaya | Semua |
| GET | /dashboard/by-unit | Rekap per unit | Semua |
| GET | /dashboard/heatmap?view=inherent | Data heat map (inherent atau residual) | Semua |
| GET | /appetites | Daftar Risk Appetite | Semua |
| PUT | /appetites/:id | Ubah appetite | Admin |
| GET | /risks/appetite-gap | Risiko di atas appetite | Semua |
| GET | /settings | Kriteria (BTR, probabilitas, batas tingkat) | Semua |
| PUT | /settings | Ubah kriteria | Admin |
| POST | /settings/recalculate | Hitung ulang semua risiko | Admin |
| POST | /imports/risks?dryRun=true | Unggah Excel dan validasi | Admin, Risk Owner |
| POST | /imports/:id/commit | Simpan hasil impor | Admin, Risk Owner |
| GET | /exports/risks.xlsx | Ekspor format Risk Input | Admin, Reviewer, Viewer |
| GET | /exports/risk-register.xlsx | Ekspor versi cetak | Admin, Reviewer, Viewer |
| GET/POST/PATCH | /users, /units | Kelola pengguna dan unit | Admin |
| GET | /audit-logs | Audit log global (filter: entity, actor, tanggal) | Admin, Reviewer |

**Endpoint tambahan untuk multi-organisasi.** Semua endpoint di atas otomatis dibatasi ke organisasi milik sesi pengguna; klien tidak pernah mengirim `orgId`. Endpoint `POST /imports/risks` menerima parameter `mappingId` untuk memakai templat pemetaan.

| Metode | Path | Fungsi | Peran |
| --- | --- | --- | --- |
| GET, POST | /organizations | Daftar dan buat organisasi | Platform Admin |
| PATCH | /organizations/:id | Ubah nama, mata uang, status aktif | Platform Admin |
| GET, POST, PATCH, DELETE | /categories | Kelola kategori risiko organisasi | Admin |
| POST | /imports/risks/preview-columns | Baca header file dan usulkan pemetaan kolom | Admin, Risk Owner |
| GET, POST, PUT | /import-mappings | Templat pemetaan kolom organisasi | Admin, Risk Owner |
| GET | /snapshots?period=2026-11 | Snapshot skor per periode | Semua |
| GET | /dashboard/trend?from=2026-01&to=2026-11 | Perubahan skor dan tingkat risiko antarperiode | Semua |
| GET | /platform/compare?orgIds=a,b | Perbandingan skor dan tingkat risiko antarorganisasi | Platform Admin |

### 5.3 Contoh: membuat risiko

Request `POST /api/v1/risks`:

```json
{
  "type": "THREAT",
  "category": "Operational / Infrastructure Risk",
  "unitId": "unit_qc",
  "goal": "Jadwal penerbangan harus tepat waktu",
  "identifiedAt": "2023-03-14",
  "description": "Keterlambatan jam terbang",
  "rootCause": "Pengecekan teknis pesawat tidak berjadwal; cuaca buruk",
  "indicator": "Keterlambatan jam terbang; ketidakpuasan penumpang",
  "existingControl": "Pemindahan penumpang ke jadwal penerbangan lain",
  "qualitativeImpact": "Perusahaan harus mengalokasikan biaya kompensasi kepada penumpang",
  "p": 4, "i": 4,
  "ownerId": "usr_123", "ownerTitle": "Operational Director",
  "strategy": "MITIGATE",
  "treatment": "Evaluasi jadwal maintenance; bayar kompensasi penumpang",
  "treatmentCost": 54000000,
  "rp": 2, "ri": 2,
  "nextReviewAt": "2023-03-31"
}
```

Response `201`:

```json
{
  "data": {
    "id": "clx...", "code": "LAG001", "status": "DRAFT",
    "inherent": { "score": 16, "level": "EXTREME", "financialImpact": 436667945242, "netValue": 305667561669 },
    "residual": { "score": 4, "level": "MEDIUM", "financialImpact": 218333972621, "netValue": 54583493155 },
    "aboveAppetite": false
  }
}
```

Catatan: nilai bersih pada contoh memakai probabilitas default (indeks 4 = 70%, indeks 2 = 25%) sehingga berbeda dari angka di file Excel asli yang memakai persentase manual.

### 5.4 Kode error

| HTTP | Kode | Arti |
| --- | --- | --- |
| 400 | BAD\_REQUEST | Format permintaan salah |
| 401 | UNAUTHENTICATED | Belum login atau sesi habis |
| 403 | FORBIDDEN | Peran atau unit tidak berhak |
| 404 | NOT\_FOUND | Data tidak ditemukan |
| 409 | CONFLICT | Kode ganda atau versi data sudah berubah (optimistic lock lewat field `version`) |
| 422 | VALIDATION\_ERROR | Data tidak lolos validasi (mis. P di luar 1 sampai 5) |
| 429 | RATE\_LIMITED | Terlalu banyak percobaan |
| 500 | INTERNAL\_ERROR | Kesalahan server |

## 6. Deployment

Rincian paket dan batasnya sudah diperiksa ke dokumentasi resmi Vercel dan Neon pada 16 November 2026 (lihat 6.8). Perhatian utama: paket gratis Vercel (Hobby) hanya untuk penggunaan pribadi non-komersial, sehingga aplikasi yang dipakai perusahaan memerlukan paket Pro. Harga dan batas dapat berubah; cek ulang sebelum go-live.

### 6.1 Lingkungan

| Lingkungan | Cabang Git | Vercel | Database Neon |
| --- | --- | --- | --- |
| Development | lokal | `next dev` | Branch `dev` atau Postgres lokal |
| Preview | pull request | Preview deployment otomatis | Branch `preview` |
| Production | `main` | Production deployment | Branch `main` (production) |

### 6.2 Environment variable

| Nama | Keterangan |
| --- | --- |
| DATABASE\_URL | Connection string Neon pooled (hostname memuat -pooler), dipakai aplikasi lewat adapter Neon |
| DATABASE\_URL\_UNPOOLED | Connection string langsung (tanpa -pooler) untuk Prisma CLI dan migrasi |
| AUTH\_SECRET | Kunci acak untuk menandatangani sesi (`openssl rand -base64 32`) |
| AUTH\_URL | URL aplikasi (jika diperlukan oleh Auth.js) |
| ADMIN\_SEED\_EMAIL, ADMIN\_SEED\_PASSWORD | Akun Admin awal untuk seed (ganti sandi setelah login pertama) |

Simpan di Vercel (Project Settings → Environment Variables), terpisah per lingkungan. Jangan commit file `.env`.

### 6.3 Langkah deployment pertama

1. Push kode ke repositori GitHub.
2. Buat project di Neon; catat connection string pooled dan direct. Buat branch untuk dev dan preview.
3. Di lokal, jalankan `npx prisma migrate deploy` dan `npx prisma db seed` ke database production (sekali, atau lewat pipeline).
4. Import repositori di Vercel; framework terdeteksi sebagai Next.js.
5. Isi environment variable sesuai 6.2.
6. Deploy; verifikasi halaman login, buat risiko uji, cek dashboard.
7. Hubungkan domain kustom jika ada; Vercel menyediakan HTTPS otomatis.

Catatan: aplikasi memakai `DATABASE_URL` (pooled) lewat adapter Neon, sedangkan `prisma migrate` memakai `DATABASE_URL_UNPOOLED` yang dibaca `prisma.config.ts` (lihat 2.3). Compute Neon paket Free tidur setelah 5 menit tidak aktif, jadi permintaan pertama bisa lambat; jika muncul error P1001, tambahkan `connect_timeout=15` pada connection string.

### 6.4 CI/CD (GitHub Actions)

- Pada pull request: install, `lint`, `tsc --noEmit`, `vitest`, lalu Playwright terhadap preview deployment.
- Pada merge ke `main`: jalankan `prisma migrate deploy` ke database production, lalu Vercel membangun dan merilis otomatis.
- Migrasi harus kompatibel mundur (tambah kolom dulu, hapus kolom di rilis berikutnya) agar rollback aplikasi aman.

### 6.5 Backup, pemantauan, dan rollback

- **Backup**: Neon Free menyimpan riwayat restore hanya 6 jam; Launch hingga 7 hari dan Scale hingga 30 hari (riwayat ditagih per GB-bulan). Backup terjadwal hanya ada di paket berbayar; lengkapi dengan ekspor Excel berkala dan `pg_dump` harian ke penyimpanan terpisah, terutama di paket Free.
- **Pemantauan**: log Vercel untuk error API, uptime check (mis. layanan ping gratis) pada `/api/health`, dan peringatan jika tingkat error naik.
- **Rollback aplikasi**: promosikan deployment Vercel sebelumnya.
- **Rollback data**: restore ke titik waktu sebelum migrasi bermasalah (buat branch Neon dari titik tersebut, lalu verifikasi sebelum dipakai).

### 6.6 Checklist go-live

- [ ] Pengaturan kriteria (BTR, total pendapatan, probabilitas %, batas tingkat) sudah dikonfirmasi pemilik proses.
- [ ] Unit kerja, pengguna, dan peran sudah dimasukkan; sandi Admin awal diganti.
- [ ] Data Excel lama sudah diimpor dan dicek per unit.
- [ ] Risk Appetite per kategori sudah diisi.
- [ ] Uji akses: Risk Owner tidak bisa melihat atau mengubah unit lain.
- [ ] Backup dan prosedur restore sudah diuji.
- [ ] Domain dan HTTPS aktif; endpoint `/api/health` dipantau.
- [ ] Pelatihan singkat untuk Risk Owner dan Reviewer selesai.

* [ ] Paket Vercel sesuai penggunaan (Pro bila dipakai perusahaan) dan pemakaian Neon dipantau agar tidak melewati batas paket Free.

### 6.7 Alternatif: Docker di VPS

Jika data harus berada di server sendiri: bangun image Next.js dengan `output: 'standalone'`, jalankan bersama PostgreSQL dengan Docker Compose, tempatkan Nginx atau Caddy sebagai reverse proxy dengan HTTPS (Let's Encrypt), dan atur backup `pg_dump` harian. Alur CI/CD sama, tetapi langkah rilis berupa build image dan `docker compose up -d`.

### 6.8 Paket dan biaya (diperiksa 16 November 2026)

Untuk tugas kuliah atau uji coba, Vercel Hobby dan Neon Free cukup. Untuk dipakai perusahaan, Vercel Hobby tidak boleh dipakai karena hanya untuk penggunaan pribadi non-komersial, dan Neon Free hanya menyimpan riwayat restore 6 jam.

| Layanan | Paket | Harga | Batas utama |
| --- | --- | --- | --- |
| Vercel | Hobby | Gratis | Hanya personal non-komersial; per bulan 100 GB Fast Data Transfer, 1 juta function invocation, 4 jam Active CPU; maksimal 100 deployment per hari; log runtime 1 jam |
| Vercel | Pro | US$20 per pengguna per bulan (kursi Viewer gratis), ditambah pemakaian di atas kredit | Boleh komersial; maksimal 6.000 deployment per hari; log runtime 1 hari |
| Neon | Free | Gratis | 1 GB penyimpanan dan 100 CU-jam per bulan per project; 10 branch; compute tidur setelah 5 menit; riwayat restore 6 jam dan 1 snapshot manual |
| Neon | Launch | Sesuai pemakaian: US$0,106 per CU-jam, US$0,35 per GB-bulan, tanpa biaya minimum | Riwayat restore hingga 7 hari (US$0,20 per GB-bulan); backup terjadwal; scale to zero bisa dimatikan; 10 branch per project |

Jika CU-jam atau transfer jaringan Neon Free habis, compute berhenti sampai bulan berikutnya (data tidak dihapus) dan koneksi `pg_dump` pun gagal; jika penyimpanan 1 GB penuh, penulisan gagal tetapi data masih bisa dibaca. Paket Scale (riwayat 30 hari, SLA, SOC 2) hanya perlu bila ada kebutuhan kepatuhan.

**Sumber** (dibuka 16 November 2026):

- [Neon: Plans](https://neon.com/docs/introduction/plans), diperbarui 12 November 2026
- [Neon: Connect from Prisma to Neon](https://neon.com/docs/guides/prisma-migrate), diperbarui 5 Oktober 2026
- [Vercel: Hobby plan](https://vercel.com/docs/plans/hobby-plan), diperbarui 12 November 2026
- [Vercel: Fair use guidelines](https://vercel.com/docs/limits/fair-use-guidelines), aturan penggunaan komersial Hobby; cek juga Terms of Service Vercel sebelum dipakai perusahaan

## Lampiran: Rencana pengerjaan

| Fase | Cakupan |
| --- | --- |
| 1 (fondasi) | Setup repositori, skema database, auth dan peran, `scoring.ts` beserta test |
| 2 (inti) | CRUD risiko, alur persetujuan, audit log, daftar dengan filter |
| 3 (analitik) | Dashboard, heat map, Risk Appetite |
| 4 (data) | Impor dan ekspor Excel, pengaturan kriteria dan penghitungan ulang |
| 5 (rilis) | Pengujian e2e, deployment, migrasi data lama, pelatihan |

## Lampiran: Glosarium

Istilah berikut sama dengan tab Istilah di prototipe PetaRisiko dan dipakai sebagai bahan belajar. Definisi ditulis dari pemahaman umum manajemen risiko; sesuaikan dengan materi kuliah bila ada versi yang berbeda.

### Dasar

| Istilah | Definisi | Di aplikasi |
| --- | --- | --- |
| Risk register | Daftar terstruktur semua risiko organisasi beserta penilaian, pemilik, dan rencana penanganannya. | Tab Register |
| Risiko | Kejadian yang belum pasti terjadi tetapi, bila terjadi, mengganggu pencapaian sasaran. Contoh: keterlambatan jam terbang mengganggu sasaran jadwal tepat waktu. | Kolom Risiko di Register |
| Ancaman dan peluang | Ancaman (threat) adalah risiko berdampak negatif. Peluang (opportunity) adalah risiko berdampak positif yang bisa dimanfaatkan. | Form Input risiko |
| Sasaran | Tujuan yang ingin dicapai unit kerja dan yang terancam oleh risiko. | Form Input risiko |
| Kategori risiko | Pengelompokan jenis risiko. Bawaan contoh: Strategy and Planning (keputusan dan rencana strategis), Finance (keuangan), Operational/Infrastructure (proses, sistem, orang, prasarana), dan Hazard (kecelakaan, bencana, keselamatan). Daftarnya bisa diganti. | Pengaturan, Form Input risiko |
| Unit kerja | Bagian organisasi tempat risiko berada dan ditangani. | Pengaturan, filter Register |
| Akar penyebab | Sumber masalah yang membuat risiko bisa terjadi. Menangani akar penyebab mencegah risiko berulang. | Form Input risiko |
| Indikator risiko | Tanda awal yang bisa diamati bahwa risiko akan atau sedang terjadi. | Form Input risiko |
| Internal control | Kendali yang sudah berjalan sekarang untuk menahan risiko, sebelum ada penanganan tambahan. | Form Input risiko |
| Dampak kualitatif | Akibat risiko dalam bentuk uraian (misalnya reputasi atau pelayanan), bukan angka. | Form Input risiko |
| Kode risiko | Pengenal unik tiap risiko, misalnya LAG001. | Kolom Kode di Register |

### Penilaian

| Istilah | Definisi | Di aplikasi |
| --- | --- | --- |
| Probabilitas (P) | Seberapa mungkin risiko terjadi, skala 1 (sangat kecil) sampai 5 (sangat besar). | Form Input risiko, sumbu vertikal Heat map |
| Dampak (I) | Seberapa parah akibat bila risiko terjadi, skala 1 (ringan sekali) sampai 5 (sangat berat). | Form Input risiko, sumbu horizontal Heat map |
| Skor risiko | Probabilitas × dampak, nilainya 1 sampai 25. Contoh: P 4 × I 4 = 16. | Badge di Register |
| Tingkat risiko | Kelas dari skor: Low, Medium, High, Extreme high. Batas contoh: 1 sampai 3, 4 sampai 6, 8 sampai 12, 15 sampai 25. Batasnya bisa diatur. | Warna badge dan Heat map, Pengaturan |
| Risiko inherent | Tingkat risiko sebelum penanganan tambahan dijalankan. | Kolom Inherent |
| Risiko residual | Risiko yang masih tersisa setelah penanganan, dinilai ulang dengan P’ dan I’. Idealnya lebih rendah dari inherent. | Kolom Residual, tombol Residual di Heat map |
| BTR (batas toleransi risiko) | Batas kerugian yang masih sanggup ditanggung organisasi, dipakai sebagai patokan dampak finansial. Di file contoh Cakrawala Air nilainya 43% dari total pendapatan. | Pengaturan |
| Dampak finansial | Taksiran kerugian dalam rupiah: indeks dampak ÷ 5 × BTR. Indeks 4 berarti 80% dari BTR. | Detail risiko di Register |
| Probabilitas (%) | Persentase kemungkinan yang dipasangkan pada tiap indeks P, misalnya indeks 4 = 70%. Bisa diatur. | Pengaturan |
| Nilai bersih | Probabilitas (%) × dampak finansial: perkiraan kerugian yang diharapkan dari sebuah risiko. | Dashboard, detail risiko |
| Heat map | Matriks 5 × 5 dari probabilitas dan dampak yang menempatkan tiap risiko pada sel berwarna sesuai tingkatnya. | Tab Heat map |
| Risk appetite | Besar risiko yang bersedia diterima organisasi demi mencapai tujuannya. Risiko residual di atas appetite perlu ditangani lagi. | Belum ada di prototipe; direncanakan (bagian 1.3 dan 4.3) |

### Penanganan

| Istilah | Definisi | Di aplikasi |
| --- | --- | --- |
| Pemilik risiko | Orang yang bertanggung jawab memantau dan menangani sebuah risiko, lengkap dengan jabatannya. | Form Input risiko |
| Avoid | Menghindari: tidak memulai atau menghentikan kegiatan yang menimbulkan ancaman. | Field Strategi |
| Transfer | Memindahkan sebagian kerugian ke pihak lain, misalnya lewat asuransi atau alih daya. | Field Strategi |
| Mitigate | Mengurangi: menurunkan probabilitas, dampak, atau keduanya. | Field Strategi |
| Accept | Menerima: sadar memilih tidak bertindak lebih jauh dan hanya memantau. | Field Strategi |
| Exploit | Untuk peluang: memastikan peluang benar-benar terjadi. | Field Strategi |
| Share | Untuk peluang: menggandeng pihak lain agar peluang lebih mudah diraih. | Field Strategi |
| Enhance | Untuk peluang: meningkatkan probabilitas atau manfaatnya. | Field Strategi |
| Biaya penanganan | Dana yang dibutuhkan untuk menjalankan rencana penanganan. Bandingkan dengan nilai bersih yang berhasil diturunkan. | Form Input risiko, Dashboard |

### Pemantauan

| Istilah | Definisi | Di aplikasi |
| --- | --- | --- |
| Review berikutnya | Tanggal risiko dinilai ulang. Risiko perlu ditinjau berkala karena kondisi berubah. | Form Input risiko |
| Status Active dan Retired | Active berarti risiko masih berlaku. Retired berarti sudah tidak relevan tetapi tetap tersimpan sebagai riwayat. | Form Input risiko |
