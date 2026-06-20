# Sistem Presensi Event (Next.js + MySQL)

Aplikasi presensi kehadiran berbasis QR Code, dengan login admin, export PDF
bertanda tangan, pengaturan lokasi per event, dan dukungan dua bahasa
(Indonesia/Inggris).

## Fitur

- **Login admin** — halaman `/admin` dan seluruh API pengelolaan event
  dilindungi autentikasi (lihat bagian Keamanan).
- Admin membuat event (nama, tanggal, waktu, lokasi, PIC) di `/admin`.
- Setiap event otomatis mendapat QR Code yang mengarah ke halaman presensi
  publik `/presensi/[id]`, dengan tampilan yang **responsif untuk HP**
  (langsung nyaman dipakai begitu QR di-scan dari ponsel).
- Peserta mengisi nama, asal instansi, jabatan, dan tanda tangan (digambar
  langsung di layar — mendukung jari/touchscreen maupun mouse).
- Tanggal & jam presensi diambil otomatis dari waktu server saat data disimpan.
- **Deteksi lokasi peserta dapat diaktifkan/dinonaktifkan per event** dari
  halaman detail event. Jika dinonaktifkan, peserta tidak akan diminta izin
  lokasi sama sekali.
- Admin dapat melihat daftar peserta yang hadir secara real-time di halaman
  detail event.
- **Export PDF** daftar hadir, lengkap dengan **gambar tanda tangan tiap
  peserta**, nama, instansi, jabatan, waktu hadir, dan koordinat lokasi
  (jika ada).
- **Dua bahasa**: Indonesia & Inggris, dapat diganti langsung dari tombol
  ID/EN di setiap halaman (pilihan bahasa disimpan otomatis di perangkat
  pengguna).

## Struktur Database

Lihat `schema.sql`. Dua tabel utama: `events` (kini dengan kolom
`waktu_event` dan `require_location`) dan `participants` (relasi 1 event -> banyak peserta).

> **Upgrade dari instalasi lama?** Jika database `presensi_db` sudah pernah
> dibuat sebelumnya, jalankan migrasi manual berikut agar kolom baru tersedia:
> ```sql
> ALTER TABLE events ADD COLUMN require_location TINYINT(1) NOT NULL DEFAULT 1;
> ALTER TABLE events ADD COLUMN waktu_event TIME NULL;
> ```
> (Perintah ini juga tercantum di bagian bawah `schema.sql`.)

## Cara Menjalankan

### 1. Persyaratan

- **Node.js v20 ke atas (LTS)** — versi ini penting karena fitur login admin
  memakai Web Crypto API bawaan Node.js yang baru stabil tanpa flag mulai
  Node.js v19/v20. Jika memakai Node.js v18, login admin bisa gagal.
- MySQL v5.7 / v8.0

### 2. Siapkan database

```bash
mysql -u root -p < schema.sql
```

### 3. Install dependencies

```bash
npm install
```

### 4. Konfigurasi environment

Salin `.env.example` menjadi `.env.local`:

```bash
cp .env.example .env.local
```

Lalu sesuaikan isinya:

| Variabel | Keterangan |
|---|---|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Kredensial MySQL Anda |
| `NEXT_PUBLIC_BASE_URL` | URL **lengkap** aplikasi termasuk subpath, dipakai untuk membentuk link di dalam QR Code. Contoh production: `https://u-talent.uika-bogor.ac.id/presensi` |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | Kredensial login halaman admin. **Wajib diganti** dari nilai default sebelum dipakai sungguhan |
| `ADMIN_SESSION_SECRET` | Kunci rahasia untuk menandatangani session login. **Wajib diisi string acak & rahasia** sebelum production (contoh membuatnya: `openssl rand -base64 32`) |

### 5. Jalankan aplikasi

```bash
npm run dev
```

Buka `http://localhost:3000/presensi`, lalu klik "Masuk ke Halaman Admin" dan login
memakai `ADMIN_USERNAME` / `ADMIN_PASSWORD` yang sudah diatur.

### 6. Build untuk production

```bash
npm run build
npm run start
```

## Deployment Production (Subpath `/presensi`)

Aplikasi ini dikonfigurasi untuk berjalan di subpath `/presensi` pada domain
`https://u-talent.uika-bogor.ac.id/presensi`. Konfigurasi ini sudah diatur
di `next.config.js` dengan `basePath: '/presensi'`.

Pastikan web server (Nginx/Apache) me-proxy request dari `/presensi` ke port
Node.js aplikasi ini. Lihat `DEPLOY.md` untuk panduan lengkap deployment.

## Alur Penggunaan

