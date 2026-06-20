-- Jalankan file ini di MySQL untuk membuat database & tabel yang dibutuhkan
-- Contoh: mysql -u root -p < schema.sql

CREATE DATABASE IF NOT EXISTS presensi_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE presensi_db;

-- Tabel event yang dibuat oleh admin
CREATE TABLE IF NOT EXISTS events (
  id INT AUTO_INCREMENT PRIMARY KEY,           -- ID internal (tidak pernah dipakai di URL)
  public_id CHAR(32) NOT NULL,                 -- ID acak yang dipakai di URL/QR Code (tidak bisa ditebak)
  nama_event   VARCHAR(255) NOT NULL,
  tanggal_event DATE NOT NULL,
  waktu_event  TIME NULL,                     -- jam pelaksanaan event (opsional)
  lokasi_event VARCHAR(255) NOT NULL,
  pic_event    VARCHAR(255) NOT NULL,
  require_location TINYINT(1) NOT NULL DEFAULT 1, -- 1 = wajibkan deteksi lokasi peserta, 0 = nonaktif
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_events_public_id (public_id)
) ENGINE=InnoDB;

-- Tabel peserta yang mengisi presensi pada sebuah event
CREATE TABLE IF NOT EXISTS participants (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  event_id      INT NOT NULL,
  nama          VARCHAR(255) NOT NULL,
  asal_instansi VARCHAR(255) NOT NULL,
  jabatan       VARCHAR(255) NOT NULL,
  signature     LONGTEXT NOT NULL,           -- tanda tangan disimpan sebagai base64 PNG
  latitude      DECIMAL(10,7) NULL,
  longitude     DECIMAL(10,7) NULL,
  presensi_at   DATETIME DEFAULT CURRENT_TIMESTAMP, -- tanggal & jam saat presensi diisi
  CONSTRAINT fk_participants_event
    FOREIGN KEY (event_id) REFERENCES events(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_participants_event_id ON participants(event_id);

-- =====================================================================
-- MIGRASI UNTUK DATABASE YANG SUDAH ADA SEBELUMNYA (UPGRADE)
-- Jika database presensi_db sudah pernah dibuat sebelum kolom
-- require_location ditambahkan, jalankan perintah berikut secara manual:
--
--   ALTER TABLE events
--     ADD COLUMN require_location TINYINT(1) NOT NULL DEFAULT 1;
--
-- Jika database juga belum memiliki kolom public_id (ID acak anti-tebak
-- untuk URL/QR Code), jalankan migrasi berikut:
--
--   ALTER TABLE events ADD COLUMN public_id CHAR(32) NULL;
--   UPDATE events
--     SET public_id = SUBSTRING(SHA2(CONCAT(id, '-', RAND(), '-', NOW(6)), 256), 1, 32)
--     WHERE public_id IS NULL;
--   ALTER TABLE events MODIFY public_id CHAR(32) NOT NULL;
--   ALTER TABLE events ADD UNIQUE KEY uq_events_public_id (public_id);
--
-- Jika database juga belum memiliki kolom waktu_event (jam pelaksanaan event),
-- jalankan migrasi berikut:
--
--   ALTER TABLE events ADD COLUMN waktu_event TIME NULL;
--
-- PENTING: setelah migrasi ini, QR Code/link presensi LAMA yang masih
-- memakai angka ID (mis. /presensi/1) tidak akan berfungsi lagi.
-- Cetak ulang QR Code dari halaman detail event setelah migrasi.
--
-- Perintah CREATE TABLE IF NOT EXISTS di atas TIDAK akan menambahkan
-- kolom baru pada tabel yang sudah ada, sehingga migrasi manual di atas
-- tetap diperlukan untuk instalasi lama.
-- =====================================================================

