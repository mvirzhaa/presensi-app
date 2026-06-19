'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function AdminPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    nama_event: '',
    tanggal_event: '',
    lokasi_event: '',
    pic_event: '',
  });

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    setLoading(true);
    try {
      const res = await fetch('/api/events');
      const json = await res.json();
      if (json.success) setEvents(json.data);
    } catch {
      setError('Gagal memuat daftar event');
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.message || 'Gagal membuat event');
        return;
      }
      setForm({ nama_event: '', tanggal_event: '', lokasi_event: '', pic_event: '' });
      await loadEvents();
    } catch {
      setError('Terjadi kesalahan saat membuat event');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Halaman Admin</h1>
          <p className="text-slate-500 text-sm">Buat event baru, lalu QR Code presensi otomatis dibuat.</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-700 mb-4">Buat Event Baru</h2>
          <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-600">Nama Event</label>
              <input
                name="nama_event"
                value={form.nama_event}
                onChange={handleChange}
                required
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-600">Tanggal Event</label>
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
              <label className="text-sm text-slate-600">Lokasi Event</label>
              <input
                name="lokasi_event"
                value={form.lokasi_event}
                onChange={handleChange}
                required
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-600">PIC Event</label>
              <input
                name="pic_event"
                value={form.pic_event}
                onChange={handleChange}
                required
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {submitting ? 'Menyimpan...' : 'Buat Event & Generate QR'}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-700 mb-4">Daftar Event</h2>
          {loading ? (
            <p className="text-sm text-slate-400">Memuat...</p>
          ) : events.length === 0 ? (
            <p className="text-sm text-slate-400">Belum ada event. Buat event pertama di atas.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {events.map((ev) => (
                <Link
                  key={ev.id}
                  href={`/admin/event/${ev.id}`}
                  className="flex items-center justify-between py-3 px-2 -mx-2 rounded-lg hover:bg-slate-50 transition"
                >
                  <div>
                    <p className="font-medium text-slate-800">{ev.nama_event}</p>
                    <p className="text-xs text-slate-500">
                      {ev.lokasi_event} · PIC: {ev.pic_event}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">
                      {new Date(ev.tanggal_event).toLocaleDateString('id-ID')}
                    </p>
                    <p className="text-xs text-indigo-600 font-medium">{ev.jumlah_peserta} peserta</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
