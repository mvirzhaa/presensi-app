import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import { buildAttendancePdf } from '@/lib/exportPdf';

// GET /api/events/:publicId/export -> PDF daftar hadir peserta (KHUSUS ADMIN, wajib login),
// termasuk gambar tanda tangan tiap peserta. Param [id] adalah PUBLIC_ID acak.
export async function GET(request, { params }) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = params;
    const pool = getPool();

    const [eventRows] = await pool.query('SELECT * FROM events WHERE public_id = ?', [id]);
    if (eventRows.length === 0) {
      return NextResponse.json({ success: false, message: 'Event tidak ditemukan' }, { status: 404 });
    }
    const event = eventRows[0];

    const [participants] = await pool.query(
      'SELECT * FROM participants WHERE event_id = ? ORDER BY presensi_at ASC',
      [event.id]
    );

    const pdfBytes = await buildAttendancePdf(event, participants);
    const safeFileName = event.nama_event.replace(/[^a-zA-Z0-9]+/g, '_');

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="presensi-${safeFileName}.pdf"`,
      },
    });
  } catch (err) {
    console.error('Export PDF error:', err);
    return NextResponse.json(
      { success: false, message: 'Gagal membuat PDF: ' + err.message },
      { status: 500 }
    );
  }
}
