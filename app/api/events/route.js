import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import { generatePublicId } from '@/lib/id';

// Kolom yang aman ditampilkan ke client (ID internal/auto-increment
// sengaja TIDAK pernah dikirim ke browser).
const PUBLIC_FIELDS = `
  public_id, nama_event, tanggal_event, lokasi_event, pic_event,
  require_location, created_at
`;

// GET /api/events -> daftar semua event beserta jumlah peserta (khusus admin)
export async function GET(request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT ${PUBLIC_FIELDS},
        (SELECT COUNT(*) FROM participants p WHERE p.event_id = e.id) AS jumlah_peserta
       FROM events e
       ORDER BY e.tanggal_event DESC, e.id DESC`
    );
    return NextResponse.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

// POST /api/events -> buat event baru (khusus admin)
export async function POST(request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { nama_event, tanggal_event, lokasi_event, pic_event, require_location } = body;

    if (!nama_event || !tanggal_event || !lokasi_event || !pic_event) {
      return NextResponse.json(
        { success: false, message: 'Semua field wajib diisi' },
        { status: 400 }
      );
    }

    // Default mewajibkan lokasi kecuali admin secara eksplisit mematikannya
    const requireLocationValue = require_location === false ? 0 : 1;

    // ID publik acak (anti-tebak) yang dipakai di URL/QR Code, BUKAN
    // ID auto-increment dari database.
    const publicId = generatePublicId();

    const pool = getPool();
    await pool.query(
      `INSERT INTO events (public_id, nama_event, tanggal_event, lokasi_event, pic_event, require_location)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [publicId, nama_event, tanggal_event, lokasi_event, pic_event, requireLocationValue]
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
