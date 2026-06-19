import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

// GET /api/events/:id -> detail satu event
export async function GET(request, { params }) {
  try {
    const { id } = params;
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM events WHERE id = ?', [id]);

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

// DELETE /api/events/:id -> hapus event beserta seluruh pesertanya
export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    const pool = getPool();
    await pool.query('DELETE FROM events WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
