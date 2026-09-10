import { NextResponse } from 'next/server';
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE,
  createSessionToken,
  getSessionFromRequest,
} from '@/lib/auth';

export async function POST(request) {
  try {
    const existingSession = await getSessionFromRequest(request);
    if (existingSession) {
      return NextResponse.json({
        success: true,
        message: 'Session sudah aktif.',
        user: existingSession,
      });
    }

    const body = await request.json().catch(() => ({}));
    const userPayload = body.user || body;

    if (!userPayload || (!userPayload.id && !userPayload.username)) {
      return NextResponse.json(
        { success: false, message: 'Data user tidak valid untuk pembuatan session.' },
        { status: 400 }
      );
    }

    const sessionData = {
      id: userPayload.id || 0,
      username: userPayload.username || 'user',
      nama: userPayload.nama || userPayload.name || userPayload.username,
      role: userPayload.role || 'admin',
    };

    const token = await createSessionToken(sessionData);

    const res = NextResponse.json({
      success: true,
      message: 'Session login berhasil dibuat.',
      user: sessionData,
    });

    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE,
    });

    return res;
  } catch (err) {
    console.error('[API Login Error]', err);
    return NextResponse.json(
      { success: false, message: 'Gagal membuat session: ' + err.message },
      { status: 500 }
    );
  }
}
