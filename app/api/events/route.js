import { NextResponse } from 'next/server';
import { getPool, ensureSchema } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import { generatePublicId } from '@/lib/id';

// Kolom yang aman ditampilkan ke client
const PUBLIC_FIELDS = `
  e.public_id, e.nama_event, e.tanggal_event, e.waktu_event, e.lokasi_event, e.pic_event,
  e.require_location, e.notulensi, e.created_at,
  u.nama AS creator_nama, u.username AS creator_username
`;

// GET /api/events -> daftar event beserta jumlah peserta
// Superadmin melihat semua event; Admin biasa hanya melihat event buatannya sendiri
export async function GET(request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const pool = getPool();
    await ensureSchema(pool);

    const isSuperAdmin = session.role === 'superadmin';

    let query = `
      SELECT ${PUBLIC_FIELDS},
        (SELECT COUNT(*) FROM participants p WHERE p.event_id = e.id) AS jumlah_peserta
      FROM events e
      LEFT JOIN users u ON u.id = e.user_id
    `;
    const params = [];

    if (!isSuperAdmin) {
      query += ` WHERE e.user_id = ? `;
      params.push(session.id);
    }

    query += ` ORDER BY e.tanggal_event DESC, e.id DESC`;

    const [rows] = await pool.query(query, params);
    return NextResponse.json({ success: true, data: rows, isSuperAdmin });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

// POST /api/events -> buat event baru
export async function POST(request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { nama_event, tanggal_event, waktu_event, lokasi_event, pic_event, require_location, notulensi } = body;

    if (!nama_event || !tanggal_event || !lokasi_event || !pic_event) {
      return NextResponse.json(
        { success: false, message: 'Semua field wajib diisi' },
        { status: 400 }
      );
    }

    const requireLocationValue = require_location === false ? 0 : 1;
    const waktuEventValue = waktu_event && waktu_event.trim() ? waktu_event.trim() : null;
    const notulensiValue = notulensi && notulensi.trim() ? notulensi.trim() : null;
    const publicId = generatePublicId();

    const pool = getPool();
    await ensureSchema(pool);

    await pool.query(
      `INSERT INTO events (public_id, user_id, nama_event, tanggal_event, waktu_event, lokasi_event, pic_event, require_location, notulensi)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [publicId, session.id || null, nama_event, tanggal_event, waktuEventValue, lokasi_event, pic_event, requireLocationValue, notulensiValue]
    );

    return NextResponse.json(
      { success: true, data: { public_id: publicId } },
      { status: 201 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
