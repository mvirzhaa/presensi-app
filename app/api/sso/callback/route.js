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

async function handleSsoValidation(token, roleId, appModuleId) {
  if (!token || !roleId || !appModuleId) {
    return NextResponse.json(
      { status: 400, success: false, message: 'Parameter SSO tidak lengkap (token, role_id, appModule_id dibutuhkan).' },
      { status: 400 }
    );
  }

  const introspectUrl = getIntrospectUrl();
  const clientId = (process.env.SSO_CLIENT_ID || 'a4ac8237-41ff-4a6e-8fc3-c365115455c3').trim();
  const clientSecret = (process.env.SSO_CLIENT_SECRET || 'oPVaTLrsUMD9Nl6YtEaw87ON0P8dcv2oOxICC29X7KEsld0kVnuV3YsN3WAapcGB').trim();

  // 1. Verifikasi token ke E-Portal menggunakan axios dengan SSL bypass & timeout
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
        timeout: 15000,
        validateStatus: () => true, // Tangkap semua HTTP status tanpa melempar exception
      }
    );
  } catch (netErr) {
    console.error('[SSO Error] Gagal menghubungi server E-Portal:', introspectUrl, netErr.message);
    const detailMsg = netErr.cause?.message || netErr.message || 'Network error';
    const errorCode = netErr.code || netErr.cause?.code || '';
    return NextResponse.json(
      {
        status: 502,
        success: false,
        message: `Gagal menghubungi server E-Portal (${errorCode || 'NETWORK_ERROR'}): ${detailMsg}`,
        targetUrl: introspectUrl,
      },
      { status: 502 }
    );
  }

  const eportalData = ssoRes.data;

  // Jika E-Portal mengembalikan halaman HTML (misal error 502/504/404 dari Nginx)
  if (typeof eportalData === 'string' || !eportalData) {
    console.error('[SSO Error] Respons E-Portal bukan JSON valid:', ssoRes.status, typeof eportalData === 'string' ? eportalData.slice(0, 300) : eportalData);
    return NextResponse.json(
      {
        status: 502,
        success: false,
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

  const eportalUser = eportalData.user || {};
  const email = (eportalUser.email || '').trim().toLowerCase();
  const username = (
    eportalUser.username ||
    (email ? email.split('@')[0] : '') ||
    eportalUser.name ||
    'user_sso'
  ).trim();
  const nama = (eportalUser.name || eportalUser.nama || username).trim();
  const rawRole = (eportalUser.role || '').toString().toLowerCase();
  const role = rawRole === 'superadmin' ? 'superadmin' : 'admin';

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

      // Perbarui nama atau email jika ada pembaruan dari E-Portal
      await pool.query(
        `UPDATE users SET nama = ?, email = COALESCE(email, ?) WHERE id = ?`,
        [nama, email || null, dbUser.id]
      );

      localUser = {
        id: dbUser.id,
        username: dbUser.username,
        nama: nama || dbUser.nama,
        role: dbUser.role,
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

    return handleSsoValidation(token, roleId, appModuleId);
  } catch (err) {
    return NextResponse.json(
      { status: 500, success: false, message: 'Internal Server Error: ' + err.message },
      { status: 500 }
    );
  }
}
