import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import fs from 'fs';
import path from 'path';

// Helper content-type fallback jika mime_type tidak tersimpan
function getMimeType(fileName, storedMime) {
  if (storedMime && storedMime !== 'application/octet-stream') return storedMime;
  const ext = path.extname(fileName).toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    case '.pdf':
      return 'application/pdf';
    case '.doc':
      return 'application/msword';
    case '.docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case '.xls':
      return 'application/vnd.ms-excel';
    case '.xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case '.ppt':
      return 'application/vnd.ms-powerpoint';
    case '.pptx':
      return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    case '.zip':
      return 'application/zip';
    case '.rar':
      return 'application/x-rar-compressed';
    case '.txt':
      return 'text/plain; charset=utf-8';
    default:
      return 'application/octet-stream';
  }
}

// GET /api/events/:publicId/files/:fileId -> Melayani stream file (dokumen atau foto)
// Mengatasi masalah basePath subpath (/presensi) dan Next.js static runtime limitations
export async function GET(request, { params }) {
  try {
    const { id, fileId } = params;
    const { searchParams } = new URL(request.url);
    const isDownload = searchParams.get('download') === '1';

    const pool = getPool();
    const [events] = await pool.query('SELECT id FROM events WHERE public_id = ?', [id]);
    if (events.length === 0) {
      return new NextResponse('Event tidak ditemukan', { status: 404 });
    }
    const event = events[0];

    const [files] = await pool.query(
      'SELECT id, original_name, file_name, file_path, file_size, mime_type FROM event_files WHERE id = ? AND event_id = ?',
      [fileId, event.id]
    );

    if (files.length === 0) {
      return new NextResponse('File tidak ditemukan di database', { status: 404 });
    }

    const fileRecord = files[0];

    // Cek keberadaan file fisik di disk
    // Path bisa di public/uploads/events/<eventId>/<fileName> atau relative
    let fullPath = path.join(process.cwd(), 'public', fileRecord.file_path);
    if (!fs.existsSync(fullPath)) {
      // Coba fallback direktori alternatif
      fullPath = path.join(process.cwd(), fileRecord.file_path);
    }
    if (!fs.existsSync(fullPath)) {
      fullPath = path.join(process.cwd(), 'public', 'uploads', 'events', String(event.id), fileRecord.file_name);
    }

    if (!fs.existsSync(fullPath)) {
      return new NextResponse('File fisik tidak ditemukan pada server', { status: 404 });
    }

    const fileBuffer = fs.readFileSync(fullPath);
    const contentType = getMimeType(fileRecord.original_name, fileRecord.mime_type);
    const dispositionType = isDownload ? 'attachment' : 'inline';
    const safeName = encodeURIComponent(fileRecord.original_name);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(fileBuffer.length),
        'Content-Disposition': `${dispositionType}; filename="${safeName}"; filename*=UTF-8''${safeName}`,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err) {
    console.error('Error serving file:', err);
    return new NextResponse('Gagal memuat file: ' + err.message, { status: 500 });
  }
}
