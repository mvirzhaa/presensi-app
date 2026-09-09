import { PDFDocument, StandardFonts, rgb, PDFString } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { calculateDistance, formatDistance, getGoogleMapsUrl } from '@/lib/geo';

// pdf-lib dipilih karena stabil saat di-bundle di lingkungan Next.js / serverless.
const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;
const MARGIN = 40;

const ACCENT = rgb(0.31, 0.27, 0.9); // indigo
const BORDER = rgb(0.79, 0.84, 0.88);
const TEXT_DARK = rgb(0.18, 0.22, 0.29);
const TEXT_MUTED = rgb(0.58, 0.64, 0.72);

function addLinkAnnotation(pdfDoc, page, x, y, width, height, url) {
  if (!url) return;
  try {
    const link = pdfDoc.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [x, y, x + width, y + height],
      Border: [0, 0, 0],
      A: {
        Type: 'Action',
        S: 'URI',
        URI: PDFString.of(url),
      },
    });
    const linkRef = pdfDoc.context.register(link);
    page.node.addAnnot(linkRef);
  } catch (err) {
    console.warn('Could not add link annotation:', err.message);
  }
}

// Definisi kolom tabel peserta
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

function sanitizeWinAnsi(text) {
  if (!text) return '';
  return String(text)
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '');
}

function wrapText(text, maxWidth, size, font) {
  const rawStr = String(text ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rawLines = rawStr.split('\n');
  const lines = [];

  for (const rawLine of rawLines) {
    const cleanLine = rawLine.replace(/[^\x20-\x7E\xA0-\xFF]/g, '');
    const words = cleanLine.split(' ').filter(Boolean);
    if (words.length === 0) continue;

    let line = '';

    function pushLine() {
      if (line) {
        lines.push(line);
        line = '';
      }
    }

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
  }

  return lines.length ? lines : [''];
}

async function embedImageBuffer(pdfDoc, buffer) {
  if (!buffer || buffer.length < 4) return null;
  // PNG signature: 0x89, 0x50, 0x4E, 0x47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    try {
      return await pdfDoc.embedPng(buffer);
    } catch {
      return null;
    }
  }
  // JPEG signature: 0xFF, 0xD8
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
    try {
      return await pdfDoc.embedJpg(buffer);
    } catch {
      return null;
    }
  }
  // Fallback
  try {
    return await pdfDoc.embedJpg(buffer);
  } catch {
    try {
      return await pdfDoc.embedPng(buffer);
    } catch {
      return null;
    }
  }
}

