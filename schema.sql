-- Jalankan file ini di MySQL untuk membuat database & tabel yang dibutuhkan
-- Contoh: mysql -u root -p < schema.sql

CREATE DATABASE IF NOT EXISTS presensi_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE presensi_db;

-- Tabel pengguna (Super Admin & Admin/User Kegiatan)
CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  nama          VARCHAR(255) NOT NULL,
  role          ENUM('superadmin', 'admin') NOT NULL DEFAULT 'admin',
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Tabel event yang dibuat oleh admin/user
CREATE TABLE IF NOT EXISTS events (
  id               INT AUTO_INCREMENT PRIMARY KEY,           -- ID internal (tidak pernah dipakai di URL)
  public_id        CHAR(32) NOT NULL,                        -- ID acak yang dipakai di URL/QR Code (tidak bisa ditebak)
  user_id          INT NULL,                                 -- Pembuat event (relasi ke users.id)
  nama_event       VARCHAR(255) NOT NULL,
  tanggal_event    DATE NOT NULL,
  waktu_event      TIME NULL,                                -- jam pelaksanaan event (opsional)
  lokasi_event     VARCHAR(255) NOT NULL,
  pic_event        VARCHAR(255) NOT NULL,
  require_location TINYINT(1) NOT NULL DEFAULT 1,            -- 1 = wajibkan deteksi lokasi peserta, 0 = nonaktif
  notulensi        MEDIUMTEXT NULL,                          -- catatan/notulensi rapat
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_events_public_id (public_id),
  CONSTRAINT fk_events_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

-- Tabel lampiran dokumen & foto kegiatan
CREATE TABLE IF NOT EXISTS event_files (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  event_id      INT NOT NULL,
  file_type     ENUM('document', 'photo') NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_name     VARCHAR(255) NOT NULL,
  file_path     VARCHAR(500) NOT NULL,
  file_size     INT NOT NULL,
  mime_type     VARCHAR(100) NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_event_files_event
    FOREIGN KEY (event_id) REFERENCES events(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_event_files_event_id ON event_files(event_id);

-- Tabel peserta yang mengisi presensi pada sebuah event
CREATE TABLE IF NOT EXISTS participants (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  event_id      INT NOT NULL,
  nama          VARCHAR(255) NOT NULL,
  asal_instansi VARCHAR(255) NOT NULL,
  jabatan       VARCHAR(255) NOT NULL,
  signature     LONGTEXT NOT NULL,                           -- tanda tangan disimpan sebagai base64 PNG
  latitude      DECIMAL(10,7) NULL,
  longitude     DECIMAL(10,7) NULL,
  presensi_at   DATETIME DEFAULT CURRENT_TIMESTAMP,         -- tanggal & jam saat presensi diisi
  CONSTRAINT fk_participants_event
    FOREIGN KEY (event_id) REFERENCES events(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_participants_event_id ON participants(event_id);

-- =====================================================================
-- MIGRASI UNTUK DATABASE YANG SUDAH ADA SEBELUMNYA (UPGRADE)
-- Jika database presensi_db sudah pernah dibuat sebelumnya, jalankan perintah berikut:
--
-- 1. Tambah tabel users jika belum ada:
--    CREATE TABLE IF NOT EXISTS users (
--      id INT AUTO_INCREMENT PRIMARY KEY,
--      username VARCHAR(100) NOT NULL UNIQUE,
--      password_hash VARCHAR(255) NOT NULL,
--      nama VARCHAR(255) NOT NULL,
--      role ENUM('superadmin', 'admin') NOT NULL DEFAULT 'admin',
--      is_active TINYINT(1) NOT NULL DEFAULT 1,
--      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
--    ) ENGINE=InnoDB;
--
-- 2. Tambah kolom user_id dan notulensi pada events:
--    ALTER TABLE events ADD COLUMN user_id INT NULL;
--    ALTER TABLE events ADD CONSTRAINT fk_events_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
--    ALTER TABLE events ADD COLUMN notulensi MEDIUMTEXT NULL;
--
-- 3. Tambah tabel event_files:
--    CREATE TABLE IF NOT EXISTS event_files (
--      id INT AUTO_INCREMENT PRIMARY KEY,
--      event_id INT NOT NULL,
--      file_type ENUM('document', 'photo') NOT NULL,
--      original_name VARCHAR(255) NOT NULL,
--      file_name VARCHAR(255) NOT NULL,
--      file_path VARCHAR(500) NOT NULL,
--      file_size INT NOT NULL,
--      mime_type VARCHAR(100) NULL,
--      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
--      CONSTRAINT fk_event_files_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
--    ) ENGINE=InnoDB;
--
-- Catatan: Aplikasi juga memiliki fitur auto-migration internal saat startup.
-- =====================================================================
