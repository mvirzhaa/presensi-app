# Panduan Deployment ke VPS
# Domain: https://u-talent.uika-bogor.ac.id/presensi

Panduan langkah-per-langkah untuk men-deploy aplikasi **Sistem Presensi Event** ke VPS
di subpath `https://u-talent.uika-bogor.ac.id/presensi`.

---

## Prasyarat di VPS

- Node.js versi 20+ sudah terinstal
- MySQL Server sudah berjalan
- Nginx sudah berjalan (untuk domain u-talent)
- Akses SSH ke server

---

## Langkah 1: Cek Port Tersedia di Server

SSH ke server, lalu jalankan:

```bash
ss -tlnp | grep LISTEN
```

Catat port yang **tidak** terpakai. Gunakan port tersebut (misalnya `3001`, `3002`, dll.)
Ganti nilai `PORT` di `ecosystem.config.js` sesuai hasil di atas.

---

## Langkah 2: Clone Repository ke Server

```bash
# Login ke server via SSH
ssh user@ip_server_anda

# Buat direktori (sesuaikan path dengan konvensi server Anda)
mkdir -p /var/www/presensi-app
cd /var/www/presensi-app

# Clone repository
git clone <URL_REPO_GITHUB_ANDA> .
```

---

## Langkah 3: Buat File `.env` di Server

```bash
cd /var/www/presensi-app

# Buat dari contoh
cp .env.example .env

# Edit dan isi nilai yang sesuai
nano .env
```

Isi `.env` di server:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=presensi_user
DB_PASSWORD=password_aman_anda
DB_NAME=presensi_db

NEXT_PUBLIC_BASE_URL=https://u-talent.uika-bogor.ac.id/presensi

# Sesuaikan dengan port yang tersedia (hasil Langkah 1)
PORT=3001
```

---

## Langkah 4: Setup Database MySQL

```bash
# Login ke MySQL (gunakan user root atau yang punya hak CREATE)
mysql -u root -p

# Buat database
CREATE DATABASE IF NOT EXISTS presensi_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Buat user khusus untuk aplikasi
CREATE USER 'presensi_user'@'localhost' IDENTIFIED BY 'password_aman_anda';
GRANT ALL PRIVILEGES ON presensi_db.* TO 'presensi_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Import skema tabel
mysql -u presensi_user -p presensi_db < /var/www/presensi-app/schema.sql
```

---

## Langkah 5: Install Dependencies & Build

```bash
cd /var/www/presensi-app

# Install dependencies
npm install

# Build untuk production
npm run build
```

---

## Langkah 6: Jalankan dengan PM2

```bash
cd /var/www/presensi-app

# Install PM2 jika belum ada
sudo npm install -g pm2

# Jalankan aplikasi menggunakan ecosystem config
pm2 start ecosystem.config.js

# Cek status
pm2 status

# Simpan konfigurasi PM2 agar auto-start saat reboot
pm2 save
pm2 startup
# (jalankan perintah yang ditampilkan setelah pm2 startup)
```

---

## Langkah 7: Konfigurasi Nginx

Edit file konfigurasi Nginx untuk domain `u-talent.uika-bogor.ac.id`.
Biasanya ada di `/etc/nginx/sites-available/u-talent` atau `/etc/nginx/conf.d/u-talent.conf`.

```bash
sudo nano /etc/nginx/sites-available/u-talent
# (atau file config yang sesuai di server Anda)
```

Tambahkan blok `location /presensi` di dalam blok `server { ... }` yang sudah ada:

```nginx
# Tambahkan di dalam blok server { } untuk u-talent.uika-bogor.ac.id
# Ganti 3001 dengan port yang Anda pilih di Langkah 1

location /presensi {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}
```

Test dan reload Nginx:

```bash
# Validasi konfigurasi
sudo nginx -t

# Reload Nginx (tanpa downtime)
sudo systemctl reload nginx
```

---

## Verifikasi Setelah Deploy

```bash
# Cek aplikasi berjalan
pm2 status

# Cek log jika ada error
pm2 logs presensi-app

# Test akses lokal
curl http://localhost:3001
```

Buka browser dan akses:
- ✅ `https://u-talent.uika-bogor.ac.id/presensi` → Halaman utama
- ✅ `https://u-talent.uika-bogor.ac.id/presensi/admin` → Halaman Admin
- ✅ Buat event baru → QR Code mengarah ke `https://u-talent.uika-bogor.ac.id/presensi/scan/{id}`

---

## Update Aplikasi di Kemudian Hari

Jika ada perubahan kode di repositori:

```bash
cd /var/www/presensi-app
git pull
npm install
npm run build
pm2 restart presensi-app
```
