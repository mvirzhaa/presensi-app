import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

// GET /api/events/:publicId/files -> Daftar dokumen dan foto kegiatan untuk event ini
export async function GET(request, { params }) {
  try {
    const { id } = params;
    const pool = getPool();

    const [events] = await pool.query('SELECT id FROM events WHERE public_id = ?', [id]);
    if (events.length === 0) {
      return NextResponse.json({ success: false, message: 'Event tidak ditemukan' }, { status: 404 });
    }
    const eventId = events[0].id;

    const [files] = await pool.query(
      `SELECT id, file_type, original_name, file_name, file_path, file_size, mime_type, created_at
       FROM event_files
       WHERE event_id = ?
       ORDER BY id DESC`,
      [eventId]
    );

    return NextResponse.json({ success: true, data: files });
  } catch (err) {
    console.error('Error fetching event files:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// POST /api/events/:publicId/files -> Multiple upload dokumen atau foto
export async function POST(request, { params }) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = params;
    const pool = getPool();

    const [events] = await pool.query('SELECT id, user_id FROM events WHERE public_id = ?', [id]);
    if (events.length === 0) {
      return NextResponse.json({ success: false, message: 'Event tidak ditemukan' }, { status: 404 });
    }

    const event = events[0];
    const isOwner = event.user_id === session.id;
    const isSuperAdmin = session.role === 'superadmin';

    if (!isOwner && !isSuperAdmin) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const fileType = formData.get('file_type') === 'photo' ? 'photo' : 'document';
    const uploadedFiles = formData.getAll('files');

    if (!uploadedFiles || uploadedFiles.length === 0) {
      return NextResponse.json({ success: false, message: 'Tidak ada file yang diunggah' }, { status: 400 });
    }

    // Direktori penyimpanan di public/uploads/events/<eventId>/
    const targetDir = path.join(process.cwd(), 'public', 'uploads', 'events', String(event.id));
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const savedRecords = [];

    for (const file of uploadedFiles) {
      if (typeof file === 'string' || !file.name) continue;

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Buat nama file aman dengan timestamp
      const originalName = file.name;
      const extension = path.extname(originalName) || '';
      const baseName = path.basename(originalName, extension).replace(/[^a-zA-Z0-9_-]/g, '_');
      const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const savedFileName = `${baseName}_${uniqueSuffix}${extension}`;

      const fullFilePath = path.join(targetDir, savedFileName);
      fs.writeFileSync(fullFilePath, buffer);

      // Relative path yang bisa diakses via browser (/uploads/events/<eventId>/<fileName>)
      const publicPath = `/uploads/events/${event.id}/${savedFileName}`;

      const [res] = await pool.query(
        `INSERT INTO event_files (event_id, file_type, original_name, file_name, file_path, file_size, mime_type)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [event.id, fileType, originalName, savedFileName, publicPath, buffer.length, file.type || null]
      );

      savedRecords.push({
        id: res.insertId,
        event_id: event.id,
        file_type: fileType,
        original_name: originalName,
        file_name: savedFileName,
        file_path: publicPath,
        file_size: buffer.length,
        mime_type: file.type,
      });
    }

    return NextResponse.json({ success: true, data: savedRecords }, { status: 201 });
  } catch (err) {
    console.error('Error uploading event files:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// DELETE /api/events/:publicId/files?fileId=xxx -> Hapus file
export async function DELETE(request, { params }) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');

    if (!fileId) {
      return NextResponse.json({ success: false, message: 'fileId wajib diberikan' }, { status: 400 });
    }

    const pool = getPool();
    const [events] = await pool.query('SELECT id, user_id FROM events WHERE public_id = ?', [id]);
    if (events.length === 0) {
      return NextResponse.json({ success: false, message: 'Event tidak ditemukan' }, { status: 404 });
    }

    const event = events[0];
    const isOwner = event.user_id === session.id;
    const isSuperAdmin = session.role === 'superadmin';

    if (!isOwner && !isSuperAdmin) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const [files] = await pool.query(
      'SELECT id, file_path, file_name FROM event_files WHERE id = ? AND event_id = ?',
      [fileId, event.id]
    );

    if (files.length === 0) {
      return NextResponse.json({ success: false, message: 'File tidak ditemukan' }, { status: 404 });
    }

    const file = files[0];
    // Hapus file fisik dari disk jika ada
    const diskPath = path.join(process.cwd(), 'public', file.file_path);
    if (fs.existsSync(diskPath)) {
      try {
        fs.unlinkSync(diskPath);
      } catch (err) {
        console.warn('Could not remove file from disk:', err.message);
      }
    }

    await pool.query('DELETE FROM event_files WHERE id = ?', [fileId]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error deleting file:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
