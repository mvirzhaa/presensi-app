import QRCode from 'qrcode';
import { getPool } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

// GET /api/events/:publicId/qrcode -> gambar PNG QR Code berisi link ke
// halaman presensi publik /presensi/:publicId.
// Param [id] adalah PUBLIC_ID acak. Diproteksi karena hanya dipakai di
// halaman admin (request <img> dari halaman admin otomatis menyertakan
// cookie session yang sama).
export async function GET(request, { params }) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const { id } = params;

    const pool = getPool();
    const [rows] = await pool.query('SELECT id FROM events WHERE public_id = ?', [id]);
    if (rows.length === 0) {
      return new Response('Event tidak ditemukan', { status: 404 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const url = `${baseUrl}/presensi/${id}`;

    const buffer = await QRCode.toBuffer(url, {
      width: 400,
      margin: 2,
      color: { dark: '#1e293b', light: '#ffffff' },
    });

    return new Response(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error(err);
    return new Response('Gagal membuat QR Code', { status: 500 });
  }
}
