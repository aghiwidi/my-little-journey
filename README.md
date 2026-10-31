# MY LITTLE JOURNEY

Website portfolio personal Vinka Sri Aulia Rinata dengan dashboard admin privat.

## Isi project

- Homepage portfolio, halaman Video, Journal, detail artikel, dan detail video.
- Admin dashboard di `/admin/`.
- Worker API untuk login, konten GitHub, upload foto ke R2, dan pengaturan password.
- D1 untuk akun dan sesi admin.
- R2 untuk foto.
- Build statis yang menghasilkan `dist/` beserta JSON publik di `dist/data/`.
- Logo SVG, logo mark, favicon SVG, dan Apple touch icon.

## Konfigurasi Cloudflare Pages

Project Pages yang sudah terhubung ke repository ini:

- Framework preset: `None`
- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: kosong (`/`)

Jangan membuat ulang Pages project atau mengubah domain yang sudah aktif.

## Build lokal

```bash
npm install
npm run build
```

Folder `content/jurnal` dan `content/videos` boleh belum berisi file JSON. Build akan tetap berjalan. Pengaturan wajib ada di `content/settings/site.json`.

Hasil build akan berisi:
- `dist/data/site.json`
- `dist/data/videos.json`
- `dist/data/jurnal.json`
- seluruh halaman, asset, admin, logo, dan favicon.

## Cloudflare Worker yang sudah ada

`wrangler.toml` mempertahankan konfigurasi resource project yang sudah digunakan:

- Worker: `my-little-journey-admin-api`
- D1: `my-little-journey-admin`
- R2: `my-little-journey-media`
- API domain: `api.vinkasar.my.id`
- Media domain: `media.vinkasar.my.id`
- GitHub repository: `aghiwidi/my-little-journey`
- Branch: `main`

Jangan mengubah `database_id`, nama binding, nama bucket, atau custom domain tanpa alasan dan pemeriksaan terlebih dahulu.

Worker secrets tidak disimpan di repository. Secret GitHub token tetap harus tersedia sebagai `GITHUB_TOKEN` pada Worker. `BOOTSTRAP_SECRET` hanya diperlukan untuk inisialisasi admin pertama; jangan mengaktifkannya kembali setelah admin sudah dibuat.

## Login Admin

Buka `https://vinkasar.my.id/admin/`.

- Username awal: `vinkasar263121`
- Password: password administrator yang sudah dibuat sebelumnya.
- Login menggunakan username dan password, tanpa OTP email.

Jangan memasukkan password, token, atau secret ke file repository.

## Mengelola konten

- Website Settings: ubah teks, foto Hero, About, portfolio, dan Instagram.
- Video Manager: kelola video YouTube dan status draft/published.
- Journal Manager: kelola artikel, kategori, sampul, dan status draft/published.
- Account Settings: ganti password admin.

Konten disimpan sebagai JSON di GitHub. Setiap penyimpanan akan memicu deployment Pages otomatis. Tunggu sampai deployment sukses sebelum memeriksa perubahan publik.

## Catatan keamanan

- Jangan commit `.env`, `.dev.vars`, API keys, password, atau token.
- Jangan menghapus resource D1/R2 yang sudah digunakan.
- Jangan menjalankan migrasi database ulang secara manual jika tabel sudah tersedia.
- Buat backup repository sebelum mengganti seluruh file.


## Logo dan editor foto
- Identitas logo dan favicon menggunakan monogram huruf **V**.
- Admin menyediakan editor crop sebelum upload untuk foto Hero, About, Portfolio, thumbnail video, dan sampul jurnal.
- Foto dapat diatur dengan rasio 4:5, 3:2, 16:9, 1:1, atau rasio asli; posisi dapat digeser dan diperbesar sebelum diunggah.
- Hasil crop diunggah sebagai JPEG ke bucket R2.
