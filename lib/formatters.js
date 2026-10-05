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

export function formatDateForInput(date) {
  if (!date) return '';
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(date.trim())) {
    return date.trim().slice(0, 10);
  }
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return typeof date === 'string' ? date.slice(0, 10) : '';
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatTimeForInput(time) {
  if (!time) return '';
  const parts = String(time).split(':');
  if (parts.length >= 2) {
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }
  return String(time).slice(0, 5);
}
