'use client';

import { useState, useEffect } from 'react';
import { apiUrl } from '@/lib/api';

export default function ProfileModal({
  isOpen,
  onClose,
  currentUser,
  onProfileUpdated,
  dict,
}) {
  const [nama, setNama] = useState('');
  const [username, setUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isOpen && currentUser) {
      setNama(currentUser.nama || '');
      setUsername(currentUser.username || '');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      setSuccess('');
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validasi konfirmasi password baru
    if (newPassword && newPassword !== confirmPassword) {
      setError('Konfirmasi password baru tidak cocok.');
      return;
    }

    if (newPassword && newPassword.length < 6) {
      setError('Password baru minimal harus 6 karakter.');
      return;
    }

    if (newPassword && !currentPassword) {
      setError('Harap masukkan password saat ini untuk memverifikasi perubahan password.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(apiUrl('/api/auth/profile'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama,
          username,
          current_password: currentPassword || undefined,
          new_password: newPassword || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Gagal memperbarui profil');
      }

      setSuccess('Profil dan akun berhasil diperbarui!');
      if (onProfileUpdated) {
        onProfileUpdated(json.data);
      }

      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span>👤</span>
              <span>Edit Akun &amp; Ganti Password</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Perbarui username, nama lengkap, atau ubah password akun Anda.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg p-1 rounded-lg hover:bg-slate-100 transition"
          >
            ✕
          </button>
        </div>

        {/* Role Badge */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs">
          <span className="text-slate-600 font-medium">Peran / Hak Akses:</span>
          <span
            className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
              currentUser?.role === 'superadmin'
                ? 'bg-purple-100 text-purple-700 border border-purple-200'
                : 'bg-blue-100 text-blue-700 border border-blue-200'
            }`}
          >
            {currentUser?.role === 'superadmin' ? 'Super Admin' : 'Operator'}
          </span>
        </div>

        {error && (
          <div className="text-xs text-red-700 bg-red-50 p-3 rounded-xl border border-red-200 flex items-start gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="text-xs text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-200 flex items-start gap-2">
            <span>✓</span>
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* 1. Username */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Username <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="username_anda"
              className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50/50"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Digunakan saat login (huruf kecil, angka, _, -, . tanpa spasi).
            </p>
          </div>

          {/* 2. Nama Lengkap */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Nama Lengkap / Nama Tampilan <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Nama Anda"
              className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Section Ganti Password */}
          <div className="pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-700 text-xs uppercase tracking-wider">
                Ganti Password
              </span>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
              >
                {showPassword ? 'Sembunyikan' : 'Tampilkan'} Password
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mb-2.5">
              Kosongkan bagian ini jika Anda <b>tidak ingin</b> mengganti password.
            </p>

            <div className="space-y-2.5">
              <div>
                <label className="font-medium text-slate-600 block mb-1">
                  Password Saat Ini {newPassword && <span className="text-red-500">*</span>}
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Masukkan password saat ini untuk konfirmasi"
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-medium text-slate-600 block mb-1">
                  Password Baru
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {newPassword && (
                <div>
                  <label className="font-medium text-slate-600 block mb-1">
                    Konfirmasi Password Baru <span className="text-red-500">*</span>
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required={Boolean(newPassword)}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ketik ulang password baru"
                    className={`w-full border rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:outline-none ${
                      confirmPassword && confirmPassword !== newPassword
                        ? 'border-red-300 focus:ring-red-500 bg-red-50/30'
                        : 'border-slate-300 focus:ring-indigo-500'
                    }`}
                  />
                  {confirmPassword && confirmPassword !== newPassword && (
                    <p className="text-[11px] text-red-500 mt-1">Konfirmasi password tidak cocok.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 shadow cursor-pointer"
            >
              {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
