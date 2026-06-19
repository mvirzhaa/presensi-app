import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

// GET /api/events/:id/participants -> daftar peserta yang sudah presensi
export async function GET(request, { params }) {
  try {
    const { id } = params;
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT id, nama, asal_instansi, jabatan, latitude, longitude, presensi_at
       FROM participants
       WHERE event_id = ?
       ORDER BY presensi_at ASC`,
      [id]
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

// POST /api/events/:id/participants -> peserta mengisi presensi
export async function POST(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { nama, asal_instansi, jabatan, signature, latitude, longitude } = body;

    if (!nama || !asal_instansi || !jabatan || !signature) {
      return NextResponse.json(
        { success: false, message: 'Nama, instansi, jabatan, dan tanda tangan wajib diisi' },
        { status: 400 }
      );
    }

    const pool = getPool();

    const [eventRows] = await pool.query('SELECT id FROM events WHERE id = ?', [id]);
    if (eventRows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Event tidak ditemukan' },
        { status: 404 }
      );
    }

    // Tanggal & jam presensi otomatis diambil dari waktu server (NOW())
    // Latitude / longitude diambil dari browser peserta saat mengisi form
    const [result] = await pool.query(
      `INSERT INTO participants
        (event_id, nama, asal_instansi, jabatan, signature, latitude, longitude, presensi_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [id, nama, asal_instansi, jabatan, signature, latitude ?? null, longitude ?? null]
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
