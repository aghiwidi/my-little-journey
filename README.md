# MY LITTLE JOURNEY — Portfolio + Custom Admin

Website portfolio statis Vinka Sri Aulia Rinata dengan dashboard privat di `/admin`. Dashboard menggunakan username + password + OTP email. Pengguna admin **tidak perlu login GitHub**; GitHub hanya dipakai server sebagai penyimpanan konten setelah pemilik website menyiapkan koneksi satu kali.

## Arsitektur

- Cloudflare Pages: website publik dan halaman admin.
- Cloudflare Worker: API admin, autentikasi, OTP, dan GitHub API.
- Cloudflare D1: akun admin, challenge OTP, sesi, dan rate limit.
- Cloudflare R2: penyimpanan foto yang diunggah dari dashboard.
- Resend: pengiriman OTP email.
- GitHub repository: penyimpanan JSON konten; setiap perubahan memicu build/deploy Pages.
- URL admin: `https://vinkasar.my.id/admin/`
- URL API: `https://api.vinkasar.my.id`
- Username awal: `vinkasar263121`

**Status:** kode dashboard dan backend telah disiapkan. Integrasi belum aktif sampai resource Cloudflare, domain pengirim Resend, GitHub token, dan secrets milik pemilik website dikonfigurasi. Jangan menganggap login/OTP sudah bisa dipakai sebelum semua langkah di bawah selesai.

## 1. Upload project ke GitHub

1. Buat repository `my-little-journey` (atau gunakan repository yang sudah dipakai untuk website).
2. Upload seluruh isi folder proyek ke root repository, termasuk `admin/`, `worker/`, `scripts/`, `wrangler.toml`, `package.json`, dan konten website.
3. Commit ke branch `main`.
4. Buat Fine-grained Personal Access Token GitHub untuk repository tersebut dengan akses **Contents: Read and write**. Simpan token secara privat; token hanya akan dimasukkan sebagai Cloudflare Worker secret, tidak ke file website.

Admin tidak akan meminta pengguna login GitHub. Token diperlukan di sisi server agar dashboard bisa menyimpan perubahan ke repository.

## 2. Buat resource Cloudflare

Pastikan domain `vinkasar.my.id` sudah aktif sebagai zone di Cloudflare. Jangan menghapus atau mengganti record DNS yang sudah ada tanpa memeriksa dampaknya.

### D1 database

Di terminal pada root project:

```bash
npx wrangler d1 create my-little-journey-admin
```

Salin `database_id` dari hasil perintah. Buka `wrangler.toml`, ganti `REPLACE_WITH_D1_DATABASE_ID` dengan ID tersebut.

### R2 bucket

```bash
npx wrangler r2 bucket create my-little-journey-media
```

Lalu buka Cloudflare Dashboard → R2 → bucket `my-little-journey-media` → Settings → Custom Domains. Hubungkan subdomain `media.vinkasar.my.id`. Tunggu sampai domain R2 aktif. Pastikan `R2_PUBLIC_BASE_URL` di `wrangler.toml` adalah `https://media.vinkasar.my.id`.

### Worker API domain

Setelah Worker dideploy, buka Workers & Pages → Worker `my-little-journey-admin-api` → Settings → Domains & Routes → Add Custom Domain: `api.vinkasar.my.id`.

## 3. Atur konfigurasi `wrangler.toml`

Periksa nilai berikut:

- `database_id`: ID D1 yang dibuat.
- `GITHUB_OWNER`: username atau organisasi GitHub pemilik repository.
- `GITHUB_REPO`: nama repository, default `my-little-journey`.
- `GITHUB_BRANCH`: branch produksi, default `main`.
- `SITE_ORIGINS`: `https://vinkasar.my.id,https://www.vinkasar.my.id`
- `R2_PUBLIC_BASE_URL`: `https://media.vinkasar.my.id`
- `ADMIN_USERNAME`: username admin yang telah diisi di `wrangler.toml`. `ADMIN_EMAIL` disimpan sebagai Worker secret, bukan variabel publik.

Jangan masukkan password, token GitHub, atau API key Resend ke `wrangler.toml`.

## 4. Siapkan Resend untuk email OTP

