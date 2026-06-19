import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

// pdf-lib dipilih (bukan pdfkit) karena tidak memerlukan pembacaan file .afm
// dari disk saat runtime, sehingga jauh lebih stabil saat dijalankan di
// lingkungan Next.js / serverless (mis. Vercel) yang membundel ulang file.

const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;
const MARGIN = 40;

const ACCENT = rgb(0.31, 0.27, 0.9); // indigo
const BORDER = rgb(0.79, 0.84, 0.88);
const TEXT_DARK = rgb(0.18, 0.22, 0.29);
const TEXT_MUTED = rgb(0.58, 0.64, 0.72);

// Definisi kolom tabel. Total width harus <= (PAGE_WIDTH - 2*MARGIN) = 515.28
const COLUMNS = [
  { key: 'no', label: 'No', width: 22 },
  { key: 'nama', label: 'Nama', width: 85 },
  { key: 'instansi', label: 'Instansi', width: 85 },
  { key: 'jabatan', label: 'Jabatan', width: 70 },
  { key: 'waktu', label: 'Waktu Hadir', width: 78 },
  { key: 'lokasi', label: 'Lokasi', width: 72 },
  { key: 'ttd', label: 'Tanda Tangan', width: 103 },
];

function decodeBase64Png(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const match = /^data:image\/png;base64,(.+)$/.exec(dataUrl.trim());
  if (!match) return null;
  try {
    return Buffer.from(match[1], 'base64');
  } catch {
    return null;
  }
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

function wrapText(text, maxWidth, size, font) {
  const words = String(text ?? '').split(' ').filter(Boolean);
  if (words.length === 0) return [''];
  const lines = [];
  let line = '';

  function pushLine() {
    if (line) {
      lines.push(line);
      line = '';
    }
  }

  // Memecah paksa kata yang tetap terlalu panjang meskipun berdiri sendiri
  // (misal angka koordinat tanpa spasi) agar tidak meluber keluar kolom.
  function hardBreak(word) {
    let chunk = '';
    for (const ch of word) {
      const candidate = chunk + ch;
      if (font.widthOfTextAtSize(candidate, size) > maxWidth && chunk) {
        lines.push(chunk);
        chunk = ch;
      } else {
        chunk = candidate;
      }
    }
    return chunk;
  }

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    const width = font.widthOfTextAtSize(candidate, size);

    if (width <= maxWidth) {
      line = candidate;
      continue;
    }

    pushLine();

    if (font.widthOfTextAtSize(word, size) > maxWidth) {
      line = hardBreak(word);
    } else {
      line = word;
    }
  }
  pushLine();

  return lines.length ? lines : [''];
}

/**
 * Membuat PDF daftar hadir untuk satu event.
 * @param {object} event - row dari tabel events
 * @param {object[]} participants - rows dari tabel participants
 * @returns {Promise<Uint8Array>} bytes PDF
 */
