'use client';

import { useState, useEffect } from 'react';
import LocationPicker from '@/components/LocationPicker';
import { formatDateForInput, formatTimeForInput } from '@/lib/formatters';
import { apiUrl } from '@/lib/api';

export default function EditEventModal({
  isOpen,
  onClose,
  event,
  onSaved,
  currentUser,
  dict,
}) {
  const t = dict?.adminList || {};
  const isSuperAdmin = currentUser?.role === 'superadmin';

  const [form, setForm] = useState({
    nama_event: '',
    tanggal_event: '',
    waktu_event: '',
    lokasi_event: '',
    pic_event: '',
    require_location: true,
    fix_location: false,
    target_latitude: '',
    target_longitude: '',
    radius_meters: 50,
    user_id: '',
  });

  const [users, setUsers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Sinkronkan form dengan data event yang sedang diedit
  useEffect(() => {
    if (isOpen && event) {
      setForm({
        nama_event: event.nama_event || '',
        tanggal_event: formatDateForInput(event.tanggal_event),
        waktu_event: formatTimeForInput(event.waktu_event),
        lokasi_event: event.lokasi_event || '',
        pic_event: event.pic_event || '',
        require_location: event.require_location !== 0,
        fix_location: !!event.fix_location,
        target_latitude: event.target_latitude != null ? String(event.target_latitude) : '',
        target_longitude: event.target_longitude != null ? String(event.target_longitude) : '',
        radius_meters: event.radius_meters || 50,
        user_id: event.user_id ? String(event.user_id) : '',
      });
      setError('');
    }
  }, [isOpen, event]);

  // Jika superadmin, ambil daftar operator/user agar bisa dipindahtangankan jika perlu
  useEffect(() => {
    if (isOpen && isSuperAdmin && users.length === 0) {
      fetch(apiUrl('/api/users'))
        .then((res) => (res.ok ? res.json() : null))
        .then((res) => {
          if (res?.success && Array.isArray(res.data)) {
            setUsers(res.data);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, isSuperAdmin, users.length]);

  if (!isOpen || !event) return null;

  function handleChange(e) {
    const { name, type, value, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const payload = {
        nama_event: form.nama_event,
        tanggal_event: form.tanggal_event,
        waktu_event: form.waktu_event || null,
        lokasi_event: form.lokasi_event,
        pic_event: form.pic_event,
        require_location: form.require_location,
        fix_location: form.fix_location,
        target_latitude: form.target_latitude || null,
        target_longitude: form.target_longitude || null,
        radius_meters: Number(form.radius_meters) || 50,
      };

      if (isSuperAdmin) {
        payload.user_id = form.user_id ? Number(form.user_id) : null;
      }

      const res = await fetch(apiUrl(`/api/events/${event.public_id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || t.saveFailed || 'Gagal menyimpan perubahan');
        return;
      }

      if (onSaved) {
        onSaved(json.data);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan jaringan');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-2xl w-full p-5 sm:p-6 shadow-xl space-y-4 my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              ✏️ {t.editEventModalTitle || 'Edit Informasi Event'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              ID Event: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">{event.public_id}</code>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg leading-none p-1 rounded-md hover:bg-slate-100 transition"
          >
            ✕
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        {/* Scrollable Form Body */}
        <form id="edit-event-form" onSubmit={handleSubmit} className="overflow-y-auto pr-1 space-y-4 flex-1">
          <div className="grid sm:grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700">
                {t.nameLabel || 'Nama Event'} <span className="text-red-500">*</span>
              </label>
              <input
                name="nama_event"
                value={form.nama_event}
                onChange={handleChange}
                required
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-700">
                {t.dateLabel || 'Tanggal Event'} <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="tanggal_event"
                value={form.tanggal_event}
                onChange={handleChange}
                required
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-700">
                {t.timeLabel || 'Waktu Event'}
              </label>
              <input
                type="time"
                name="waktu_event"
                value={form.waktu_event}
                onChange={handleChange}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-700">
                {t.locationLabel || 'Lokasi Event'} <span className="text-red-500">*</span>
              </label>
              <input
                name="lokasi_event"
                value={form.lokasi_event}
                onChange={handleChange}
                required
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-700">
                {t.picLabel || 'PIC Event'} <span className="text-red-500">*</span>
              </label>
              <input
                name="pic_event"
                value={form.pic_event}
                onChange={handleChange}
                required
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Operator Assignment (Hanya Super Admin) */}
            {isSuperAdmin && (
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-xs font-semibold text-purple-800 flex items-center gap-1.5">
                  <span>🛡️</span> {t.operatorLabel || 'Operator Penanggung Jawab'}
                </label>
                <select
                  name="user_id"
                  value={form.user_id}
                  onChange={handleChange}
                  className="border border-purple-200 bg-purple-50/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">{t.operatorSelectPlaceholder || '-- Pilih Operator --'}</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nama} ({u.username}) {u.role === 'superadmin' ? '— Super Admin' : '— Operator'}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400">
                  Sebagai Super Admin, Anda dapat memindahtangankan event ini ke operator lain.
                </p>
              </div>
            )}

            {/* Deteksi Lokasi Checkbox */}
            <div className="sm:col-span-2 flex items-start gap-2.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
              <input
                type="checkbox"
                id="edit_require_location"
                name="require_location"
                checked={form.require_location}
                onChange={handleChange}
                className="mt-0.5 h-4 w-4 accent-indigo-600"
              />
              <label htmlFor="edit_require_location" className="text-sm text-slate-600 leading-snug cursor-pointer">
                <span className="block font-medium text-slate-700">
                  {t.requireLocationLabel || 'Wajibkan deteksi lokasi peserta (GPS)'}
                </span>
                <span className="block text-xs text-slate-400 mt-0.5">
                  {t.requireLocationHint || 'Jika dimatikan, peserta tidak akan diminta izin lokasi saat presensi.'}
                </span>
              </label>
            </div>

            {/* Geofencing Fixed Location Checkbox & Picker */}
            <div className="sm:col-span-2 flex flex-col gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3.5">
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="edit_fix_location"
                  name="fix_location"
                  checked={form.fix_location}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setForm((prev) => ({
                      ...prev,
                      fix_location: checked,
                      require_location: checked ? true : prev.require_location,
                    }));
                  }}
                  className="mt-0.5 h-4 w-4 accent-indigo-600"
                />
                <label htmlFor="edit_fix_location" className="text-sm text-slate-600 leading-snug cursor-pointer">
                  <span className="block font-medium text-slate-800">
                    {t.fixLocationLabel || 'Aktifkan Batas Lokasi (Geofencing Presensi)'}
                  </span>
                  <span className="block text-xs text-slate-500 mt-0.5">
                    {t.fixLocationHint || 'Peserta wajib berada di sekitar titik lokasi acara dalam radius toleransi untuk dapat presensi.'}
                  </span>
                </label>
              </div>

              {form.fix_location && (
                <div className="pt-3 border-t border-slate-200">
                  <LocationPicker
                    latitude={form.target_latitude}
                    longitude={form.target_longitude}
                    radius={form.radius_meters}
                    defaultSearchQuery={form.lokasi_event}
                    onChange={(updated) => setForm((prev) => ({ ...prev, ...updated }))}
                  />
                </div>
              )}
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50 transition"
          >
            {dict?.common?.cancel || 'Batal'}
          </button>
          <button
            type="submit"
            form="edit-event-form"
            disabled={submitting}
            className="px-4 py-2 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 shadow-sm flex items-center gap-1.5"
          >
            {submitting ? (dict?.common?.loading || 'Menyimpan...') : `💾 ${dict?.common?.save || 'Simpan Perubahan'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