1. Admin membuka `/presensi/admin` → diarahkan ke `/presensi/admin/login` jika belum login.
2. Setelah login, admin mengisi form event (termasuk opsi **"Wajibkan
   deteksi lokasi peserta"**), lalu klik "Buat Event & Generate QR".
3. Admin klik event untuk membuka halaman detail (`/presensi/admin/event/[id]`) —
   di sana muncul QR Code, link presensi yang bisa disalin, serta tombol
   untuk **mengaktifkan/menonaktifkan** persyaratan lokasi kapan pun.
4. Peserta memindai QR Code → diarahkan ke `/presensi/presensi/[id]` yang sudah
   dioptimalkan untuk layar HP. Peserta mengisi nama, instansi, jabatan,
   menggambar tanda tangan, lalu klik "Kirim Presensi". Jika event
   mewajibkan lokasi, browser akan meminta izin GPS; jika tidak, langkah
   ini dilewati sepenuhnya.
5. Admin memantau peserta yang hadir (update otomatis tiap 10 detik) dan
   mengklik **"Export Daftar Hadir (PDF)"** untuk mengunduh laporan resmi
   berisi tabel peserta lengkap dengan gambar tanda tangan masing-masing.
6. Bahasa antarmuka dapat diganti kapan saja lewat tombol **ID / EN** di
   pojok kanan atas setiap halaman.

## Keamanan: Login Admin

- Autentikasi memakai **session cookie ber-tanda-tangan (HMAC-SHA256)**
  yang disimpan sebagai cookie `httpOnly`, sehingga tidak bisa diakses lewat
  JavaScript di browser (mengurangi risiko XSS mencuri sesi).
- Tidak ada dependensi tambahan (seperti NextAuth/JWT library) — seluruhnya
  memakai Web Crypto API bawaan platform agar instalasi tetap ringan.
- Middleware (`middleware.js`) melindungi seluruh halaman `/admin/*`
  (kecuali `/admin/login`), dan setiap API route yang sensitif (daftar
  event, daftar peserta, QR Code, export PDF, buat/hapus/ubah event) juga
  memeriksa session yang sama di sisi server.
- Endpoint publik yang sengaja **tidak** diproteksi (karena dipakai peserta
  lewat QR Code): `GET /api/events/:id` (info dasar event) dan
  `POST /api/events/:id/participants` (kirim presensi).
- Kredensial saat ini berupa **satu akun admin** yang diatur lewat
  environment variable (`ADMIN_USERNAME` / `ADMIN_PASSWORD`). Untuk
  kebutuhan multi-admin dengan akun masing-masing tersimpan di database,
  ini bisa dikembangkan lebih lanjut — beri tahu jika fitur ini diperlukan.
- Selalu jaga kerahasiaan file `.env.local` (jangan pernah di-commit ke
  repository).

## Mengapa Export PDF Memakai `pdf-lib`, Bukan `pdfkit`?

Versi sebelumnya memakai `pdfkit`, yang ternyata sering gagal saat dijalankan
di lingkungan Next.js/serverless (termasuk kemungkinan penyebab laporan
"export PDF gagal" sebelumnya): `pdfkit` perlu membaca file metrik font
(`.afm`) langsung dari disk saat runtime, dan file tersebut acap kali tidak
ikut ter-bundle dengan benar oleh Next.js saat build untuk production.

`pdf-lib` tidak memiliki masalah ini karena font standar (Helvetica, dst)
sudah memiliki metrik bawaan tanpa perlu membaca file eksternal, sehingga
jauh lebih stabil untuk dijalankan di route handler Next.js. Logika
pembuatan PDF kini berada di `lib/exportPdf.js` (terpisah dari route HTTP-nya
agar mudah diuji ulang) dan sudah diuji menghasilkan PDF nyata — termasuk
dengan gambar tanda tangan dan kasus lebih dari satu halaman (pagination).

## Pengaturan Lokasi per Event

Setiap event memiliki kolom `require_location` (default: aktif/`1`).
- **Aktif**: peserta akan diminta izin lokasi GPS saat mengisi presensi
  (perilaku sama seperti versi sebelumnya).
- **Nonaktif**: peserta tidak akan diminta izin lokasi sama sekali — kolom
  `latitude`/`longitude` pada presensi tersebut akan kosong.

Admin dapat mengubah pengaturan ini kapan saja dari halaman detail event,
tanpa perlu mengubah event yang sudah dibuat.

## ID Event di URL (Anti-Tebak / Anti-Edit)

Sebelumnya URL memakai ID angka berurutan (mis. `/admin/event/1`,
`/presensi/1`), yang berisiko diketik ulang secara manual untuk mencoba
mengakses event lain (mis. mengganti `1` menjadi `2`). Sekarang setiap
event memiliki **`public_id`**: string acak 32 karakter (128-bit, dibuat
dengan `crypto.getRandomValues`) yang dipakai di seluruh URL publik
(link presensi, QR Code) maupun URL admin (`/admin/event/[public_id]`).

## Teknologi

- Next.js 14 (App Router, JavaScript)
- MySQL (via `mysql2`)
- `qrcode` untuk generate QR Code
- `pdf-lib` untuk export PDF (termasuk gambar tanda tangan)
- TailwindCSS untuk styling
- Tanda tangan digambar memakai `<canvas>` native (tanpa library tambahan)
- Login admin memakai Web Crypto API bawaan Node.js/Edge Runtime (tanpa
  library tambahan)

## Catatan Keamanan Tambahan

- Ganti `ADMIN_USERNAME`, `ADMIN_PASSWORD`, dan `ADMIN_SESSION_SECRET` dari
  nilai contoh sebelum dipakai di luar lingkungan development.
- Jalankan aplikasi di balik HTTPS saat production — selain untuk keamanan
  cookie session, ini juga **wajib** agar fitur deteksi lokasi (GPS) bisa
  berfungsi di browser HP (browser memblokir akses lokasi di halaman HTTP
  biasa).
- Lakukan backup database secara berkala, khususnya sebelum dan sesudah
  pelaksanaan event besar.
