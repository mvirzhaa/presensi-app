import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import { hashPassword } from '@/lib/password';

// GET /api/users -> Daftar semua user beserta jumlah event yang dibuat (KHUSUS SUPERADMIN)
export async function GET(request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  if (session.role !== 'superadmin') {
    return NextResponse.json({ success: false, message: 'Forbidden: Hanya Super Admin yang dapat mengakses' }, { status: 403 });
  }

  try {
    const pool = getPool();
    const [rows] = await pool.query(`
      SELECT 
        u.id, 
        u.username, 
        u.nama, 
        u.role, 
        u.is_active, 
        u.created_at,
        COUNT(e.id) AS total_events
      FROM users u
      LEFT JOIN events e ON e.user_id = u.id
      GROUP BY u.id
      ORDER BY u.role DESC, u.created_at ASC
    `);

    return NextResponse.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// POST /api/users -> Tambah user baru (KHUSUS SUPERADMIN)
export async function POST(request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  if (session.role !== 'superadmin') {
    return NextResponse.json({ success: false, message: 'Forbidden: Hanya Super Admin yang dapat membuat user' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { username, password, nama, role } = body;

    if (!username || !password || !nama) {
      return NextResponse.json(
        { success: false, message: 'Username, password, dan nama lengkap wajib diisi' },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanNama = nama.trim();
    // User baru yang dibuat oleh Super Admin selalu bertindak sebagai Operator
    const validRole = 'admin';

    const pool = getPool();


    // Cek duplikasi username
    const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [cleanUsername]);
    if (existing.length > 0) {
      return NextResponse.json(
        { success: false, message: 'Username sudah digunakan oleh akun lain' },
        { status: 409 }
      );
    }

    const passwordHash = hashPassword(password);
    const [result] = await pool.query(
      `INSERT INTO users (username, password_hash, nama, role, is_active)
       VALUES (?, ?, ?, ?, 1)`,
      [cleanUsername, passwordHash, cleanNama, validRole]
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          id: result.insertId,
          username: cleanUsername,
          nama: cleanNama,
          role: validRole,
          is_active: 1,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
