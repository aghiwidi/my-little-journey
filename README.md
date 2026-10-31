# MY LITTLE JOURNEY — Vinka Sri Aulia Rinata

Personal portfolio statis untuk Vinka Sri Aulia Rinata. Website menggunakan HTML, CSS, JavaScript, GitHub, Cloudflare Pages, dan Pages CMS. Tidak memerlukan server berbayar.

## 1. Jalankan dan uji lokal

Persyaratan: Node.js 18 atau lebih baru.

```bash
npm run build
npx serve dist
```

Buka alamat lokal yang ditampilkan. Folder `dist/` adalah hasil build dan dibuat ulang otomatis.

## 2. Upload ke GitHub

1. Buat repository baru bernama `my-little-journey` di https://github.com/new.
2. Ekstrak ZIP ini.
3. Upload **seluruh isi folder `my-little-journey`** ke root repository (jangan upload folder pembungkusnya).
4. Pastikan `.pages.yml`, `content/`, `media/`, `assets/`, `scripts/`, dan `package.json` ikut terunggah.
5. Commit ke branch `main`.

## 3. Deploy ke Cloudflare Pages

1. Buka Cloudflare Dashboard → Workers & Pages → Create application → Pages → Connect to Git.
2. Pilih repository GitHub.
3. Framework preset: None.
4. Production branch: `main`.
5. Build command: `npm run build`.
6. Build output directory: `dist`.
7. Root directory: `/`.
8. Save and Deploy. Setiap commit baru akan memicu deployment.

## 4. Aktifkan dashboard CMS

1. Buka https://app.pagescms.org/ dan login dengan akun GitHub yang memiliki repository.
2. Berikan izin GitHub App Pages CMS hanya ke repository `my-little-journey` jika opsi tersebut tersedia.
3. Buka repository dan branch `main`. Pages CMS membaca file `.pages.yml` dari root.
4. Sidebar CMS memiliki **Website Settings**, **Video YouTube**, **Jurnal / Artikel**, serta media **Foto Website** dan **Foto Isi Jurnal**.

Pages CMS adalah dashboard eksternal berbasis GitHub, bukan halaman `/admin` yang ditanam di website. CMS menulis perubahan ke repository sebagai commit; Cloudflare kemudian membangun ulang website.

## 5. Mengganti foto homepage

Di Pages CMS buka **Website Settings**. Kamu dapat mengubah:

- Foto Hero
- Foto About Me
- Foto Portfolio Traveling
- Foto Portfolio Modeling
- Foto Portfolio Bridal Makeup
- Thumbnail Video Default
- Sampul Jurnal Default

Pilih field gambar, upload foto, lalu simpan. Foto tersimpan di `media/images/`. Gunakan JPG atau WebP yang sudah dikompres; hero sebaiknya portrait, foto portfolio landscape. Jangan mengunggah foto yang tidak memiliki izin publikasi.

Di menu media **Foto Website**, kamu juga dapat mengunggah dan mengelola gambar yang nanti dipilih dari field gambar.

## 6. Mengunggah video YouTube

1. Upload video ke YouTube terlebih dahulu dan pastikan pemilik video mengizinkan embedding.
2. Pages CMS → **Video YouTube** → New entry.
3. Isi Judul Video, URL Slug unik (huruf kecil dan tanda hubung), Deskripsi, Link YouTube, Kategori, Tanggal Publikasi, dan Thumbnail.
4. Set Status ke `draft` untuk disimpan privat dari daftar publik atau `published` untuk ditampilkan.
5. Simpan. Video tampil di `/video.html`; halaman pemutarnya memakai `/watch.html?slug=slug-video`.

Contoh URL YouTube: `https://www.youtube.com/watch?v=VIDEO_ID`.

## 7. Menulis jurnal

1. Pages CMS → **Jurnal / Artikel** → New entry.
2. Isi Judul, URL Slug unik, Tanggal, Kategori, Ringkasan, Foto Sampul, dan Isi Artikel.
3. Isi artikel menggunakan editor rich-text (Markdown). Gunakan heading `##` untuk subjudul.
4. Status `draft` menyimpan artikel sebagai draft; `published` menampilkannya di `/jurnal.html`.
5. Simpan. Halaman detail dapat dibagikan melalui `/article.html?slug=slug-artikel`.

Gambar di dalam artikel diunggah melalui editor dan disimpan di `media/articles/`.

## 8. Mengedit profil dan teks homepage

Pages CMS → **Website Settings**. Nama pemilik, tagline, intro hero, heading dan paragraf About Me, deskripsi Portfolio, Behind the Scenes, My Goals, quote, link Instagram, dan username Instagram dapat diubah dari sana. Perubahan teks tersebut akan tampil setelah deployment selesai.

## 9. Cara kerja draft dan publish

- `draft`: tidak ditampilkan pada daftar video/jurnal publik.
- `published`: masuk ke daftar publik dan diurutkan dari tanggal terbaru.
- Jangan menggunakan slug yang sama untuk dua entri.
- Jika mengubah slug, gunakan nama file JSON yang sesuai dengan slug. Periksa file di GitHub bila CMS tidak mengganti nama file otomatis.

## 10. Domain www.vinkasar.my.id

1. Deploy dan pastikan URL `*.pages.dev` berfungsi lebih dahulu.
2. Cloudflare Pages → project → Custom domains → masukkan `www.vinkasar.my.id`.
3. Ikuti record DNS persis seperti yang diminta Cloudflare.
4. Di IDWebhost, periksa DNS yang sudah ada sebelum menambah/mengubah record. Jangan menghapus MX, TXT, atau record lain yang tidak terkait.
5. Jika Cloudflare meminta migrasi nameserver/zone, berhenti dulu dan inventarisasi seluruh DNS aktif sebelum menyetujuinya.
6. HTTPS akan aktif setelah domain tervalidasi dan sertifikat diterbitkan.

## 11. Keamanan dan batasan

- Jangan bagikan akses GitHub/CMS kepada orang yang tidak dipercaya.
- Jangan menyimpan password atau API key di file website.
- Video disimpan dan di-host oleh YouTube; CMS hanya menyimpan URL dan thumbnail.
- Website tidak mengirim formulir email dan tidak meminta nomor telepon.
- Foto awal adalah placeholder, bukan foto pribadi pemilik.
- CMS dan Cloudflare belum terhubung ke akun pengguna sampai langkah otorisasi dan deployment dilakukan.

## 12. Troubleshooting

- Konten tidak muncul: periksa status `published`, tanggal, dan deployment Cloudflare.
- Foto tidak tampil: pastikan file berada di media yang benar dan field gambar berisi path `/media/...`.
- Video tidak bisa diputar: pastikan video public/unlisted dan embedding tidak dibatasi pemiliknya.
- CMS tidak melihat menu: pastikan `.pages.yml` berada di root branch `main` dan refresh/reopen repository di Pages CMS.
- Build gagal: jalankan `npm run build` lokal dan baca pesan error.
