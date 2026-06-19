import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

// Param [id] di sini adalah PUBLIC_ID (acak), bukan id auto-increment.
// Setiap query selalu resolve public_id -> id internal terlebih dahulu.

// GET /api/events/:publicId/participants -> daftar peserta (KHUSUS ADMIN, wajib login)
// Berisi data pribadi peserta + titik lokasi, sehingga harus diproteksi.
export async function GET(request, { params }) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = params;
    const pool = getPool();

    const [eventRows] = await pool.query('SELECT id FROM events WHERE public_id = ?', [id]);
    if (eventRows.length === 0) {
      return NextResponse.json({ success: false, message: 'Event tidak ditemukan' }, { status: 404 });
    }

    const [rows] = await pool.query(
      `SELECT id, nama, asal_instansi, jabatan, latitude, longitude, presensi_at
       FROM participants
       WHERE event_id = ?
       ORDER BY presensi_at ASC`,
      [eventRows[0].id]
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

// POST /api/events/:publicId/participants -> peserta mengisi presensi (PUBLIK, diakses lewat QR)
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

    const [eventRows] = await pool.query('SELECT id FROM events WHERE public_id = ?', [id]);
    if (eventRows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Event tidak ditemukan' },
        { status: 404 }
      );
    }

    // Tanggal & jam presensi otomatis diambil dari waktu server (NOW())
    // Latitude / longitude diambil dari browser peserta saat mengisi form (jika event mewajibkannya)
    const [result] = await pool.query(
      `INSERT INTO participants
        (event_id, nama, asal_instansi, jabatan, signature, latitude, longitude, presensi_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [eventRows[0].id, nama, asal_instansi, jabatan, signature, latitude ?? null, longitude ?? null]
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
