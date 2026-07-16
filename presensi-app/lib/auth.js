// Helper otentikasi admin berbasis cookie session yang ditandatangani (signed token).
// Menggunakan Web Crypto API (crypto.subtle) bawaan Node.js & Edge Runtime,
// sehingga TIDAK memerlukan paket tambahan seperti jsonwebtoken/iron-session.

export const SESSION_COOKIE_NAME = 'presensi_session';
const DEFAULT_MAX_AGE = 60 * 60 * 8; // 8 jam

function getSecret() {
  return process.env.ADMIN_SESSION_SECRET || 'dev-secret-ganti-saat-production';
}

function base64UrlEncode(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(str.length + ((4 - (str.length % 4)) % 4), '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function getKey(secret) {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

// Membuat session token bertanda tangan HMAC-SHA256 berisi payload + waktu kedaluwarsa.
export async function createSessionToken(payload, maxAgeSeconds = DEFAULT_MAX_AGE) {
  const encoder = new TextEncoder();
  const data = { ...payload, exp: Date.now() + maxAgeSeconds * 1000 };
  const payloadBytes = encoder.encode(JSON.stringify(data));
  const payloadB64 = base64UrlEncode(payloadBytes);

  const key = await getKey(getSecret());
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadB64));
  const sigB64 = base64UrlEncode(new Uint8Array(signature));

  return `${payloadB64}.${sigB64}`;
}

// Memverifikasi session token. Mengembalikan payload jika valid, null jika tidak.
export async function verifySessionToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;

  const [payloadB64, sigB64] = token.split('.');
  if (!payloadB64 || !sigB64) return null;

  try {
    const encoder = new TextEncoder();
    const key = await getKey(getSecret());
    const expectedSig = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadB64));
    const expectedSigB64 = base64UrlEncode(new Uint8Array(expectedSig));

    if (expectedSigB64 !== sigB64) return null;

    const json = new TextDecoder().decode(base64UrlDecode(payloadB64));
    const data = JSON.parse(json);

    if (data.exp && Date.now() > data.exp) return null;

    return data;
  } catch {
    return null;
  }
}

// Memeriksa kredensial login terhadap variabel environment ADMIN_USERNAME / ADMIN_PASSWORD.
export function validateCredentials(username, password) {
  const validUser = process.env.ADMIN_USERNAME || 'admin';
  const validPass = process.env.ADMIN_PASSWORD || 'admin123';
  return username === validUser && password === validPass;
}

// Dipakai di dalam route handler (Node runtime) untuk memeriksa autentikasi
// dari cookie pada request masuk. Mengembalikan payload session atau null.
export async function getSessionFromRequest(request) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

export const SESSION_MAX_AGE = DEFAULT_MAX_AGE;
