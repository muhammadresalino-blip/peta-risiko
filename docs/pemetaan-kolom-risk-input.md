# Pemetaan kolom sheet Risk Input

Dokumen ini mencatat kolom yang dipakai aplikasi untuk impor dan ekspor Excel, serta hasil verifikasi terhadap dokumen produk.

## Sumber dan status verifikasi

- Acuan: **PetaRisiko: Dokumen Produk dan Teknis v1.0**, bagian MVP: “CRUD risiko dengan **38 field** mengikuti sheet Risk Input”.
- File Excel asli Cakrawala Air (`.xlsm`) **tidak tersedia** saat pengembangan; hanya PDF yang tersedia. PDF menyebut jumlah 38 field tetapi **tidak merinci nama kolomnya**.
- Karena itu, verifikasi dilakukan terhadap model data dan form aplikasi:
  - Model `Risk` memiliki **38 kolom bisnis** (tanpa `id`).
  - Ekspor `risk-input.xlsx` menulis **31 kolom**.
  - **7 field** ada di model tetapi tidak diekspor karena bersifat teknis atau turunan tambahan.
  - **21 field** dapat diisi lewat impor; 10 kolom turunan dihitung ulang server dan diabaikan bila ada di file.

Saat file `.xlsm` asli tersedia, cocokkan nama kolom pada tabel di bawah. Perbedaan nama dapat diselesaikan lewat **templat pemetaan** tanpa mengubah kode.

## 31 kolom ekspor `risk-input.xlsx`

| No | Kolom Excel | Field internal | Jenis | Catatan |
| ---: | --- | --- | --- | --- |
| 1 | Kode Risiko | `code` | Input | Unik per organisasi; dibuat otomatis bila kosong. |
| 2 | Tipe | `type` | Input | `THREAT` / `OPPORTUNITY`; diimpor dari teks “Ancaman/Peluang”. |
| 3 | Kategori Risiko | `category` | Input | Harus cocok dengan kategori organisasi. |
| 4 | Unit Kerja | `unit` → `unitId` | Input | Dicocokkan berdasarkan nama unit. |
| 5 | Sasaran | `goal` | Input | Default `—` bila kosong saat impor. |
| 6 | Tanggal Identifikasi | `identifiedAt` | Input | Format `YYYY-MM-DD`; default hari ini. |
| 7 | Deskripsi Risiko | `description` | Input (wajib) | Tidak boleh kosong. |
| 8 | Akar Penyebab | `rootCause` | Input | |
| 9 | Indikator | `indicator` | Input | |
| 10 | Internal Control | `existingControl` | Input | |
| 11 | Dampak Kualitatif | `qualitativeImpact` | Input | |
| 12 | Probabilitas | `p` | Input (wajib) | Bilangan bulat 1–5. |
| 13 | Dampak | `i` | Input (wajib) | Bilangan bulat 1–5. |
| 14 | Skor | `score` | Turunan | `P × I`. |
| 15 | Tingkat | `level` | Turunan | Batas tingkat dari pengaturan organisasi. |
| 16 | Probabilitas (%) | `probPct` | Turunan | Pemetaan P → % dari pengaturan. |
| 17 | Dampak Finansial | `financialImpact` | Turunan | `(I ÷ 5) × BTR`. |
| 18 | Nilai Bersih | `netValue` | Turunan | `probabilitas × dampak finansial`. |
| 19 | Pemilik Risiko | `owner` → `ownerId` | Input | Email atau nama pengguna; fallback ke pengimpor. |
| 20 | Jabatan Pemilik | `ownerTitle` | Input | |
| 21 | Strategi | `strategy` | Input | Avoid/Transfer/Mitigate/Accept/Exploit/Share/Enhance. |
| 22 | Rencana Penanganan | `treatment` | Input | |
| 23 | Biaya Penanganan | `treatmentCost` | Input | Angka rupiah. |
| 24 | Probabilitas Residual | `rp` | Input | Bilangan bulat 1–5; default sama dengan `p`. |
| 25 | Dampak Residual | `ri` | Input | Bilangan bulat 1–5; default sama dengan `i`. |
| 26 | Skor Residual | `scoreRes` | Turunan | `P' × I'`. |
| 27 | Tingkat Residual | `levelRes` | Turunan | |
| 28 | Nilai Bersih Residual | `netValueRes` | Turunan | |
| 29 | Status | `status` | Alur | Impor selalu menghasilkan `DRAFT`. |
| 30 | Di atas Appetite | `aboveAppetite` | Turunan | Dihitung dari appetite kategori/unit. |
| 31 | Review Berikutnya | `nextReviewAt` | Input | Tanggal; dipakai untuk daftar review jatuh tempo. |