function getPhotoBuffer(photo, eventId) {
  let fullPath = path.join(process.cwd(), 'public', photo.file_path);
  if (!fs.existsSync(fullPath)) {
    fullPath = path.join(process.cwd(), photo.file_path);
  }
  if (!fs.existsSync(fullPath)) {
    fullPath = path.join(process.cwd(), 'public', 'uploads', 'events', String(eventId), photo.file_name);
  }
  if (fs.existsSync(fullPath)) {
    try {
      return fs.readFileSync(fullPath);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Membuat PDF daftar hadir lengkap dengan notulensi dan foto kegiatan.
 * @param {object} event - row dari tabel events
 * @param {object[]} participants - rows dari tabel participants
 * @param {object[]} photos - rows dari tabel event_files dengan file_type = 'photo'
 * @returns {Promise<Uint8Array>} bytes PDF
 */
export async function buildAttendancePdf(event, participants, photos = []) {
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
    const safeText = sanitizeWinAnsi(text);
    page.drawText(safeText, { x, y, size, font: bold ? fontBold : font, color });
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
  drawText('LAPORAN DAFTAR HADIR & KEGIATAN', MARGIN, cursorY - 14, { size: 14, bold: true, color: ACCENT });
  cursorY -= 34;

  const eventMapsUrl = getGoogleMapsUrl(event.target_latitude, event.target_longitude, event.lokasi_event);

  const infoLines = [
    `Nama Event : ${event.nama_event}`,
    `Tanggal    : ${formatDate(event.tanggal_event)}`,
    `Lokasi     : ${event.lokasi_event}`,
    `PIC Event  : ${event.pic_event}`,
    `Jumlah Peserta Hadir : ${participants.length} orang`,
  ];
  if (event.fix_location && event.target_latitude && event.target_longitude) {
    infoLines.splice(
      3,
      0,
      `Titik GPS   : ${event.target_latitude}, ${event.target_longitude} (Radius Toleransi: ${event.radius_meters || 50} m)`
    );
  }

  for (const line of infoLines) {
    drawText(line, MARGIN, cursorY, { size: 9 });
    cursorY -= 13;
  }
  cursorY -= 3;

  // Badge Lokasi Acara yang terhubung langsung ke Google Maps
  const badgeText = 'Buka Titik Acara di Google Maps';
  const badgeW = fontBold.widthOfTextAtSize(badgeText, 8.5) + 16;
  const badgeH = 16;
  const badgeX = MARGIN;
  const badgeY = cursorY - badgeH;

  page.drawRectangle({
    x: badgeX,
    y: badgeY,
    width: badgeW,
    height: badgeH,
    color: rgb(0.93, 0.94, 0.99),
    borderColor: ACCENT,
    borderWidth: 0.8,
  });

  page.drawText(badgeText, {
    x: badgeX + 8,
    y: badgeY + 4.5,
    size: 8.5,
    font: fontBold,
    color: ACCENT,
  });

  addLinkAnnotation(pdfDoc, page, badgeX, badgeY, badgeW, badgeH, eventMapsUrl);
  cursorY -= badgeH + 12;

  drawTableHeader();

  if (participants.length === 0) {
    drawText('Belum ada peserta yang mengisi presensi.', MARGIN, cursorY - 16, { size: 9, color: TEXT_MUTED });
    cursorY -= 30;
  }

  for (let i = 0; i < participants.length; i++) {
    const p = participants[i];

    let participantMapsUrl = null;
    let lokasiDisplay = '-';

    if (p.latitude && p.longitude) {
      participantMapsUrl = `https://www.google.com/maps?q=${p.latitude},${p.longitude}`;
      let distStr = '';
      if (event.target_latitude && event.target_longitude) {
        const d = calculateDistance(p.latitude, p.longitude, event.target_latitude, event.target_longitude);
        if (d !== null) {
          distStr = `\n(±${formatDistance(d)})`;
        }
      }
      lokasiDisplay = `${p.latitude},\n${p.longitude}${distStr}\n[Maps]`;
    }

    const rowData = {
      no: String(i + 1),
      nama: p.nama,
      instansi: p.asal_instansi,
      jabatan: p.jabatan,
      waktu: formatDateTime(p.presensi_at),
      lokasi: lokasiDisplay,
    };

    // Embed tanda tangan
    let sigImage = null;
    let sigDims = null;
    const pngBytes = decodeBase64Png(p.signature);
    if (pngBytes) {
      try {
        sigImage = await pdfDoc.embedPng(pngBytes);
        const maxSigWidth = COLUMNS.find((c) => c.key === 'ttd').width - 8;
        const maxSigHeight = 26;
        sigDims = sigImage.scaleToFit(maxSigWidth, maxSigHeight);
      } catch {
        sigImage = null;
      }
    }

    // Wrap text per kolom
    const wrapped = {};
    let maxLines = 1;
    for (const col of COLUMNS) {
      if (col.key === 'ttd') continue;
      const fontSize = col.key === 'lokasi' ? 7.5 : 8.5;
      const lines = wrapText(rowData[col.key], col.width - 8, fontSize, font);
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
        const isLokasiCol = col.key === 'lokasi';
        const fontSize = isLokasiCol ? 7.5 : 8.5;
        const lineStep = isLokasiCol ? 9.5 : 11;
        let ty = cursorY - (isLokasiCol ? 11 : 12);

        for (const line of wrapped[col.key]) {
          const isMapsLine = line.includes('[Maps]');
          drawText(line, x + 4, ty, {
            size: fontSize,
            color: isMapsLine ? ACCENT : TEXT_DARK,
            bold: isMapsLine,
          });
          ty -= lineStep;
        }

        if (isLokasiCol && participantMapsUrl) {
          addLinkAnnotation(pdfDoc, page, x, cursorY - rowHeight, col.width, rowHeight, participantMapsUrl);
        }
      }
      x += col.width;
    }

    cursorY -= rowHeight;
  }

  // ---- Bagian Notulensi / Notes Kegiatan (jika ada) ----
  if (event.notulensi && event.notulensi.trim()) {
    const notulensiLines = wrapText(event.notulensi, PAGE_WIDTH - 2 * MARGIN - 16, 8.5, font);
    const requiredHeight = 35 + notulensiLines.length * 12;

    if (cursorY - requiredHeight < MARGIN + 35) {
      addPage();
    } else {
      cursorY -= 22;
    }

    drawText('Notulensi / Catatan Rapat', MARGIN, cursorY, { font: fontBold, size: 11, color: ACCENT });
    cursorY -= 14;

    const boxHeight = notulensiLines.length * 12 + 14;
    page.drawRectangle({
      x: MARGIN,
      y: cursorY - boxHeight,
      width: PAGE_WIDTH - 2 * MARGIN,
      height: boxHeight,
      borderColor: BORDER,
      borderWidth: 0.5,
      color: rgb(0.98, 0.98, 0.99),
    });

    let ny = cursorY - 12;
    for (const line of notulensiLines) {
      drawText(line, MARGIN + 8, ny, { size: 8.5, color: TEXT_DARK });
      ny -= 12;
    }

    cursorY -= boxHeight + 10;
  }

  // ---- Bagian Dokumentasi Foto Kegiatan (jika ada) ----
  if (photos && photos.length > 0) {
    // Berikan ruang atau halaman baru jika ruang tersisa di bawah 260pt
    if (cursorY < 260) {
      addPage();
    } else {
      cursorY -= 22;
    }

    drawText('Dokumentasi Foto Kegiatan', MARGIN, cursorY, { font: fontBold, size: 11, color: ACCENT });
    cursorY -= 16;

    const availableWidth = PAGE_WIDTH - 2 * MARGIN;
    const gap = 16;
    const cellWidth = (availableWidth - gap) / 2; // ~249.6
    const maxPhotoHeight = 150;
    const rowHeight = maxPhotoHeight + 20;

    for (let i = 0; i < photos.length; i += 2) {
      // Cek apakah muat di halaman saat ini
      if (cursorY - rowHeight < MARGIN + 25) {
        addPage();
        drawText('Dokumentasi Foto Kegiatan (Lanjutan)', MARGIN, cursorY, { font: fontBold, size: 10, color: ACCENT });
        cursorY -= 16;
      }

      const rowPhotos = photos.slice(i, i + 2);

      for (let j = 0; j < rowPhotos.length; j++) {
        const photo = rowPhotos[j];
        const cellX = MARGIN + j * (cellWidth + gap);

        const buffer = getPhotoBuffer(photo, event.id);
        let embeddedImg = null;
        if (buffer) {
          embeddedImg = await embedImageBuffer(pdfDoc, buffer);
        }

        // Frame kotak foto
        page.drawRectangle({
          x: cellX,
          y: cursorY - maxPhotoHeight,
          width: cellWidth,
          height: maxPhotoHeight,
          borderColor: BORDER,
          borderWidth: 0.5,
          color: rgb(0.97, 0.98, 0.99),
        });

        if (embeddedImg) {
          const dims = embeddedImg.scaleToFit(cellWidth - 8, maxPhotoHeight - 8);
          page.drawImage(embeddedImg, {
            x: cellX + (cellWidth - dims.width) / 2,
            y: cursorY - maxPhotoHeight + (maxPhotoHeight - dims.height) / 2,
            width: dims.width,
            height: dims.height,
          });
        } else {
          drawText('[Foto tidak dapat dimuat]', cellX + 12, cursorY - maxPhotoHeight / 2, {
            size: 8,
            color: TEXT_MUTED,
          });
        }

        // Keterangan nama foto di bawah frame
        const safeCaption = sanitizeWinAnsi(photo.original_name);
        const truncatedCaption = safeCaption.length > 36 ? safeCaption.substring(0, 33) + '...' : safeCaption;
        drawText(truncatedCaption, cellX + 4, cursorY - maxPhotoHeight - 11, { size: 7.5, color: TEXT_MUTED });
      }

      cursorY -= rowHeight + 10;
    }
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
