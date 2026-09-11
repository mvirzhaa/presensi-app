import { NextResponse } from 'next/server';
import crypto from 'crypto';
import https from 'https';
import axios from 'axios';
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE,
  createSessionToken,
} from '@/lib/auth';
import { getPool, ensureSchema } from '@/lib/db';
import { hashPassword } from '@/lib/password';

// Agent HTTPS dengan toleransi SSL sertifikat agar tidak diblokir oleh strict Node.js TLS
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

function getIntrospectUrl() {
  const rawUrl = process.env.EPORTAL_URL || 'https://eportal.uika-bogor.ac.id/eportal-api';
  const cleanUrl = rawUrl.replace(/\/+$/, '');

  if (cleanUrl.endsWith('/api')) {
    return `${cleanUrl}/sso/introspect`;
  }
  if (cleanUrl.endsWith('/eportal-api')) {
    return `${cleanUrl}/api/sso/introspect`;
  }
  if (cleanUrl.includes('eportal.uika-bogor.ac.id') && !cleanUrl.includes('eportal-api')) {
    return `${cleanUrl}/eportal-api/api/sso/introspect`;
  }
  return `${cleanUrl}/api/sso/introspect`;
}

function extractRealName(u = {}) {
  // Cek semua kemungkinan field nama dari E-Portal
  const candidates = [
    u.nama_lengkap,
    u.nama_lengkap_gelar,
    u.nama,
    u.full_name,
    u.fullname,
    u.display_name,
    u.profile?.nama_lengkap,
    u.profile?.nama,
    u.profile?.name,
    u.pegawai?.nama,
    u.dosen?.nama,
    u.mahasiswa?.nama,
    u.name,
  ];

  // 1. Prioritaskan kandidat yang valid dan BUKAN berupa email (tidak mengandung @)
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim() && !c.includes('@')) {
      return c.trim();
    }
  }

  // 2. Jika semua kandidat mengandung @ (misal akun E-Portal didaftarkan menggunakan email pada field name)
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) {
      if (c.includes('@')) {
        const prefix = c.split('@')[0].replace(/[._-]/g, ' ');
        return prefix.charAt(0).toUpperCase() + prefix.slice(1);
      }
      return c.trim();
    }
  }

  return 'User';
}

function extractUsername(u = {}, email = '') {
  const candidates = [
    u.username,
    u.npm,
    u.nidn,
    u.nip,
    email ? email.split('@')[0] : '',
    u.name && !u.name.includes('@') ? u.name : '',
    'user_sso',
  ];

  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) {
      return c.trim();
    }
  }
  return 'user_sso';
}

function isDesignatedSuperadmin(email, username) {
  const configuredEmails = (process.env.SUPERADMIN_EMAILS || 'tias.teknikinformatika@gmail.com')
    .toLowerCase()
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);

  const cleanEmail = (email || '').toLowerCase().trim();
  const cleanUsername = (username || '').toLowerCase().trim();

  // 1. Cek apakah email cocok dengan daftar SUPERADMIN_EMAILS
  if (cleanEmail && configuredEmails.includes(cleanEmail)) {
    return true;
  }

  // 2. Cek apakah username default lokal dari .env (misal 'admin')
  const defaultAdminUser = (process.env.ADMIN_USERNAME || 'admin').toLowerCase().trim();
  if (cleanUsername === defaultAdminUser) {
    return true;
  }

  return false;
}

