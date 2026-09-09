import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import {
  getSessionFromRequest,
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE,
} from '@/lib/auth';
import { hashPassword, verifyPassword } from '@/lib/password';

export const dynamic = 'force-dynamic';

// GET /api/auth/profile -> Ambil profil user yang sedang login
export async function GET(request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT id, username, nama, role, is_active, created_at FROM users WHERE id = ?',
      [session.id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ success: false, message: 'User tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// PATCH /api/auth/profile -> Update profil sendiri (Username, Nama, dan/atau Password)
export async function PATCH(request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { nama, username, current_password, new_password } = body;
    const pool = getPool();

    // Ambil data user saat ini dari database
    const [rows] = await pool.query(
      'SELECT id, username, password_hash, nama, role, is_active FROM users WHERE id = ?',
      [session.id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ success: false, message: 'User tidak ditemukan' }, { status: 404 });
    }

    const currentUser = rows[0];

    // Jika ingin mengganti password atau mengganti username, validasi password saat ini wajib disertakan untuk keamanan
    const isChangingPassword = Boolean(new_password && new_password.trim());
    const isChangingUsername = Boolean(
      username && username.trim().toLowerCase() !== currentUser.username.toLowerCase()
    );

    if (isChangingPassword) {
      if (!current_password) {
        return NextResponse.json(
          { success: false, message: 'Password saat ini wajib diisi untuk verifikasi perubahan password' },
          { status: 400 }
        );
      }

      const isCurrentValid = verifyPassword(current_password, currentUser.password_hash);
      if (!isCurrentValid) {
        return NextResponse.json(
          { success: false, message: 'Password saat ini yang Anda masukkan salah' },
          { status: 400 }
        );
      }

      if (new_password.trim().length < 6) {
        return NextResponse.json(
          { success: false, message: 'Password baru minimal harus 6 karakter' },
          { status: 400 }
        );
      }
    }

    const updates = [];
    const values = [];

    // Update Nama
    if (nama && typeof nama === 'string' && nama.trim()) {
      updates.push('nama = ?');
      values.push(nama.trim());
    }

    // Update Username
    let updatedUsername = currentUser.username;
    if (isChangingUsername) {
      const cleanUsername = username.trim().toLowerCase();
      if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(cleanUsername)) {
        return NextResponse.json(
          { success: false, message: 'Username baru harus 3-30 karakter (huruf, angka, _, -, .)' },
          { status: 400 }
        );
      }

      const [existing] = await pool.query(
        'SELECT id FROM users WHERE username = ? AND id != ?',
        [cleanUsername, session.id]
      );

      if (existing.length > 0) {
        return NextResponse.json(
          { success: false, message: 'Username sudah digunakan oleh akun lain, silakan gunakan username lain' },
          { status: 400 }
        );
      }

      updates.push('username = ?');
      values.push(cleanUsername);
      updatedUsername = cleanUsername;
    }

    // Update Password
    if (isChangingPassword) {
      updates.push('password_hash = ?');
      values.push(hashPassword(new_password.trim()));
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Tidak ada perubahan yang dikirim' },
        { status: 400 }
      );
    }

    values.push(session.id);
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

    // Ambil data user yang telah ter-update
    const [updatedRows] = await pool.query(
      'SELECT id, username, nama, role, is_active, created_at FROM users WHERE id = ?',
      [session.id]
    );
    const updatedUser = updatedRows[0];

    // Perbarui session cookie agar sinkron dengan username/nama terbaru
    const newSessionPayload = {
      id: updatedUser.id,
      username: updatedUser.username,
      nama: updatedUser.nama,
      role: updatedUser.role,
    };
    const newToken = await createSessionToken(newSessionPayload);

    const res = NextResponse.json({
      success: true,
      message: 'Profil dan pengaturan akun berhasil diperbarui',
      data: updatedUser,
    });

    res.cookies.set(SESSION_COOKIE_NAME, newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE,
    });

    return res;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