## 7 field model yang tidak diekspor

| Field | Alasan |
| --- | --- |
| `orgId` | Teknis multi-tenant; diisi dari sesi. |
| `probPctRes` | Turunan probabilitas residual; dapat ditambahkan bila sheet asli memintanya. |
| `financialImpactRes` | Turunan dampak finansial residual; dapat ditambahkan bila sheet asli memintanya. |
| `actionsDone` | Catatan tindakan yang sudah dilakukan; belum termasuk format Risk Input. |
| `version` | Optimistic locking. |
| `createdAt` | Metadata audit. |
| `updatedAt` | Metadata audit. |

**Rekonsiliasi jumlah:** 31 kolom ekspor + 7 field di atas = **38 field risiko** pada model, sesuai jumlah yang disebut dokumen. Nama kolom pada sheet asli tetap perlu dicek saat file tersedia.

## 21 field yang dapat diimpor

`code`, `type`, `category`, `unit`, `goal`, `identifiedAt`, `description`, `rootCause`, `indicator`, `existingControl`, `qualitativeImpact`, `p`, `i`, `owner`, `ownerTitle`, `strategy`, `treatment`, `treatmentCost`, `rp`, `ri`, `nextReviewAt`.

Kolom turunan berikut **diabaikan** bila ada di file, lalu dihitung ulang server: `score`, `level`, `probPct`, `financialImpact`, `netValue`, `scoreRes`, `levelRes`, `netValueRes`, `status`, `aboveAppetite`.

## Deteksi otomatis header

Deteksi memakai nama yang dinormalisasi (huruf kecil, tanpa spasi/tanda baca). Alias yang dikenali:

| Field | Alias header |
| --- | --- |
| `code` | Kode Risiko, Kode, ID Risiko |
| `type` | Tipe, Jenis Risiko |
| `category` | Kategori Risiko, Kategori |
| `unit` | Unit Kerja, Unit |
| `goal` | Sasaran, Tujuan |
| `identifiedAt` | Tanggal Identifikasi, Tgl Identifikasi |
| `description` | Deskripsi Risiko, Deskripsi, Risiko |
| `rootCause` | Akar Penyebab, Penyebab |
| `indicator` | Indikator Risiko, Indikator |
| `existingControl` | Internal Control, Pengendalian |
| `qualitativeImpact` | Dampak Kualitatif |
| `p` | Probabilitas, P |
| `i` | Dampak, I |
| `strategy` | Strategi |
| `treatment` | Rencana Penanganan, Penanganan |
| `treatmentCost` | Biaya Penanganan, Biaya |
| `rp` | Probabilitas Residual, RP |
| `ri` | Dampak Residual, RI |
| `owner` | Pemilik Risiko, Pemilik |
| `ownerTitle` | Jabatan Pemilik, Jabatan |
| `nextReviewAt` | Review Berikutnya, Tanggal Review |

Header lain dapat dipetakan manual di wizard impor, lalu disimpan sebagai **templat pemetaan organisasi** (`import-mappings`).

## Aturan validasi impor (dry run)

- `p` dan `i` wajib bilangan bulat 1–5; `rp`/`ri` default ke nilai inherent.
- Unit kerja dan kategori harus sudah terdaftar pada organisasi.
- Deskripsi risiko wajib diisi.
- Kode risiko opsional; bila diisi harus unik di dalam organisasi.
- Maksimal 1.000 baris dan 5 MB per unggahan.
- Hanya baris valid yang disimpan, sebagai `DRAFT`, dalam satu transaksi dengan audit `IMPORT`.
