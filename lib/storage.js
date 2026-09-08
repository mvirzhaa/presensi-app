import path from 'path';
import fs from 'fs';

/**
 * Mendapatkan path absolut direktori penyimpanan file event di server
 */
export function getUploadDir(eventId) {
  const targetDir = path.join(process.cwd(), 'public', 'uploads', 'events', String(eventId));
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  return targetDir;
}

/**
 * Membuat nama file yang aman dari karakter aneh dan menambahkan timestamp unik
 */
export function generateSafeFileName(originalName) {
  const extension = path.extname(originalName) || '';
  const baseName = path.basename(originalName, extension).replace(/[^a-zA-Z0-9_-]/g, '_');
  const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  return `${baseName}_${uniqueSuffix}${extension}`;
}

/**
 * Mendapatkan MIME type berdasarkan ekstensi file
 */
export function getMimeType(fileName, storedMime) {
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

/**
 * Menghapus file fisik dari disk secara aman jika ada
 */
export function deletePhysicalFile(relativePath) {
  if (!relativePath) return;
  const diskPath = path.join(process.cwd(), 'public', relativePath);
  if (fs.existsSync(diskPath)) {
    try {
      fs.unlinkSync(diskPath);
    } catch (err) {
      console.warn('Failed to delete file from disk:', diskPath, err.message);
    }
  }
}
