# Sistem Presensi Event (Next.js + MySQL)

Aplikasi presensi kehadiran berbasis QR Code.

## Fitur
- Admin membuat event (nama, tanggal, lokasi, PIC) di `/admin`.
- Setiap event otomatis mendapat QR Code yang mengarah ke halaman presensi publik `/presensi/[id]`.
- Peserta mengisi nama, asal instansi, jabatan, dan tanda tangan (digambar langsung di layar).
- Tanggal & jam presensi diambil otomatis dari waktu server saat data disimpan.
- Latitude & longitude peserta diambil otomatis dari browser (geolocation) saat mengisi presensi.
- Admin dapat melihat daftar peserta yang hadir secara real-time di halaman detail event.
- Daftar hadir dapat diexport ke PDF.

## Struktur Database
Lihat `schema.sql`. Dua tabel utama: `events` dan `participants` (relasi 1 event -> banyak peserta).

## Cara Menjalankan

1. **Siapkan database MySQL**
   ```bash
   mysql -u root -p < schema.sql
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Konfigurasi environment**
   Salin `.env.example` menjadi `.env.local`, lalu sesuaikan kredensial database:
   ```bash
   cp .env.example .env.local
   ```
   - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` -> kredensial MySQL Anda.
   - `NEXT_PUBLIC_BASE_URL` -> URL aplikasi (penting agar QR Code mengarah ke link yang benar).
     Saat development biarkan `http://localhost:3000`. Saat deploy ke server/domain,
     ganti ke URL publik aplikasi, misalnya `https://presensi.namadomain.com`.

4. **Jalankan aplikasi**
   ```bash
   npm run dev
   ```
   Buka `http://localhost:3000`.

5. **Build untuk production**
   ```bash
   npm run build
   npm run start
   ```

## Alur Penggunaan

1. Admin membuka `/admin`, mengisi form, lalu klik "Buat Event & Generate QR".
2. Admin klik event yang baru dibuat untuk masuk ke halaman detail (`/admin/event/[id]`),
   di sana muncul QR Code dan link presensi yang bisa disalin/dicetak.
3. Peserta memindai QR Code (atau membuka link) -> diarahkan ke `/presensi/[id]`.
4. Peserta mengisi nama, instansi, jabatan, lalu menggambar tanda tangan di kolom yang disediakan,
   kemudian klik "Kirim Presensi". Browser akan meminta izin lokasi; jika diizinkan,
   koordinat ikut tersimpan.
5. Admin dapat melihat daftar peserta yang hadir (update otomatis tiap 10 detik) dan
   mengeksport ke PDF melalui tombol "Export Daftar Hadir (PDF)".

## Catatan Keamanan
Halaman `/admin` pada contoh ini **belum memiliki autentikasi/login**.
Untuk penggunaan production, disarankan menambahkan proteksi (misalnya NextAuth.js,
middleware basic-auth, atau membatasi akses lewat reverse proxy/VPN) agar halaman
admin tidak dapat diakses publik.

## Teknologi
- Next.js 14 (App Router, JavaScript)
- MySQL (via `mysql2`)
- `qrcode` untuk generate QR Code
- `pdfkit` untuk export PDF
- TailwindCSS untuk styling
- Tanda tangan digambar memakai `<canvas>` native (tanpa library tambahan)
