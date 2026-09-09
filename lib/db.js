import mysql from 'mysql2/promise';
import { hashPassword } from '@/lib/password';

// Pool koneksi dibuat sekali dan dipakai ulang di seluruh aplikasi
let pool;
let schemaInitialized = false;
let schemaPromise = null;

export async function ensureSchema(p) {
  if (schemaInitialized) return;
  if (schemaPromise) return schemaPromise;

  schemaPromise = (async () => {
    try {
      // 1. Buat tabel users jika belum ada
      await p.query(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(100) NOT NULL UNIQUE,
          password_hash VARCHAR(255) NOT NULL,
          nama VARCHAR(255) NOT NULL,
          role ENUM('superadmin', 'admin') NOT NULL DEFAULT 'admin',
          is_active TINYINT(1) NOT NULL DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB;
      `);

      // 2. Cek apakah ada superadmin default
      const [userRows] = await p.query('SELECT id FROM users LIMIT 1');
      let defaultAdminId = userRows[0]?.id;

      if (userRows.length === 0) {
        const defaultUser = process.env.ADMIN_USERNAME || 'admin';
        const defaultPass = process.env.ADMIN_PASSWORD || 'admin123';
        const passwordHash = hashPassword(defaultPass);

        const [insertResult] = await p.query(
          `INSERT INTO users (username, password_hash, nama, role, is_active)
           VALUES (?, ?, ?, 'superadmin', 1)`,
          [defaultUser, passwordHash, 'Super Admin']
        );
        defaultAdminId = insertResult.insertId;
      }

      // 3. Cek kolom user_id dan notulensi pada tabel events
      const [columns] = await p.query(`SHOW COLUMNS FROM events`);
      const colNames = columns.map((c) => c.Field);

      if (!colNames.includes('user_id')) {
        try {
          await p.query(`
            ALTER TABLE events
              ADD COLUMN user_id INT NULL,
              ADD CONSTRAINT fk_events_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
          `);
        } catch (e) {
          console.warn('Notice adding user_id column:', e.message);
        }
      }

      if (!colNames.includes('notulensi')) {
        try {
          await p.query(`ALTER TABLE events ADD COLUMN notulensi MEDIUMTEXT NULL`);
        } catch (e) {
          console.warn('Notice adding notulensi column:', e.message);
        }
      }

      // Kolom untuk fitur fix lokasi / geofencing dinamis
      if (!colNames.includes('fix_location')) {
        try {
          await p.query(`ALTER TABLE events ADD COLUMN fix_location TINYINT(1) NOT NULL DEFAULT 0`);
        } catch (e) {
          console.warn('Notice adding fix_location column:', e.message);
        }
      }

      if (!colNames.includes('target_latitude')) {
        try {
          await p.query(`ALTER TABLE events ADD COLUMN target_latitude DECIMAL(10, 7) NULL`);
        } catch (e) {
          console.warn('Notice adding target_latitude column:', e.message);
        }
      }

      if (!colNames.includes('target_longitude')) {
        try {
          await p.query(`ALTER TABLE events ADD COLUMN target_longitude DECIMAL(10, 7) NULL`);
        } catch (e) {
          console.warn('Notice adding target_longitude column:', e.message);
        }
      }

      if (!colNames.includes('radius_meters')) {
        try {
          await p.query(`ALTER TABLE events ADD COLUMN radius_meters INT NOT NULL DEFAULT 50`);
        } catch (e) {
          console.warn('Notice adding radius_meters column:', e.message);
        }
      }

      // Hubungkan event lama yang belum punya user_id ke default admin jika ada
      if (defaultAdminId) {
        await p.query(`UPDATE events SET user_id = ? WHERE user_id IS NULL`, [defaultAdminId]);
      }

      // 4. Buat tabel event_files untuk dokumen dan foto kegiatan
      await p.query(`
        CREATE TABLE IF NOT EXISTS event_files (
          id INT AUTO_INCREMENT PRIMARY KEY,
          event_id INT NOT NULL,
          file_type ENUM('document', 'photo') NOT NULL,
          original_name VARCHAR(255) NOT NULL,
          file_name VARCHAR(255) NOT NULL,
          file_path VARCHAR(500) NOT NULL,
          file_size INT NOT NULL,
          mime_type VARCHAR(100) NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_event_files_event
            FOREIGN KEY (event_id) REFERENCES events(id)
            ON DELETE CASCADE
        ) ENGINE=InnoDB;
      `);

      try {
        await p.query(`CREATE INDEX idx_event_files_event_id ON event_files(event_id)`);
      } catch {
        // Index mungkin sudah ada
      }

      schemaInitialized = true;
    } catch (err) {
      console.error('Error ensuring schema:', err);
    }
  })();

  return schemaPromise;
}

export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'presensi_db',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      dateStrings: true,
    });

    // Inisialisasi skema saat pool pertama kali dibuat
    ensureSchema(pool).catch((err) => {
      console.error('Failed to auto-migrate schema:', err);
    });
  }
  return pool;
}
