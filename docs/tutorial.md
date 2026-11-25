# PetaRisiko Tutorial Pengguna

Aplikasi web manajemen risiko untuk organisasi. Panduan ini mengajarkan Anda cara menggunakan fitur utama dari awal sampai mahir.

---

## 1. Mengakses Aplikasi

1. Buka browser dan akses: **http://localhost:3000**
2. Login dengan akun demo:
   - Email: `admin@petarisiko.local`
   - Password: `Admin12345!`

> **Tips**: Anda bisa menggunakan akun lain seperti `owner@petarisiko.local` atau `reviewer@petarisiko.local` untuk melihat perbedaan hak akses.

---

## 2. Dashboard - Ringkasan Risiko

Setelah login, Anda akan diarahkan ke **Dashboard**.

### Lakukan ini:

1. **Analisis visual**
   - Lihat kartu "Jumlah risiko", "Nilai bersih inherent", "Nilai bersih residual", dan "Biaya penanganan"
   - Lihat tabel di bawah (rekap per unit kerja) melihat risiko per unit

2. **Heat Map**
   - Klik **Buka heat map** untuk melihat tingkat risiko dalam matriks 5×5
   - Heat map menunjukkan daftar risiko di setiap sel (P × I) dengan warna tingkat risiko

3. **Tren Snapshot**
   - Klik **Ambil snapshot** untuk mengambil snapshot data saat ini ke riwayat
   - Snapshot menyimpan skor dan status untuk perbandingan tren

4. **Review jatuh tempo**
   - Daftar risiko yang review-nya mendekati tanggal jatuh tempo → 3 bulan ke depan
   - Pastikan review berkala untuk update residual endpoint

---

## 3. Mencatat Risiko Baru

### Langkah 1: Masuk ke halaman Register

Klik menu **Register Risiko** di sidebar.

### Langkah 2: Tambah risiko baru

1. Klik tombol **"Catat risiko"**
2. Isi field berikut (atau biarkan default untuk demo):

   | Bagian | Field | Penjelasan |
   |--------|-------|------------|
   | **Identifikasi** | Tipe | Ancaman (threat) / Peluang (opportunity) |
   | | Kategori | Contoh: Sindikasi, Operasional, Keuangan |
   | | Unit kerja | Pilih unit yang memegang risiko |
   | | Sasaran | Apa yang terancam? |
   | | Deskripsi risiko | Deskripsi lengkap risiko tersebut |
   | | Akar penyebab | Sumber masalah |
   | | Indikator risiko | Cara mengukur risiko |
   | | Internal control | Kontrol yang sudah ada |
   | | Dampak kualitatif | Deskripsi dampak lebih jelas |

### Langkah 3: Analisis Inherent (baik sebelum penanganan)

Isi probabilitas (**P**) dan dampak (**I**) dari 1–5:

- **Probabilitas (P)** = seberapa sering risiko terjadi
- **Dampak (I)** = seberapa besar akibat jika risiko terjadi

Lihat pratinjau:
- Skor inherent = **P × I**
- Tingkat risiko muncul (Low/Medium/High/Extreme High)
- Nilai bersih inherent muncul (rsiak keuangan perkiraan)

### Langkah 4: Analisis Residual (setelah penanganan)

Setelah analisis inherent, lanjut ke **Analisis residual**:

1. Isi **Probabilitas residual (P')** dan **Dampak residual (I')** setelah kontroll yang ada bekerja
2. Pratinjau residual akan menampilkan:
   - Skor residual, tingkat, dan nilai bersih setelah penanganan
   - **Peringatan** jika skor residual > skor inherent (ikon peringatan amber)

⚠️ **Penting**: Residual harus lebih kecil atau sama dengan inherent. Jika residual > inherent, revisi penilaian.

### Langkah 5: Simpan

1. Pilih **Pemilik risiko**
2. Pilih **Strategi** (Avoid, Transfer, Mitigate, Accept, dll)
3. Kamu opsional (biarkan kosong)
4. Klik **"Simpan risiko"**

Risiko disimpan sebagai **DRAFT** dan terlihat di halaman detail.

---

## 4. Menguji Aturan Residual

Untuk melihat alert residual > inherent:

1. Edit risiko yang sudah ada (di halaman detail)
2. Ubah P atau I residual jadi lebih besar dari P/I inherent
3. Gunakan formulir pratinjau – kamu akan melihat _warning_ menampilkan skor residual lebih tinggi dari inherent
4. Diagram yang akan muncul di *detail risiko* memori tombol _warning_

