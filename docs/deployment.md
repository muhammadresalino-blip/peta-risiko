# Deployment Produksi

Panduan men-deploy PetaRisiko: aplikasi Next.js 15 di **Vercel** dan database **PostgreSQL/Neon**.

---

## 1. Prasyarat

- Akun [Vercel](https://vercel.com) (gratis untuk proyek pribadi).
- Akun [Neon](https://neon.tech) atau database PostgreSQL lain (Supabase, RDS, dll).
- Repo GitHub: `https://github.com/muhammadresalino-blip/peta-risiko`.

---

## 2. Siapkan Database PostgreSQL

1. Buat project di Neon, salin **connection string**:
   - `DATABASE_URL` — koneksi pooled.
   - `DATABASE_URL_UNPOOLED` — koneksi direct (dipakai untuk migrasi).
2. Ubah provider Prisma dari `sqlite` ke `postgresql`:

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

3. (Disarankan) Ubah kolom uang `Float` menjadi `Decimal` agar presisi:

```prisma
netValue       Decimal @db.Decimal(20, 0)
netValueRes    Decimal @db.Decimal(20, 0)
financialImpact Decimal @db.Decimal(20, 0)
// ...kolom finansial lainnya
```

> Jika tetap memakai `Float`, aplikasi tetap berjalan; nilai dibulatkan ke rupiah.

---

## 3. Migrasi & Seed

Jalankan dari mesin lokal dengan environment produksi:

```bash
# Windows PowerShell
$env:DATABASE_URL="postgresql://...pooled..."
$env:DATABASE_URL_UNPOOLED="postgresql://...direct..."

npx prisma migrate dev --name init
npx prisma migrate deploy
npm run db:seed
```

Catatan:
- `migrate dev` membuat folder `prisma/migrations` (commit folder ini).
- `db:seed` membuat organisasi demo + akun Admin. Untuk produksi, sebaiknya buat seed khusus atau daftarkan organisasi lewat Platform Admin.
- Ganti password Admin default segera setelah seed.

---

## 4. Deploy ke Vercel

1. Buka Vercel → **Add New Project** → import repo GitHub.
2. Framework otomatis terdeteksi sebagai **Next.js**.
3. Tambahkan **Environment Variables**:

| Key | Nilai |
| --- | --- |
| `DATABASE_URL` | connection string pooled Neon |
| `DATABASE_URL_UNPOOLED` | connection string direct (opsional, untuk build/migrasi) |
| `AUTH_SECRET` | hasil `openssl rand -base64 32` |
| `AUTH_URL` | `https://<domain-vercel-anda>` |
| `ADMIN_SEED_EMAIL` | email admin produksi |
| `ADMIN_SEED_PASSWORD` | password kuat (min. 10 karakter) |

4. Deploy.
5. Setelah deploy, buka domain Vercel → login dengan akun admin.

> Build command default `npm run build` sudah menjalankan `postinstall` (`prisma generate`).

---

## 5. Checklist Keamanan Produksi

- [ ] `AUTH_SECRET` acak, berbeda dari nilai development.
- [ ] Password akun demo diganti atau akun demo dinonaktifkan.
- [ ] `AUTH_URL` memakai HTTPS.
- [ ] Database hanya menerima koneksi SSL (default Neon).
- [ ] Folder `public/uploads` tidak di-commit dan memiliki strategi penyimpanan (lihat batasan).
- [ ] Aktifkan GitHub Actions `Quality Checks` pada branch `main`.
- [ ] Review izin Platform Admin: hanya mengelola organisasi, tidak melihat data risiko tenant.
- [ ] Aktifkan backup otomatis database.
- [ ] Tambahkan rate limit di level platform (mis. Vercel WAF) bila trafik publik.

---

## 6. Setelah Deploy

1. **Buat organisasi baru** lewat akun Platform Admin (`/organizations`).
2. Undang Admin organisasi, lalu atur:
   - Unit kerja (`/admin/units`)
   - Pengguna & peran (`/admin/users`)
   - Pengaturan BTR, probabilitas, batas tingkat (`/admin/settings`)
   - Risk Appetite (`/appetite`)
3. Catat risiko pertama lewat **Register Risiko → Catat risiko**.
4. Ambil snapshot awal di Dashboard untuk baseline tren.

---

## 7. Migrasi Database Selanjutnya

Setiap perubahan `prisma/schema.prisma`:

```bash
npx prisma migrate dev --name deskripsi_perubahan   # lokal
git add prisma/migrations                            # commit migrasi
git push
npx prisma migrate deploy                            # produksi
```

---

## 8. Rollback

- **Aplikasi**: Vercel → Deployments → pilih deployment sebelumnya → **Promote to Production**.
- **Database**: gunakan fitur restore/backup Neon. Migrasi Prisma tidak otomatis rollback; siapkan backup sebelum migrasi destruktif.

---

## 9. Keterbatasan yang Perlu Diketahui

- Lampiran bukti disimpan di filesystem `public/uploads`, yang **tidak persisten** di Vercel. Untuk produksi, pindahkan ke object storage (S3/R2) dan sesuaikan route lampiran.
- Snapshot bulanan dan hitung ulang belum terjadwal otomatis; gunakan cron job (Vercel Cron) yang memanggil `POST /api/v1/snapshots` dan `POST /api/v1/settings/recalculate`.
- Notifikasi email/WhatsApp, SSO, dan integrasi keuangan belum termasuk MVP.
