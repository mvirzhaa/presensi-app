import { NextResponse } from 'next/server';
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE,
  createSessionToken,
} from '@/lib/auth';
import { getPool, ensureSchema } from '@/lib/db';
import { verifyPassword, hashPassword, validateCredentials } from '@/lib/password';


export async function POST(request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Username dan password wajib diisi' },
        { status: 400 }
      );
    }

    const pool = getPool();
    await ensureSchema(pool);

    // Cari user di database
    const [users] = await pool.query(
      'SELECT id, username, password_hash, nama, role, is_active FROM users WHERE username = ?',
      [username.trim()]
    );

    let user = null;

    if (users.length > 0) {
      const dbUser = users[0];
      if (!dbUser.is_active) {
        return NextResponse.json(
          { success: false, message: 'Akun Anda dinonaktifkan. Silakan hubungi Super Admin.' },
          { status: 403 }
        );
      }

      const isValid = verifyPassword(password, dbUser.password_hash);
      if (isValid) {
        user = {
          id: dbUser.id,
          username: dbUser.username,
          nama: dbUser.nama,
          role: dbUser.role,
        };
      }
    } else {
      // Fallback untuk kredensial default dari .env jika belum pernah tersimpan di DB
      if (validateCredentials(username, password)) {
        const defaultHash = hashPassword(password);
        const [insertRes] = await pool.query(
          `INSERT INTO users (username, password_hash, nama, role, is_active)
           VALUES (?, ?, ?, 'superadmin', 1)
           ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
          [username, defaultHash, 'Administrator']
        );
        user = {
          id: insertRes.insertId || 1,
          username,
          nama: 'Administrator',
          role: 'superadmin',
        };
      }
    }

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Username atau password salah' },
        { status: 401 }
      );
    }

    const token = await createSessionToken(user);

    const res = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        nama: user.nama,
        role: user.role,
      },
    });

    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE,
    });
    return res;
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan saat login: ' + err.message },
      { status: 500 }
    );
  }
}
