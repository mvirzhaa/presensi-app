import { getPool } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import { getUploadDir, generateSafeFileName, deletePhysicalFile } from '@/lib/storage';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  serverErrorResponse,
} from '@/lib/apiResponse';
import fs from 'fs';
import path from 'path';

// GET /api/events/:publicId/files -> Daftar dokumen dan foto kegiatan
export async function GET(request, { params }) {
  try {
    const { id } = params;
    const pool = getPool();

    const [events] = await pool.query('SELECT id FROM events WHERE public_id = ?', [id]);
    if (events.length === 0) return notFoundResponse('Event tidak ditemukan');

    const [files] = await pool.query(
      `SELECT id, file_type, original_name, file_name, file_path, file_size, mime_type, created_at
       FROM event_files
       WHERE event_id = ?
       ORDER BY id DESC`,
      [events[0].id]
    );

    return successResponse(files);
  } catch (err) {
    return serverErrorResponse(err, 'Gagal mengambil daftar file');
  }
}

// POST /api/events/:publicId/files -> Multiple upload dokumen atau foto
export async function POST(request, { params }) {
  const session = await getSessionFromRequest(request);
  if (!session) return unauthorizedResponse();

  try {
    const { id } = params;
    const pool = getPool();

    const [events] = await pool.query('SELECT id, user_id FROM events WHERE public_id = ?', [id]);
    if (events.length === 0) return notFoundResponse('Event tidak ditemukan');

    const event = events[0];
    const isAuthorized = session.role === 'superadmin' || event.user_id === session.id;
    if (!isAuthorized) return forbiddenResponse('Anda tidak memiliki akses mengunggah ke event ini');

    const formData = await request.formData();
    const fileType = formData.get('file_type') === 'photo' ? 'photo' : 'document';
    const uploadedFiles = formData.getAll('files');

    if (!uploadedFiles || uploadedFiles.length === 0) {
      return errorResponse('Tidak ada file yang diunggah');
    }

    const targetDir = getUploadDir(event.id);
    const savedRecords = [];

    for (const file of uploadedFiles) {
      if (typeof file === 'string' || !file.name) continue;

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const savedFileName = generateSafeFileName(file.name);
      const fullFilePath = path.join(targetDir, savedFileName);

      fs.writeFileSync(fullFilePath, buffer);
      const publicPath = `/uploads/events/${event.id}/${savedFileName}`;

      const [res] = await pool.query(
        `INSERT INTO event_files (event_id, file_type, original_name, file_name, file_path, file_size, mime_type)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [event.id, fileType, file.name, savedFileName, publicPath, buffer.length, file.type || null]
      );

      savedRecords.push({
        id: res.insertId,
        event_id: event.id,
        file_type: fileType,
        original_name: file.name,
        file_name: savedFileName,
        file_path: publicPath,
        file_size: buffer.length,
        mime_type: file.type,
      });
    }

    return successResponse(savedRecords, 201);
  } catch (err) {
    return serverErrorResponse(err, 'Gagal mengunggah file');
  }
}

// DELETE /api/events/:publicId/files?fileId=xxx -> Hapus file
export async function DELETE(request, { params }) {
  const session = await getSessionFromRequest(request);
  if (!session) return unauthorizedResponse();

  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');

    if (!fileId) return errorResponse('fileId wajib diberikan');

    const pool = getPool();
    const [events] = await pool.query('SELECT id, user_id FROM events WHERE public_id = ?', [id]);
    if (events.length === 0) return notFoundResponse('Event tidak ditemukan');

    const event = events[0];
    const isAuthorized = session.role === 'superadmin' || event.user_id === session.id;
    if (!isAuthorized) return forbiddenResponse('Anda tidak memiliki akses menghapus file ini');

    const [files] = await pool.query(
      'SELECT id, file_path FROM event_files WHERE id = ? AND event_id = ?',
      [fileId, event.id]
    );

    if (files.length === 0) return notFoundResponse('File tidak ditemukan');

    deletePhysicalFile(files[0].file_path);
    await pool.query('DELETE FROM event_files WHERE id = ?', [fileId]);

    return successResponse({ deletedId: fileId });
  } catch (err) {
    return serverErrorResponse(err, 'Gagal menghapus file');
  }
}