1. Buat/masuk akun di https://resend.com/.
2. Tambahkan dan verifikasi domain pengirim yang kamu miliki, misalnya `vinkasar.my.id`.
3. Resend akan memberikan record DNS verifikasi (DKIM dan record lain yang diminta). Tambahkan record tersebut di pengelola DNS yang aktif tanpa menghapus record email yang sudah ada.
4. Tunggu sampai Resend menyatakan domain terverifikasi.
5. Gunakan alamat pengirim pada domain terverifikasi, misalnya `MY LITTLE JOURNEY <admin@vinkasar.my.id>`.

Email penerima OTP ditetapkan melalui secret `ADMIN_EMAIL`. `RESEND_FROM` adalah alamat pengirim, bukan email penerima.

## 5. Pasang dependencies, migrasi D1, dan secrets

Jalankan dari root project:

```bash
npm install
npx wrangler d1 migrations apply my-little-journey-admin --remote
```

Masukkan secrets satu per satu. Wrangler akan meminta nilainya secara interaktif:

```bash
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put RESEND_FROM
npx wrangler secret put ADMIN_EMAIL
npx wrangler secret put GITHUB_TOKEN
npx wrangler secret put OTP_PEPPER
npx wrangler secret put BOOTSTRAP_SECRET
```

Keterangan:
- `RESEND_API_KEY`: API key dari Resend.
- `RESEND_FROM`: alamat pengirim yang sudah diverifikasi, misalnya `MY LITTLE JOURNEY <admin@vinkasar.my.id>`.
- `ADMIN_EMAIL`: alamat penerima OTP administrator yang sudah ditentukan pemilik. Masukkan `vinkasriauliarinata@gmail.com` saat Wrangler meminta nilainya; alamat ini disimpan sebagai secret Worker.
- `GITHUB_TOKEN`: Fine-grained token dengan izin Contents read/write untuk repository website.
- `OTP_PEPPER`: rahasia acak panjang (minimal 32 karakter) untuk hashing OTP. Simpan aman; jangan dihapus.
- `BOOTSTRAP_SECRET`: rahasia acak panjang untuk membuat akun admin pertama. Simpan sementara untuk inisialisasi, lalu hapus dari Worker setelah akun dibuat.

Buat `OTP_PEPPER` dan `BOOTSTRAP_SECRET` yang berbeda. Jangan gunakan password login sebagai salah satunya.

## 6. Deploy Worker API

```bash
npx wrangler deploy
```

Setelah deployment, atur custom domain `api.vinkasar.my.id` melalui dashboard seperti pada bagian 2. Tes endpoint `https://api.vinkasar.my.id/health`. Respons yang diharapkan memuat `"ok": true`.

## 7. Buat password admin pertama

Password admin tidak ditanam di kode. Pemilik membuat password sendiri pada proses inisialisasi pertama.

Di PowerShell Windows, dari root folder project:

```powershell
$env:BOOTSTRAP_SECRET = "MASUKKAN_BOOTSTRAP_SECRET_YANG_TADI_DIBUAT"
npm run admin:setup
```

Script akan meminta password baru secara tersembunyi di terminal. Gunakan password unik minimal 12 karakter dan simpan di password manager. Script mengirim permintaan inisialisasi satu kali ke Worker.

Jika berhasil, segera hapus bootstrap secret dari Worker:

```bash
npx wrangler secret delete BOOTSTRAP_SECRET
```

Hapus juga environment variable sementara dari terminal:

```powershell
Remove-Item Env:BOOTSTRAP_SECRET
```

Endpoint setup akan menolak inisialisasi kedua setelah akun admin pertama tercatat. Jangan membagikan bootstrap secret atau password kepada siapa pun.

## 8. Deploy website ke Cloudflare Pages

Pada project Pages yang sudah terhubung ke GitHub:

- Framework preset: None
- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `/`

Setelah commit, Pages akan membangun ulang website. Folder `admin/` ikut masuk ke hasil build, sedangkan kode Worker dan migrasi D1 tidak ikut dipublikasikan ke folder `dist`.

Buka `https://vinkasar.my.id/admin/`. `/admin` akan diarahkan ke `/admin/`.

