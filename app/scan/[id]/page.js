'use client';

import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import SignaturePad from '@/components/SignaturePad';

export default function PresensiPage() {
  const { id } = useParams();
  const sigRef = useRef(null);

  const [event, setEvent] = useState(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [form, setForm] = useState({ nama: '', asal_instansi: '', jabatan: '' });
  const [coords, setCoords] = useState(null);
  const [locStatus, setLocStatus] = useState('requesting');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadEvent();
    requestLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadEvent() {
    try {
      const res = await fetch(`/api/events/${id}`);
      const json = await res.json();
      if (json.success) setEvent(json.data);
      else setError('Event tidak ditemukan');
    } catch {
      setError('Gagal memuat data event');
    } finally {
      setLoadingEvent(false);
    }
  }

  function requestLocation() {
    if (!navigator.geolocation) {
      setLocStatus('unsupported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setLocStatus('granted');
      },
      () => setLocStatus('denied'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (sigRef.current.isEmpty()) {
      setError('Mohon bubuhkan tanda tangan terlebih dahulu');
      return;
    }

    setSubmitting(true);
    try {
      const signature = sigRef.current.toDataURL();
      const res = await fetch(`/api/events/${id}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          signature,
          latitude: coords?.latitude,
          longitude: coords?.longitude,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.message || 'Gagal mengirim presensi');
        return;
      }
      setSuccess(true);
    } catch {
      setError('Terjadi kesalahan saat mengirim presensi');
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingEvent) {
    return <main className="min-h-screen flex items-center justify-center text-slate-400">Memuat...</main>;
  }

  if (!event) {
    return (
      <main className="min-h-screen flex items-center justify-center text-slate-400 text-center px-4">
        Event tidak ditemukan. Pastikan link/QR yang digunakan benar.
      </main>
    );
  }

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center max-w-sm">
          <h1 className="text-lg font-bold text-emerald-600 mb-2">Presensi Berhasil!</h1>
          <p className="text-sm text-slate-500">
            Terima kasih, kehadiran Anda pada event{' '}
            <span className="font-medium text-slate-700">{event.nama_event}</span> telah tercatat.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-bold text-slate-800">{event.nama_event}</h1>
          <p className="text-sm text-slate-500">
            {event.lokasi_event} · {new Date(event.tanggal_event).toLocaleDateString('id-ID')}
          </p>
          <p className="text-xs text-slate-400 mt-1">Formulir Presensi Kehadiran</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-slate-600">Nama Lengkap</label>
            <input
              name="nama"
              value={form.nama}
              onChange={handleChange}
              required
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-slate-600">Asal Instansi</label>
            <input
              name="asal_instansi"
              value={form.asal_instansi}
              onChange={handleChange}
              required
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-slate-600">Jabatan</label>
            <input
              name="jabatan"
              value={form.jabatan}
              onChange={handleChange}
              required
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-sm text-slate-600">Tanda Tangan</label>
              <button
                type="button"
                onClick={() => sigRef.current.clear()}
                className="text-xs text-indigo-600 hover:underline"
              >
                Hapus
              </button>
            </div>
            <SignaturePad ref={sigRef} />
          </div>

          <p className="text-xs text-slate-400">
            {locStatus === 'requesting' && 'Mendeteksi lokasi Anda...'}
            {locStatus === 'granted' && 'Lokasi berhasil terdeteksi.'}
            {locStatus === 'denied' && 'Izin lokasi ditolak, presensi tetap dapat dikirim tanpa lokasi.'}
            {locStatus === 'unsupported' && 'Perangkat tidak mendukung deteksi lokasi.'}
          </p>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {submitting ? 'Mengirim...' : 'Kirim Presensi'}
          </button>
        </form>
      </div>
    </main>
  );
}
