'use client';

import { useState } from 'react';

export default function UserModal({
  isOpen,
  onClose,
  onSubmit,
  initialData = null, // if null -> mode add, if provided -> mode edit
  currentUser,
  dict,
}) {
  const t = dict.userManagement;
  const isEdit = !!initialData;

  const [form, setForm] = useState({
    nama: initialData?.nama || '',
    username: initialData?.username || '',
    password: '',
    is_active: initialData?.is_active ?? 1,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await onSubmit(form);
      onClose();
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan');
    } finally {
      setSubmitting(false);
    }
  }

  const isSelf = isEdit && currentUser?.id === initialData.id;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
        <h2 className="text-lg font-bold text-slate-800">
          {isEdit ? t.modalEditTitle : t.modalAddTitle}
        </h2>

        {error && (
          <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">
              {t.usernameLabel} <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              placeholder="Contoh: panitia_ti"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Digunakan untuk login (huruf kecil, angka, atau strip/underscore).
            </p>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">{t.nameLabel}</label>
            <input
              required
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              placeholder="Contoh: Panitia Seminar / Humas"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">{t.passwordLabel}</label>
            <input
              type="password"
              required={!isEdit}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              placeholder={isEdit ? t.passwordPlaceholderEdit : t.passwordPlaceholderNew}
            />
            {isEdit && (
              <p className="text-[11px] text-slate-400 mt-1">{t.passwordPlaceholderEdit}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">{t.roleLabel}</label>
            <div className="w-full border border-slate-200 bg-slate-50 rounded-lg px-3 py-2 text-sm text-slate-700 flex items-center justify-between">
              <span>
                {initialData?.role === 'superadmin' ? dict.adminNav.roleSuperadmin : t.roleAdmin}
              </span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  initialData?.role === 'superadmin'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                {initialData?.role === 'superadmin' ? 'Super Admin' : 'Operator'}
              </span>
            </div>
          </div>

          {isEdit && (
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">{t.statusLabel}</label>
              <select
                value={form.is_active}
                disabled={isSelf}
                onChange={(e) => setForm({ ...form, is_active: Number(e.target.value) })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white disabled:bg-slate-50"
              >
                <option value={1}>{t.active}</option>
                <option value={0}>{t.inactive}</option>
              </select>
            </div>
          )}

          <div className="pt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition disabled:opacity-50 font-medium"
            >
              {submitting ? t.saving : t.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