## 9. Cara menggunakan dashboard

1. Buka `https://vinkasar.my.id/admin/`.
2. Username: `vinkasar263121`.
3. Masukkan password yang dibuat pada langkah inisialisasi.
4. Masukkan kode OTP yang dikirim ke `vinkasriauliarinata@gmail.com`.
5. Setelah verifikasi, dashboard terbuka.

Menu:
- **Overview**: jumlah video, jurnal, dan konten terpublikasi.
- **Website Settings**: nama, tagline, deskripsi, quote, Instagram, serta foto hero/about/portfolio.
- **Video Manager**: tambah/edit/hapus video YouTube, thumbnail, kategori, tanggal, draft/published.
- **Journal Manager**: tambah/edit/hapus jurnal, foto sampul, ringkasan, isi Markdown, kategori, tanggal, draft/published.
- **Account Settings**: mengganti password admin.
- **Logout**: mengakhiri sesi.

Foto yang diunggah melalui admin diterima Worker, disimpan ke R2, lalu URL hasil upload dapat dipakai pada pengaturan website, video, atau jurnal. Format gambar JPG, PNG, WebP, dan GIF; maksimal 8 MB per file.

Konten teks/video/jurnal disimpan sebagai JSON di GitHub melalui GitHub API. Cloudflare Pages membangun ulang website setelah commit GitHub. Perubahan tidak selalu muncul seketika; tunggu deployment Pages selesai.

## 10. Keamanan dan batasan

- Password di-hash dengan PBKDF2-SHA-256 (310.000 iterasi) dan salt acak.
- OTP 6 digit berlaku 5 menit, maksimal 5 percobaan per challenge, dan pengiriman dibatasi.
- Sesi menggunakan cookie HttpOnly, Secure, SameSite=Strict, berlaku 12 jam.
- Endpoint admin memerlukan sesi valid; API memeriksa Origin yang diizinkan.
- Token GitHub, Resend API key, OTP pepper, dan bootstrap secret hanya disimpan sebagai Worker secrets.
- Jangan aktifkan `BOOTSTRAP_SECRET` lagi setelah akun admin dibuat.
- Simpan backup repository dan D1 secara berkala.
- Dashboard ini dibuat untuk satu admin awal. Manajemen banyak admin/role belum disediakan.
- Upload foto membutuhkan R2 custom domain yang sudah aktif.
- OTP membutuhkan Resend sender domain terverifikasi dan API key aktif.
- Perubahan konten membutuhkan GitHub token yang masih valid dan memiliki izin Contents read/write.

## 11. Troubleshooting

- **OTP tidak masuk:** cek spam, status verifikasi domain pengirim Resend, `RESEND_FROM`, dan `RESEND_API_KEY`.
- **Login API error:** cek Worker logs, D1 migration, dan `OTP_PEPPER`.
- **GitHub 401/403:** buat ulang token dengan izin Contents read/write untuk repository yang benar, lalu `wrangler secret put GITHUB_TOKEN`.
- **GitHub 404:** pastikan `GITHUB_OWNER`, `GITHUB_REPO`, path konten, dan branch benar.
- **Upload gagal:** pastikan bucket R2 binding bernama `MEDIA` dan custom domain media aktif.
- **CORS / Failed to fetch:** pastikan admin dibuka dari `https://vinkasar.my.id` atau `https://www.vinkasar.my.id`, dan Worker custom domain `api.vinkasar.my.id` aktif.
- **Halaman admin 404:** pastikan build terbaru sukses dan `dist/admin/index.html` tersedia.
- **Perubahan belum terlihat di website:** periksa status deployment Cloudflare Pages dan log build.

## 12. Pengujian lokal

```bash
npm run build
```

Build statis tidak memerlukan secrets. Untuk menguji backend Worker secara lokal dibutuhkan konfigurasi D1/R2 lokal dan secrets pengembangan; jangan gunakan database produksi untuk percobaan yang belum dipahami.

**Penting:** implementasi ini sudah disiapkan dalam source project. Ia belum terhubung ke akun Cloudflare, Resend, atau GitHub milik pemilik website sampai konfigurasi dan deployment di atas selesai.