export async function buildAttendancePdf(event, participants) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let cursorY = PAGE_HEIGHT - MARGIN;

  function addPage() {
    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    cursorY = PAGE_HEIGHT - MARGIN;
  }

  function drawText(text, x, y, { size = 9, bold = false, color = TEXT_DARK } = {}) {
    page.drawText(String(text ?? ''), { x, y, size, font: bold ? fontBold : font, color });
  }

  function drawTableHeader() {
    const headerHeight = 20;
    let x = MARGIN;
    for (const col of COLUMNS) {
      page.drawRectangle({
        x,
        y: cursorY - headerHeight,
        width: col.width,
        height: headerHeight,
        color: ACCENT,
        borderColor: BORDER,
        borderWidth: 0.5,
      });
      drawText(col.label, x + 4, cursorY - headerHeight + 6, { size: 8.5, bold: true, color: rgb(1, 1, 1) });
      x += col.width;
    }
    cursorY -= headerHeight;
  }

  // ---- Header dokumen ----
  drawText('DAFTAR HADIR PESERTA', MARGIN, cursorY - 14, { size: 15, bold: true });
  cursorY -= 36;

  const infoLines = [
    `Nama Event : ${event.nama_event}`,
    `Tanggal    : ${formatDate(event.tanggal_event)}`,
    `Lokasi     : ${event.lokasi_event}`,
    `PIC Event  : ${event.pic_event}`,
    `Jumlah Peserta Hadir : ${participants.length}`,
  ];
  for (const line of infoLines) {
    drawText(line, MARGIN, cursorY, { size: 9.5 });
    cursorY -= 14;
  }
  cursorY -= 10;

  drawTableHeader();

  if (participants.length === 0) {
    drawText('Belum ada peserta yang mengisi presensi.', MARGIN, cursorY - 16, { size: 9.5, color: TEXT_MUTED });
    cursorY -= 30;
  }

  for (let i = 0; i < participants.length; i++) {
    const p = participants[i];

    const rowData = {
      no: String(i + 1),
      nama: p.nama,
      instansi: p.asal_instansi,
      jabatan: p.jabatan,
      waktu: formatDateTime(p.presensi_at),
      lokasi: p.latitude && p.longitude ? `${p.latitude}, ${p.longitude}` : '-',
    };

    // Embed tanda tangan (jika ada & valid)
    let sigImage = null;
    let sigDims = null;
    const sigBytes = decodeBase64Png(p.signature);
    if (sigBytes) {
      try {
        sigImage = await pdfDoc.embedPng(sigBytes);
        const maxW = COLUMNS[6].width - 8;
        const maxH = 30;
        const scale = Math.min(maxW / sigImage.width, maxH / sigImage.height, 1);
        sigDims = { width: sigImage.width * scale, height: sigImage.height * scale };
      } catch {
        sigImage = null;
      }
    }

    // Hitung wrap text & tinggi baris
    const wrapped = {};
    let maxLines = 1;
    for (const col of COLUMNS) {
      if (col.key === 'ttd') continue;
      const lines = wrapText(rowData[col.key], col.width - 8, 8.5, font);
      wrapped[col.key] = lines;
      maxLines = Math.max(maxLines, lines.length);
    }
    const textHeight = maxLines * 11;
    const rowHeight = Math.max(textHeight, sigDims ? sigDims.height + 8 : 0, 22) + 8;

    // Pindah halaman jika tidak cukup ruang
    if (cursorY - rowHeight < MARGIN + 24) {
      addPage();
      drawTableHeader();
    }

    let x = MARGIN;
    for (const col of COLUMNS) {
      page.drawRectangle({
        x,
        y: cursorY - rowHeight,
        width: col.width,
        height: rowHeight,
        borderColor: BORDER,
        borderWidth: 0.5,
      });

      if (col.key === 'ttd') {
        if (sigImage && sigDims) {
          page.drawImage(sigImage, {
            x: x + 4,
            y: cursorY - rowHeight + (rowHeight - sigDims.height) / 2,
            width: sigDims.width,
            height: sigDims.height,
          });
        } else {
          drawText('-', x + 4, cursorY - 14, { size: 8.5, color: TEXT_MUTED });
        }
      } else {
        let ty = cursorY - 12;
        for (const line of wrapped[col.key]) {
          drawText(line, x + 4, ty, { size: 8.5 });
          ty -= 11;
        }
      }
      x += col.width;
    }

    cursorY -= rowHeight;
  }

  // ---- Nomor halaman di setiap halaman ----
  const allPages = pdfDoc.getPages();
  const totalPages = allPages.length;
  allPages.forEach((pg, idx) => {
    pg.drawText(`Halaman ${idx + 1} dari ${totalPages}`, {
      x: PAGE_WIDTH / 2 - 38,
      y: 20,
      size: 8,
      font,
      color: TEXT_MUTED,
    });
  });

  return pdfDoc.save();
}
