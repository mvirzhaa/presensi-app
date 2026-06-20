'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/LanguageProvider';
import AdminHeaderBar from '@/components/AdminHeaderBar';
import EventsTable from '@/components/EventsTable';
import { apiUrl } from '@/lib/api';

export default function AdminPage() {
  const router = useRouter();
  const { dict } = useLanguage();
  const t = dict.adminList;

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    nama_event: '',
    tanggal_event: '',
    waktu_event: '',
    lokasi_event: '',
    pic_event: '',
    require_location: true,
  });

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadEvents() {
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/events'));
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      const json = await res.json();
      if (json.success) setEvents(json.data);
    } catch {
      setError(t.errorGeneric);
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    const { name, type, value, checked } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(apiUrl('/api/events'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      const json = await res.json();
      if (!json.success) {
        setError(json.message || t.errorGeneric);
        return;
      }
      setForm({ nama_event: '', tanggal_event: '', waktu_event: '', lokasi_event: '', pic_event: '', require_location: true });
      await loadEvents();
    } catch {
      setError(t.errorGeneric);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 py-8 sm:py-10 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        <AdminHeaderBar />

        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t.title}</h1>
          <p className="text-slate-500 text-sm">{t.subtitle}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-700 mb-4">{t.createTitle}</h2>
          <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-sm text-slate-600">{t.nameLabel}</label>
              <input
                name="nama_event"
                value={form.nama_event}
                onChange={handleChange}
                required
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-600">{t.dateLabel}</label>
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
              <label className="text-sm text-slate-600">{t.timeLabel}</label>
              <input
                type="time"
                name="waktu_event"
                value={form.waktu_event}
                onChange={handleChange}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-600">{t.locationLabel}</label>
              <input
                name="lokasi_event"
                value={form.lokasi_event}
                onChange={handleChange}
                required
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-600">{t.picLabel}</label>
              <input
                name="pic_event"
                value={form.pic_event}
                onChange={handleChange}
                required
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="sm:col-span-2 flex items-start gap-2.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
              <input
                type="checkbox"
                id="require_location"
                name="require_location"
                checked={form.require_location}
                onChange={handleChange}
                className="mt-0.5 h-4 w-4 accent-indigo-600"
              />
              <label htmlFor="require_location" className="text-sm text-slate-600 leading-snug">
                <span className="block font-medium text-slate-700">{t.requireLocationLabel}</span>
                <span className="block text-xs text-slate-400 mt-0.5">{t.requireLocationHint}</span>
              </label>
            </div>

            {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {submitting ? t.submitting : t.submit}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-700 mb-4">{t.listTitle}</h2>
          {loading ? (
            <p className="text-sm text-slate-400">{dict.common.loading}</p>
          ) : (
            <EventsTable events={events} />
          )}
        </div>
      </div>
    </main>
  );
}
