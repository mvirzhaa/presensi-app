// Helper agar semua API call otomatis pakai basePath yang benar.
// - Di development (localhost): BASE_PATH = '' → fetch('/api/events')
// - Di production subpath:      BASE_PATH = '/presensi' → fetch('/presensi/api/events')
//
// Set NEXT_PUBLIC_BASE_PATH=/presensi di file .env server production.

export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/**
 * Buat URL API yang sudah termasuk basePath.
 * Contoh: apiUrl('/api/events') → '/presensi/api/events' (production)
 */
export function apiUrl(path) {
  return `${BASE_PATH}${path}`;
}
