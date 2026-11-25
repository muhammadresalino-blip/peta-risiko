# Contributing to PetaRisiko

## Setup Development

```bash
npm install
npm run db:push      # buat database lokal
npm run db:seed      # isi data demo
npm run dev          # start server lokal
```

Akses: http://localhost:3000

## Cara Bikin Fitur

1. Buat issue di GitHub untuk fitur baru
2. Dibuktikan perlu sisanya: role, UI, validation
3. Update UI component sesuai design system token
4. Endpoint otomatis: create fungsi service lalu buat route handler
5. Validasi di server menggunakan Zod di validators/
6. Jalankan unit test (jika ada)

## Kebijakan Code

- **Type safety**: tidak boleh pakai `any`, gunakan union types jika kebutuhan spesifik
- **Naming**: ikuti camelCase di TypeScript, simple verb-root sebagai return
- **Error handling**: selalu throw HttpError dengan kode & message yang jelas (403, 404, 422)
- **Tanpa hard-coded value**: gunakan token dari `globals.css` untuk warna, & konstanta dari AGENTS.md untuk batas risiko

## Buat Memperbaiki Bug

1. Buka issue atau pull request yang relevan
2. Cari bug peka: bug di product spec diread di AGENTS.md
3. Ubah di tempat yang tengah (misal scoring logic, bukan hanya UI)
4. Uji di lokal:
   - `npm run typecheck`
   - `npm run build`
5. Jalankan membuat uji (jika ada)
6. Commit, push, buka PR

## Pull Request Template

```markdown
**Perubahan:**
- ...
- ...

**Mengapa perlu:**
...

**Status UTTP:**
- UI: diperbaiki
- Business rule: terjaga
- Validasi: ada di sisi server
```

## Housekeeping

- Aktifkan GitHub Actions untuk menjalankan typecheck & build
- Jalankan `npm run build` sebelum commit
- Selalu update tutorial.md bila ada fitur baru
- Update CHANGELOG.md setiap rilis