import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

// Catatan: parameter route [id] di sini sebenarnya berisi PUBLIC_ID
// (string acak), BUKAN id auto-increment internal. Ini disengaja agar
// ID di URL tidak bisa ditebak/diutak-atik oleh pengguna.
const PUBLIC_FIELDS = `
  public_id, nama_event, tanggal_event, waktu_event, lokasi_event, pic_event,
  require_location, created_at
`;

// GET /api/events/:publicId -> detail satu event
// Sengaja TIDAK diproteksi karena halaman presensi publik (/presensi/[id])
// juga perlu mengambil nama/lokasi/tanggal event ini. Karena ID-nya acak
// (bukan angka berurutan), event lain tidak bisa ditebak dari sini.
export async function GET(request, { params }) {
  try {
    const { id } = params;
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT ${PUBLIC_FIELDS} FROM events WHERE public_id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Event tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

// PATCH /api/events/:publicId -> update sebagian field event (KHUSUS ADMIN, wajib login)
// Saat ini dipakai untuk toggle require_location dari halaman detail event.
export async function PATCH(request, { params }) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = params;
    const body = await request.json();

    const fields = [];
    const values = [];

    if (typeof body.require_location === 'boolean') {
      fields.push('require_location = ?');
      values.push(body.require_location ? 1 : 0);
    }
    if (typeof body.nama_event === 'string' && body.nama_event.trim()) {
      fields.push('nama_event = ?');
      values.push(body.nama_event.trim());
    }
    if (typeof body.lokasi_event === 'string' && body.lokasi_event.trim()) {
      fields.push('lokasi_event = ?');
      values.push(body.lokasi_event.trim());
    }
    if (typeof body.pic_event === 'string' && body.pic_event.trim()) {
      fields.push('pic_event = ?');
      values.push(body.pic_event.trim());
    }
    if (typeof body.tanggal_event === 'string' && body.tanggal_event.trim()) {
      fields.push('tanggal_event = ?');
      values.push(body.tanggal_event.trim());
    }
    if (typeof body.waktu_event === 'string') {
      fields.push('waktu_event = ?');
      values.push(body.waktu_event.trim() ? body.waktu_event.trim() : null);
    }

    if (fields.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Tidak ada field yang diperbarui' },
        { status: 400 }
      );
    }

    const pool = getPool();
    values.push(id);
    await pool.query(`UPDATE events SET ${fields.join(', ')} WHERE public_id = ?`, values);

    const [rows] = await pool.query(
      `SELECT ${PUBLIC_FIELDS} FROM events WHERE public_id = ?`,
      [id]
    );
    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Event tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

// DELETE /api/events/:publicId -> hapus event beserta seluruh pesertanya (KHUSUS ADMIN, wajib login)
export async function DELETE(request, { params }) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = params;
    const pool = getPool();
    await pool.query('DELETE FROM events WHERE public_id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