async function handleSsoValidation(token, roleId, appModuleId, directEportalUser = null) {
  if (!token || !roleId || !appModuleId) {
    return NextResponse.json(
      { status: 400, success: false, message: 'Parameter SSO tidak lengkap (token, role_id, appModule_id dibutuhkan).' },
      { status: 400 }
    );
  }

  let eportalUser = directEportalUser;

  // 1. Jika belum ada eportalUser dari client fallback, lakukan verifikasi via server
  if (!eportalUser) {
    const introspectUrl = getIntrospectUrl();
    const clientId = (process.env.SSO_CLIENT_ID || 'a4ac8237-41ff-4a6e-8fc3-c365115455c3').trim();
    const clientSecret = (process.env.SSO_CLIENT_SECRET || 'oPVaTLrsUMD9Nl6YtEaw87ON0P8dcv2oOxICC29X7KEsld0kVnuV3YsN3WAapcGB').trim();

    let ssoRes;
    try {
      ssoRes = await axios.post(
        introspectUrl,
        {},
        {
          headers: {
            'Content-Type': 'application/json',
            'X-SSO-Client-ID': clientId,
            'X-SSO-Client-Secret': clientSecret,
            Authorization: `Bearer ${token}`,
          },
          httpsAgent,
          timeout: 4000, // 4 detik timeout agar cepat dialihkan ke client-fallback jika firewall server memblokir
          validateStatus: () => true,
        }
      );
    } catch (netErr) {
      console.error('[SSO Error] Server VPS gagal menghubungi E-Portal:', introspectUrl, netErr.message);
      const detailMsg = netErr.cause?.message || netErr.message || 'Network error';
      const errorCode = netErr.code || netErr.cause?.code || '';
      return NextResponse.json(
        {
          status: 502,
          success: false,
          fallback_client: true,
          message: `Server VPS tidak dapat menjangkau E-Portal (${errorCode || 'TIMEOUT'}): ${detailMsg}`,
          targetUrl: introspectUrl,
        },
        { status: 502 }
      );
    }

    const eportalData = ssoRes.data;

    // Jika E-Portal mengembalikan halaman HTML (misal error 502/504/404 dari Nginx)
    if (typeof eportalData === 'string' || !eportalData) {
      console.error('[SSO Error] Respons E-Portal bukan JSON valid:', ssoRes.status);
      return NextResponse.json(
        {
          status: 502,
          success: false,
          fallback_client: true,
          message: `Server E-Portal mengembalikan HTTP ${ssoRes.status} (bukan JSON).`,
          targetUrl: introspectUrl,
        },
        { status: 502 }
      );
    }

    if (ssoRes.status !== 200 || eportalData.status !== 200 || !eportalData.valid) {
      return NextResponse.json(
        {
          status: 401,
          success: false,
          message: eportalData.message || 'Token SSO E-Portal tidak valid atau telah kedaluwarsa.',
        },
        { status: 401 }
      );
    }

    eportalUser = eportalData.user || {};
  }

  const email = (eportalUser.email || '').trim().toLowerCase();
  const username = extractUsername(eportalUser, email);
  const nama = extractRealName(eportalUser);

  // 1b. Logika Penentuan Super Admin:
  // HANYA akun yang secara eksplisit terdaftar di SUPERADMIN_EMAILS (misal tias.teknikinformatika@gmail.com)
  // yang berhak mendapatkan role 'superadmin' di sistem Presensi.
  // Seluruh akun lainnya dari E-Portal HANYA mendapatkan role 'admin' (Operator Kegiatan).
  const isSuper = isDesignatedSuperadmin(email, username);
  const role = isSuper ? 'superadmin' : 'admin';

  // 2. Sinkronisasi atau Auto-Provision ke Database Lokal MySQL
  const pool = getPool();
  await ensureSchema(pool);

  let localUser = null;

  try {
    // Cari user berdasarkan email jika ada, atau username
    const [existingUsers] = await pool.query(
      `SELECT id, username, email, nama, role, is_active 
       FROM users 
       WHERE (? != '' AND email = ?) OR username = ? 
       LIMIT 1`,
      [email, email, username]
    );

    if (existingUsers.length > 0) {
      const dbUser = existingUsers[0];

      if (!dbUser.is_active) {
        return NextResponse.json(
          { status: 403, success: false, message: 'Akun Anda dinonaktifkan di sistem Presensi. Silakan hubungi Super Admin.' },
          { status: 403 }
        );
      }

      // Pastikan role disesuaikan secara ketat:
      // Hanya akun resmi superadmin yang berstatus 'superadmin'.
      // Akun lain yang sebelumnya tercatat superadmin akan dikembalikan ke 'admin' (Operator).
      const resolvedRole = isSuper ? 'superadmin' : 'admin';

      // Perbarui nama, email, atau role jika ada pembaruan dari E-Portal
      await pool.query(
        `UPDATE users SET nama = ?, email = COALESCE(email, ?), role = ? WHERE id = ?`,
        [nama, email || null, resolvedRole, dbUser.id]
      );

      localUser = {
        id: dbUser.id,
        username: dbUser.username,
        nama: nama,
        role: resolvedRole,
      };
    } else {
      // Auto-provision user baru dari E-Portal
      const randomPassword = crypto.randomUUID();
      const pwdHash = hashPassword(randomPassword);

      const [insertRes] = await pool.query(
        `INSERT INTO users (username, email, password_hash, nama, role, is_active)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [username, email || null, pwdHash, nama, role]
      );

      localUser = {
        id: insertRes.insertId,
        username,
        nama,
        role,
      };
    }
  } catch (dbErr) {
    console.error('[SSO Error] Gagal sinkronisasi data user lokal:', dbErr);
    return NextResponse.json(
      { status: 500, success: false, message: 'Gagal sinkronisasi data user lokal: ' + dbErr.message },
      { status: 500 }
    );
  }

  // 3. Buat Session Token Signed HMAC-SHA256 untuk Presensi App
  const sessionToken = await createSessionToken(localUser);

  const res = NextResponse.json({
    status: 200,
    success: true,
    message: 'SSO berhasil.',
    data: {
      id: localUser.id,
      username: localUser.username,
      nama: localUser.nama,
      role: localUser.role,
      user: eportalUser,
    },
  });

  // Pasang cookie session langsung di browser
  res.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });

  return res;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const roleId = searchParams.get('role_id');
  const appModuleId = searchParams.get('appModule_id');

  return handleSsoValidation(token, roleId, appModuleId);
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { searchParams } = new URL(request.url);

    const token = body.token || searchParams.get('token');
    const roleId = body.role_id || searchParams.get('role_id');
    const appModuleId = body.appModule_id || searchParams.get('appModule_id');
    const directUser = body.eportalUser || null;

    return handleSsoValidation(token, roleId, appModuleId, directUser);
  } catch (err) {
    return NextResponse.json(
      { status: 500, success: false, message: 'Internal Server Error: ' + err.message },
      { status: 500 }
    );
  }
}
