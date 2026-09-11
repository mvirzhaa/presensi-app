'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/components/LanguageProvider';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { apiUrl } from '@/lib/api';

function LoginForm() {
  const { dict } = useLanguage();
  const t = dict.login;
  const router = useRouter();
  const searchParams = useSearchParams();

  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [ssoProcessing, setSsoProcessing] = useState(false);
  const [ssoStatusText, setSsoStatusText] = useState('Memproses login SSO E-Portal...');

  useEffect(() => {
    const handleSsoLogin = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const ssoToken = urlParams.get('token');
      const roleId = urlParams.get('role_id');
      const appModuleId = urlParams.get('appModule_id');

      if (!ssoToken || !roleId || !appModuleId) return;

      setSsoProcessing(true);
      setSsoStatusText('Memverifikasi autentikasi ke E-Portal UIKA...');

      // Bersihkan query string dari URL agar token tidak tersimpan di riwayat browser
      window.history.replaceState({}, document.title, window.location.pathname);

      try {
        const callbackUrl = `${apiUrl('/api/sso/callback')}?token=${encodeURIComponent(ssoToken)}&role_id=${encodeURIComponent(roleId)}&appModule_id=${encodeURIComponent(appModuleId)}`;
        let data;
        try {
          const res = await fetch(callbackUrl, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
          });
          data = await res.json();
        } catch {
          data = { status: 502, fallback_client: true };
        }

        // Jika server VPS tidak dapat menjangkau E-Portal (karena firewall / routing kampus),
        // jalankan introspeksi langsung dari browser pengguna (CORS sudah diizinkan oleh E-Portal).
        if (data.status === 502 || data.fallback_client) {
          setSsoStatusText('Menghubungkan langsung ke E-Portal...');

          const clientRes = await fetch('https://eportal.uika-bogor.ac.id/eportal-api/api/sso/introspect', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-SSO-Client-ID': 'a4ac8237-41ff-4a6e-8fc3-c365115455c3',
              'X-SSO-Client-Secret': 'oPVaTLrsUMD9Nl6YtEaw87ON0P8dcv2oOxICC29X7KEsld0kVnuV3YsN3WAapcGB',
              'Authorization': `Bearer ${ssoToken}`,
            },
            body: JSON.stringify({}),
          });

          const clientData = await clientRes.json();

          if (clientData.status !== 200 || !clientData.valid) {
            throw new Error(clientData.message || 'Token SSO tidak valid atau sudah kedaluwarsa.');
          }

          // Kirim data user yang terverifikasi ke server Presensi untuk auto-provision dan pembuatan session cookie
          setSsoStatusText('Menyinkronkan sesi login...');
          const syncRes = await fetch(apiUrl('/api/sso/callback'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token: ssoToken,
              role_id: roleId,
              appModule_id: appModuleId,
              eportalUser: clientData.user,
            }),
          });

          data = await syncRes.json();
          if (data.status !== 200 || !data.success) {
            throw new Error(data.message || 'Gagal menyimpan sesi login.');
          }
        } else if (data.status !== 200 || !data.success) {
          throw new Error(data.message || 'Token SSO tidak valid atau sudah kedaluwarsa.');
        }

        setSsoStatusText('Login berhasil! Mengalihkan ke Dashboard...');

        const nextParam = searchParams.get('next') || '/admin';
        const targetUrl = apiUrl(nextParam.startsWith('/') ? nextParam : `/${nextParam}`);
        window.location.href = targetUrl;
      } catch (err) {
        console.error('[SSO Error]', err);
        setError(`SSO Login gagal: ${err.message || 'Terjadi kesalahan'}. Silakan login manual.`);
        setSsoProcessing(false);
      }
    };

    handleSsoLogin();
  }, [searchParams]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.message === 'Username atau password salah' ? t.invalid : json.message || t.generic);
        return;
      }
      const next = searchParams.get('next') || '/admin';
      router.push(next);
      router.refresh();
    } catch {
      setError(t.generic);
    } finally {
      setSubmitting(false);
    }
  }

  if (ssoProcessing) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4 relative">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h2 className="text-lg font-bold text-slate-800">Autentikasi SSO E-Portal</h2>
          <p className="text-sm text-slate-600">{ssoStatusText}</p>
          <p className="text-xs text-slate-400">Mohon tunggu, Anda sedang dialihkan...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4 relative">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-slate-800">{t.title}</h1>
          <p className="text-sm text-slate-500 mt-1">{t.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-slate-600">{t.username}</label>
            <input
              name="username"
              value={form.username}
              onChange={handleChange}
              required
              autoFocus
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-slate-600">{t.password}</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {submitting ? t.submitting : t.submit}
          </button>
        </form>

        <div className="text-center mt-4">
          <Link href="/" className="text-xs text-slate-400 hover:text-slate-600">
            &larr; {t.backHome}
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
