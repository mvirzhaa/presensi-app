import PDFDocument from 'pdfkit';
import { getPool } from '@/lib/db';

// GET /api/events/:id/export -> menghasilkan file PDF daftar hadir peserta
export async function GET(request, { params }) {
  try {
    const { id } = params;
    const pool = getPool();

    const [eventRows] = await pool.query('SELECT * FROM events WHERE id = ?', [id]);
    if (eventRows.length === 0) {
      return new Response('Event tidak ditemukan', { status: 404 });
    }
    const event = eventRows[0];

    const [participants] = await pool.query(
      'SELECT * FROM participants WHERE event_id = ? ORDER BY presensi_at ASC',
      [id]
    );

    const pdfBuffer = await buildPdf(event, participants);

    const safeFileName = event.nama_event.replace(/[^a-zA-Z0-9]+/g, '_');

    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="presensi-${safeFileName}.pdf"`,
      },
    });
  } catch (err) {
    console.error(err);
    return new Response('Gagal membuat PDF', { status: 500 });
  }
}

function buildPdf(event, participants) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header dokumen
    doc.fontSize(16).font('Helvetica-Bold').text('DAFTAR HADIR PESERTA', { align: 'center' });
    doc.moveDown(0.7);

    doc.fontSize(10).font('Helvetica');
    doc.text(`Nama Event : ${event.nama_event}`);
    doc.text(`Tanggal    : ${formatDate(event.tanggal_event)}`);
    doc.text(`Lokasi     : ${event.lokasi_event}`);
    doc.text(`PIC Event  : ${event.pic_event}`);
    doc.text(`Jumlah Peserta Hadir : ${participants.length}`);
    doc.moveDown(1);

    const colWidths = [25, 95, 95, 80, 95, 95];
    const headers = ['No', 'Nama', 'Instansi', 'Jabatan', 'Waktu Hadir', 'Koordinat Lokasi'];

    let y = doc.y;
    y = drawRow(doc, y, headers, colWidths, true);

    if (participants.length === 0) {
      doc.font('Helvetica').fontSize(10).text('Belum ada peserta yang mengisi presensi.', 40, y + 10);
    }

    participants.forEach((p, idx) => {
      if (y > 760) {
        doc.addPage();
        y = 40;
        y = drawRow(doc, y, headers, colWidths, true);
      }
      const row = [
        String(idx + 1),
        p.nama,
        p.asal_instansi,
        p.jabatan,
        formatDateTime(p.presensi_at),
        p.latitude && p.longitude ? `${p.latitude}, ${p.longitude}` : '-',
      ];
      y = drawRow(doc, y, row, colWidths, false);
    });

    doc.end();
  });
}

function drawRow(doc, y, values, colWidths, isHeader) {
  let x = 40;
  doc.font(isHeader ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5);

  const heights = values.map((val, i) =>
    doc.heightOfString(String(val), { width: colWidths[i] - 6 })
  );
  const rowHeight = Math.max(...heights, 14) + 8;

  values.forEach((val, i) => {
    doc.rect(x, y, colWidths[i], rowHeight).stroke('#cbd5e1');
    doc.fillColor('#1e293b').text(String(val), x + 3, y + 4, {
      width: colWidths[i] - 6,
    });
    x += colWidths[i];
  });

  return y + rowHeight;
}

function formatDate(d) {
  const date = new Date(d);
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatDateTime(d) {
  const date = new Date(d);
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
