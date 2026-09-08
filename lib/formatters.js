/**
 * Utility formatter untuk ukuran file, waktu, dan tanggal.
 */

export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function formatTime(value) {
  if (!value) return null;
  // mysql2 mengembalikan kolom TIME sebagai string "HH:MM:SS"
  const parts = String(value).split(':');
  if (parts.length < 2) return value;
  return `${parts[0]}.${parts[1]}`;
}

export function formatDate(date, locale = 'id-ID') {
  if (!date) return '-';
  return new Date(date).toLocaleDateString(locale, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function formatDateTime(date, locale = 'id-ID') {
  if (!date) return '-';
  return new Date(date).toLocaleString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
