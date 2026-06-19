import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

// GET /api/events -> daftar semua event beserta jumlah peserta
export async function GET() {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT e.*,
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

// POST /api/events -> buat event baru
export async function POST(request) {
  try {
    const body = await request.json();
    const { nama_event, tanggal_event, lokasi_event, pic_event } = body;

    if (!nama_event || !tanggal_event || !lokasi_event || !pic_event) {
      return NextResponse.json(
        { success: false, message: 'Semua field wajib diisi' },
        { status: 400 }
      );
    }

    const pool = getPool();
    const [result] = await pool.query(
      `INSERT INTO events (nama_event, tanggal_event, lokasi_event, pic_event)
       VALUES (?, ?, ?, ?)`,
      [nama_event, tanggal_event, lokasi_event, pic_event]
    );

    return NextResponse.json(
      { success: true, data: { id: result.insertId } },
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
