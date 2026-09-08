import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getMimeType } from '@/lib/storage';
import fs from 'fs';
import path from 'path';

// GET /api/events/:publicId/files/:fileId -> Melayani stream file (dokumen atau foto)
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
    let fullPath = path.join(process.cwd(), 'public', fileRecord.file_path);
    if (!fs.existsSync(fullPath)) {
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
    console.error('Error streaming file:', err);
    return new NextResponse('Gagal memuat file: ' + err.message, { status: 500 });
  }
}
