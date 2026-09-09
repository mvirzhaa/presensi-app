import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

const PUBLIC_FIELDS = `
  e.public_id, e.user_id, e.nama_event, e.tanggal_event, e.waktu_event, e.lokasi_event, e.pic_event,
  e.require_location, e.fix_location, e.target_latitude, e.target_longitude, e.radius_meters,
  e.notulensi, e.created_at,
  u.nama AS creator_nama, u.username AS creator_username
`;

// GET /api/events/:publicId -> detail satu event
export async function GET(request, { params }) {
  try {
    const { id } = params;
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT ${PUBLIC_FIELDS} 
       FROM events e
       LEFT JOIN users u ON u.id = e.user_id
       WHERE e.public_id = ?`,
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

// PATCH /api/events/:publicId -> update field event (notulensi, require_location, info event)
export async function PATCH(request, { params }) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = params;
    const pool = getPool();

    // Cek keberadaan dan kepemilikan event
    const [existing] = await pool.query('SELECT id, user_id FROM events WHERE public_id = ?', [id]);
    if (existing.length === 0) {
      return NextResponse.json({ success: false, message: 'Event tidak ditemukan' }, { status: 404 });
    }

    const event = existing[0];
    const isOwner = event.user_id === session.id;
    const isSuperAdmin = session.role === 'superadmin';

    if (!isOwner && !isSuperAdmin) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Anda tidak memiliki akses ke event ini' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const fields = [];
    const values = [];

    if (typeof body.require_location === 'boolean') {
      fields.push('require_location = ?');
      values.push(body.require_location ? 1 : 0);
    }
    if (typeof body.fix_location === 'boolean') {
      fields.push('fix_location = ?');
      values.push(body.fix_location ? 1 : 0);
    }
    if ('target_latitude' in body) {
      fields.push('target_latitude = ?');
      values.push(
        body.target_latitude != null && body.target_latitude !== '' && !isNaN(Number(body.target_latitude))
          ? Number(body.target_latitude)
          : null
      );
    }
    if ('target_longitude' in body) {
      fields.push('target_longitude = ?');
      values.push(
        body.target_longitude != null && body.target_longitude !== '' && !isNaN(Number(body.target_longitude))
          ? Number(body.target_longitude)
          : null
      );
    }
    if ('radius_meters' in body) {
      const r = Number(body.radius_meters);
      fields.push('radius_meters = ?');
      values.push(!isNaN(r) && r > 0 ? r : 50);
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
    if (typeof body.notulensi === 'string') {
      fields.push('notulensi = ?');
      values.push(body.notulensi.trim() ? body.notulensi.trim() : null);
    }

    if (fields.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Tidak ada field yang diperbarui' },
        { status: 400 }
      );
    }

    values.push(id);
    await pool.query(`UPDATE events SET ${fields.join(', ')} WHERE public_id = ?`, values);

    const [rows] = await pool.query(
      `SELECT ${PUBLIC_FIELDS} 
       FROM events e
       LEFT JOIN users u ON u.id = e.user_id
       WHERE e.public_id = ?`,
      [id]
    );

    return NextResponse.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

// DELETE /api/events/:publicId -> hapus event
export async function DELETE(request, { params }) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = params;
    const pool = getPool();

    const [existing] = await pool.query('SELECT id, user_id FROM events WHERE public_id = ?', [id]);
    if (existing.length === 0) {
      return NextResponse.json({ success: false, message: 'Event tidak ditemukan' }, { status: 404 });
    }

    const event = existing[0];
    const isOwner = event.user_id === session.id;
    const isSuperAdmin = session.role === 'superadmin';

    if (!isOwner && !isSuperAdmin) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Anda tidak memiliki akses untuk menghapus event ini' },
        { status: 403 }
      );
    }

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
