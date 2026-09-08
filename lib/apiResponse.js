import { NextResponse } from 'next/server';

/**
 * Standardized API Response Helpers
 */

export function successResponse(data = null, status = 200, extra = {}) {
  const payload = { success: true, ...extra };
  if (data !== null) payload.data = data;
  return NextResponse.json(payload, { status });
}

export function errorResponse(message = 'Terjadi kesalahan', status = 400, extra = {}) {
  return NextResponse.json({ success: false, message, ...extra }, { status });
}

export function unauthorizedResponse(message = 'Unauthorized') {
  return errorResponse(message, 401);
}

export function forbiddenResponse(message = 'Forbidden: Akses ditolak') {
  return errorResponse(message, 403);
}

export function notFoundResponse(message = 'Data tidak ditemukan') {
  return errorResponse(message, 404);
}

export function serverErrorResponse(err, defaultMessage = 'Terjadi kesalahan pada server') {
  console.error('API Error:', err);
  const message = process.env.NODE_ENV === 'development' ? err?.message || defaultMessage : defaultMessage;
  return errorResponse(message, 500);
}
