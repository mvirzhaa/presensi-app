import QRCode from 'qrcode';

// GET /api/events/:id/qrcode -> mengembalikan gambar PNG QR Code
// yang berisi link ke halaman presensi publik /presensi/:id
export async function GET(request, { params }) {
  try {
    const { id } = params;
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
