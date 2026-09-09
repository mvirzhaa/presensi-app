import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import { hashPassword } from '@/lib/password';

// PATCH /api/users/:id -> Update user (KHUSUS SUPERADMIN)
export async function PATCH(request, { params }) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  if (session.role !== 'superadmin') {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = params;
    const body = await request.json();
    const pool = getPool();

    const [userRows] = await pool.query('SELECT id, role, username FROM users WHERE id = ?', [id]);
    if (userRows.length === 0) {
      return NextResponse.json({ success: false, message: 'User tidak ditemukan' }, { status: 404 });
    }

    const updates = [];
    const values = [];

    if (body.username && typeof body.username === 'string' && body.username.trim()) {
      const newUsername = body.username.trim().toLowerCase();
      if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(newUsername)) {
        return NextResponse.json(
          { success: false, message: 'Username harus 3-30 karakter (huruf, angka, _, -, .)' },
          { status: 400 }
        );
      }
      const [existing] = await pool.query('SELECT id FROM users WHERE username = ? AND id != ?', [newUsername, id]);
      if (existing.length > 0) {
        return NextResponse.json(
          { success: false, message: 'Username sudah digunakan oleh akun lain' },
          { status: 400 }
        );
      }
      updates.push('username = ?');
      values.push(newUsername);
    }

    if (body.nama && typeof body.nama === 'string' && body.nama.trim()) {
      updates.push('nama = ?');
      values.push(body.nama.trim());
    }

    if (body.role && (body.role === 'superadmin' || body.role === 'admin')) {
      // Cegah mengubah role diri sendiri menjadi non-superadmin jika user adalah dirinya sendiri
      if (Number(session.id) === Number(id) && body.role !== 'superadmin') {
        return NextResponse.json(
          { success: false, message: 'Tidak dapat menurunkan role akun sendiri' },
          { status: 400 }
        );
      }
      updates.push('role = ?');
      values.push(body.role);
    }

    if (typeof body.is_active === 'boolean' || typeof body.is_active === 'number') {
      const activeVal = body.is_active ? 1 : 0;
      if (Number(session.id) === Number(id) && activeVal === 0) {
        return NextResponse.json(
          { success: false, message: 'Tidak dapat menonaktifkan akun sendiri' },
          { status: 400 }
        );
      }
      updates.push('is_active = ?');
      values.push(activeVal);
    }

    if (body.password && typeof body.password === 'string' && body.password.trim()) {
      updates.push('password_hash = ?');
      values.push(hashPassword(body.password.trim()));
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: false, message: 'Tidak ada perubahan yang dikirim' }, { status: 400 });
    }

    values.push(id);
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

    const [updated] = await pool.query(
      'SELECT id, username, nama, role, is_active, created_at FROM users WHERE id = ?',
      [id]
    );

    return NextResponse.json({ success: true, data: updated[0] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// DELETE /api/users/:id -> Hapus user (KHUSUS SUPERADMIN)
export async function DELETE(request, { params }) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  if (session.role !== 'superadmin') {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = params;
    if (Number(session.id) === Number(id)) {
      return NextResponse.json({ success: false, message: 'Tidak dapat menghapus akun sendiri yang sedang login' }, { status: 400 });
    }

    const pool = getPool();
    await pool.query('DELETE FROM users WHERE id = ?', [id]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