---

## 5. Tampilan Detail Risiko

Di halaman detail, kamu akan melihat dua panel:

### Panel kiri – Risiko Inherent
- Skor inherent & tingkat risiko
- P × I, probabilitas, dampak finansial, nilai bersih

### Panel kanan – Risiko Residual
- Skor residual & tingkat risiko
- P' × I', probabilitas residual, dampak finansial residual, nilai bersih residual
- **Batas appetite kategori** – menunjukkan apakah risiko di atas atau di dalam batas

### Aksi sesuai peran
Klik tombol di bagian atas:
- **Ajukan ke Reviewer** → draft → submitted
- **Review** → tulis catatan & set residual baru
- **Approve** → submitted → active (hanya bisa dilakukan oleh Reviewer)
- **Reject** → draft (hanya bisa dilakukan oleh Reviewer)
- **Retire** → retired (setelah risiko tidak relevan)
- **Hapus** → hapus risiko (hanya bisa dilakukan Risk Owner saat status Draft)

---

## 6. Heat Map – Peta Tingkat Risiko

Heat Map membantu melihat sebaran risiko secara visual:

1. Buka menu **Heat Map**
2. Di header kamu dapat memilih tampilan: *Inherent* atau *Residual*
3. Matriks 5×5 menampilkan:
   - **Baris = Probabilitas (P / P')**
   - **Kolom = Dampak (I / I')**
   - Setiap sel menampilkan:
     - Kuwadrant risiko
     - Label teks tingkat risiko
     - Daftar risiko di sel tersebut (kode risiko, jumlah)

Legenda tingkat risiko:
- **Low** (hijau)
- **Medium** (kuning/cokelat)
- **High** (oranye)
- **Extreme High** (merah)

---

## 7. Risk Appetite – Batas Risiko

### Bagaimana Risk Appetite bekerja

Risk Appetite = batas maksimal skor residual yang diperbolehkan per kategori risiko.

Jika risiko > batas → status `di atas appetite` (nampak di many halaman).

### Lihat risiko di atas appetite

1. Buka menu **Risk Appetite**
2. Daftar menampilkan risiko yang melampaui batas appetite (label merah)

---

## 8. Referensi Skor dan Tingkat Risiko

| Tingkat Risiko | Rentang Skor | Warna | Risiko |
|----------------|--------------|-------|--------|
| **Low** | 1–3 | Hijau | Kemungkinan kecil & dampak kecil |
| **Medium** | 4–6 | Kuning | Secara wajar bisa terjadi |
| **High** | 7–12 | Oranye | Berpotensi menurunkan operasi |
| **Extreme High** | 13–25 | Merah | Sangat berisiko & membutuhkan tindakan segera |

---

## 9. Peran yang Tersedia

| Peran | Hak Akses |
|-------|-----------|
| **Platform Admin** | Kelola organisasi, perbandingan antar-organisasi (tidak melihat data risiko) |
| **Admin** | Admin organisasi, bisa membuat unit, user, setting |
| **Risk Owner** | Bisa mencatat risiko **unitnya**, edit saat Draft, ajukan ke Reviewer |
| **Reviewer** | Bisa review, approve, reject risiko Risk Owner |
| **Viewer** | Melihat hanya, tidak boleh edit, ajukan, atau review |

---

## 10. Pengaturan Organisasi

Buka menu **Pengaturan** untuk mengubah:

- **BTR (BESARPENDEAPATEM)** – Total pendapatan riil (untuk dampak finansial)
- **Probabilitas persentase** – 10%, 25%, 50%, 70%, 90% (bisa direset ke default)
- **Batas Tingkat Risiko** – Low 1–3, Medium 4–6, High 8–12
- Tombol **"Hitung ulang semua risiko"** untuk recompute skor residual berdasarkan perubahan setting

Klik **"Simpan"** setelah perubahan.

---

## 11. Hub dengan Aturan Bisnis

1. **Skor residual never melebihi inherent**
   - Form menampilkan warning jika residual > inherent
   - Banner di halaman detail juga menampilkan warning
   - Server men-return warning pada API juga

2. **Appetite tidak boleh melampaui**
   - Server menandai `aboveAppetite = true` ketika residual > batas
   - Visual di semua halaman (badge merah, label merah)

3. **Audit Log**
   - Setiap CREATE/UPDATE/DELETE/SUBMIT/APPROVE/REJECT/RETIRE/IMPORT/SETTINGS/RECALCULATE benar-benar dicatat
   - Buka menu **Audit Log** untuk melihat riwayat perubahan risiko, user, waktu, dan pergerakan

---

## 12. Ekspor Risiko

### Ekspor Excel

1. Buka menu **Register Risiko**
2. Klik **"Ekspor"** di bawah halaman
3. Pilih jenis file:
   - **PetaRisiko Risk Register** – biasa, detail semua risiko
   - **Risk Input** – format spesifik untuk upload (tapi Excel asli belum tersedia)

### Cetak

1. Klik menu **"Daftar Risiko"** → klik tombol **"Cetak"**
2. Halaman akan langsung tercetak (PDF) dalam ukuran A4 landscape tanpa sidebar

---

## 13. Impor Risiko dari Excel

Penting: Ingat file import dan ekspor adalah visual/heuristics; file Risk Input aslinya tidak dirilis secara matang sehingga aplikasi bereksperimen, kita meng-upload struktur dan pemetaan yang ada.

1. Buka menu **"Import"**
2. Pilih file Excel (batas 5 MB atau 1000 baris)
3. Terima kombinasi kolom otomatis atau sesuaikan dengan drag-and-drop (valu custom)
4. Klik **"Perbarui pratinjau"**
   - Dry run akan memvalidasi:
     - Tipe data
     - P dan I antara 1–5
     - Unit & kategori wajib ada
5. Kita juga bisa menyimpan pemetaan sebagai templat
6. Setelah konfirmasi, baris yang valid akan di import sebagai DRAFT
7. Kita bisa menghapus baris error sebelum commit

---

## 14. Teknis: Cara Membuat Risiko Dari Halaman Detail

1. Klik risiko dari **Register Risiko** → detail risiko
2. Di detail risiko, klik **"Edit"** (jika status Draft)
3. Ubah field panduan Form risiko
4. Kamu bisa langsung melihat update pratinjau saat mentok
5. Klik **"Simpan perubahan"**
   - **Catatan: Translate final edisinya.** Form sudah ada peringatan residual > inherent dan di detail risiko archive banner ingatan jika residual > inherent.

---

## 15. Pengelolaan Pengguna dan Unit

### Manajemen Pengguna

1. Buka menu **Admin -> Users**
2. **Tambah user**:
   - Nama, Email, Password (minimal 10 karakter)
   - Pilih peran: Admin, Risk Owner, Reviewer, Viewer
   - Unit kerja (opsional)
3. **Edit/Nonaktifkan user**:
   - Klik tombol di kolom action
   - User nonaktif tidak bisa login

### Manajemen Unit

1. Buka menu **Admin -> Units**
2. **Tambah unit**:
   - Nama unit (Contoh: Head Office)
   - Tipe: Head Office atau Branch Office
   - Unit tidak bisa dihapus jika masih dipakai

---

## 16. Fitur Tambahan

### Kajian Berkala (Review)

1. Saat risiko status `Active`, reviewer dapat melakukan kajian:
   - Tulis catatan
   - Masukkan P residual baru & I residual baru
   - Kamu klik tombol **"Kaji"** di detail risiko
2. Skor residual akan dihitung lagi berdasarkan review baru
3. Review disimpan dengan data dan di pi saj di halaman detail

### Lampiran Bukti

1. Di halaman detail risiko, ada menu **"Lampiran bukti"**
2. Unggah bukti: PDF, gambar, spreadsheet, DOCX (maksimal 10 MB)
3. Bukti disimpan di folder `public/uploads/<orgId>/<riskId>` dengan nama UUID
4. List lampiran menampilkan nama file, ukuran, tanggal upload

### Audit Log

1. Buka menu **Admin -> Audit Logs**
2. Filter berdasarkan:
   - Entitas (Risk / User / Setting / dll)
   - Aksi (CREATE / UPDATE / DELETE ...)
   - Tanggal

 Audit log sudah sesuai dengan design system dan token colors.

---

## 17. FAQ

**Q: Kenapa residual melebihi inherent muncul peringatan?**  
A: Karena risk management bertujuan memperbaiki risiko, bukan memperburuknya. Peringatan menandai kemungkinan konservatif dalam penilaian residual.

**Q: Bagaimana mengubah tingkat risiko?**  
A: Perubahan tingkat risiko muncul saat skor dihitung berdasarkan P dan I. Admin bisa mengubah batas tingkat di Pengaturan untuk recalculating secara massal.

**Q: Bisa ekspor ke format lain?**  
A: Saat ini hanya Excel. Format lain (PDF, CSV) bisa ditambahkan di masa depan.

**Q: Bagaimana mendapatkan notifikasi?**  
A: Saat ini tidak ada, tapi audit log tetap mencatat setiap perubahan.

---

## 18. Demo Workflow

Berikut workflow lengkap karakteris (misal kamu role: Risk Owner):

1. **Login** → Dashboard
2. Klik **"Catat risiko"** → Isi form inherent → Analisis residual → Simpan (Draft)
3. Klik menu **"Daftar Risiko"** → lihat risiko baru (status Draft)
4. Klik risiko → **"Edit"** → Simpan perubahan
5. Klik **"Ajukan ke Reviewer"** (status menjadi Submitted)
6. Tunggu reviewer melakukan kajian & approve (status menjadi Active)
7. Buka menu **"Heat Map"** untuk melihat posisi risiko dalam matriks
8. Buka menu **"Risk Appetite"** untuk melihat batas & risiko yang melampaui
9. Buka menu **"Audit Log"** untuk melihat riwayat perubahan risiko

---

## 19. Checklist Quickly Start

- [ ] Login ke http://localhost:3000
- [ ] Lihat Dashboard & coba ambil snapshot
- [ ] Buat risiko baru dari menu **Register Risiko**
- [ ] Coba edit, submit, review, approve risiko
- [ ] Buka Heat Map (Inherent & Residual)
- [ ] Cek Risk Appetite dengan membuat batas & lihat risiko di atas
- [ ] Ekspor risiko ke Excel
- [ ] Buka Audit Log untuk memverifikasi pencatatan setiap aksi

---

## 20. Kesalahan yang Sering Terjadi

| Error | Penyebab | Solusi |
|-------|----------|--------|
| Meta residual > inherent | Input residual (P', I') lebih besar dari inherent (P, I) | Revisi penilaian residual, pastikan penutupan memperbaiki risiko |
| Gagal login | Password salah / akun tidak aktif | Cek akun demo atau minta Admin untuk membuat akun baru |
| Tidak bisa submit | Status risiko bukan Draft | Hanya risiko Draft yang bisa di-submit oleh Risk Owner |
| Tidak bisa edit | Status risiko bukan Draft | Bisa edit risiko Draft; risiko active harus dicari kembali ke Submitted |
| Tidak bisa review | Status risiko Active, task review wajib | Risk Owner review boleh, tapi reviewer review wajib ppti |

---

## 21. Domain & Konsep Utama

| Istilah | Definisi |
|---------|----------|
| **Inherent (ambil)** | Skor risiko sebelum penanganan (P × I) |
| **Residual** | Skor risiko setelah penanganan (P' × I') |
| **Appetite** | Batas maksimal skor residual yang diperbolehkan per kategori |
| **Tingkat Risiko** | Low / Medium / High / Extreme High (bergantung pada batas yang diatur organisasi) |
| **BTR** | Base Total Revenue (pendapatan organisasi) – digunakan untuk dampak finansial |
| **Mitigasi** | Rencana tindakan atau kontrol yang diambil untuk mengurangi risiko |
| **KRI (Key Risk Indicator)** | Metrik numerik untuk memantau risiko seiring waktu |
| **Snapshot** | Data risiko pada masa tertentu untuk analisis tren |

---

## 22. Penutup

Selamat, kamu sekarang sudah familiar dengan PetaRisiko! Dengan mengikuti tutorial ini, kamu:

- ✅ Telah memahami fitur utama aplikasi
- ✅ Tahu cara mencatat dan mengelola risiko
- ✅ Mengerti alur kerja Risk Owner, Reviewer, dan Viewer
- ✅ Bisa menggunakan Heat Map dan Risk Appetite
- ✅ Memahami aturan bisnis residual never tak melampaui inherent
- ✅ Mengetahui lokasi audit log dan ekspor risiko

Selamat menggunakan aplikasi manajemen risiko!

---

**Dokumen ini dihasilkan sesuai standar PetaRisiko Corporate Navy & Teal.**