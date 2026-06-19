'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import AdminHeaderBar from '@/components/AdminHeaderBar';

export default function EventDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { dict, lang } = useLanguage();
  const t = dict.adminDetail;

  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [presensiUrl, setPresensiUrl] = useState('');
  const [togglingLocation, setTogglingLocation] = useState(false);

  useEffect(() => {
    setPresensiUrl(`${window.location.origin}/presensi/${id}`);
    loadAll();

    // Auto-refresh daftar peserta tiap 10 detik agar admin lihat update real-time
    const interval = setInterval(loadParticipants, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadAll() {
    setLoading(true);
    await Promise.all([loadEvent(), loadParticipants()]);
    setLoading(false);
  }

  async function loadEvent() {
    const res = await fetch(`/api/events/${id}`);
    if (res.status === 401) {
      router.push('/admin/login');
      return;
    }
    const json = await res.json();
    if (json.success) setEvent(json.data);
  }

  async function loadParticipants() {
    const res = await fetch(`/api/events/${id}/participants`);
    if (res.status === 401) {
      router.push('/admin/login');
      return;
    }
    const json = await res.json();
    if (json.success) setParticipants(json.data);
  }

  async function toggleLocation() {
    if (!event) return;
    setTogglingLocation(true);
    try {
      const res = await fetch(`/api/events/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ require_location: !event.require_location }),
      });
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      const json = await res.json();
      if (json.success) setEvent(json.data);
    } finally {
      setTogglingLocation(false);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(presensiUrl);
    alert(t.copied);
  }

  if (loading && !event) {
    return <main className="min-h-screen flex items-center justify-center text-slate-400">{dict.common.loading}</main>;
  }

  if (!event) {
    return <main className="min-h-screen flex items-center justify-center text-slate-400">{t.notFound}</main>;
  }

  const requireLocation = !!event.require_location;

  return (
    <main className="min-h-screen bg-slate-50 py-8 sm:py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <AdminHeaderBar />

        <Link href="/admin" className="text-sm text-indigo-600 hover:underline inline-block">
          &larr; {t.back}
        </Link>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-2">
            <h1 className="text-xl font-bold text-slate-800">{event.nama_event}</h1>
            <p className="text-sm text-slate-500">
              {t.dateLabel}:{' '}
              {new Date(event.tanggal_event).toLocaleDateString(lang === 'en' ? 'en-US' : 'id-ID', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </p>
            <p className="text-sm text-slate-500">{t.locationLabel}: {event.lokasi_event}</p>
            <p className="text-sm text-slate-500">{t.picLabel}: {event.pic_event}</p>

            <div className="pt-4 flex items-center gap-3">
              <input
                readOnly
                value={presensiUrl}
                className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-600 bg-slate-50"
              />
              <button
                onClick={copyLink}
                className="px-3 py-2 bg-slate-200 text-slate-700 rounded-lg text-xs hover:bg-slate-300 transition shrink-0"
              >
                {t.copy}
              </button>
            </div>

            <a
              href={`/api/events/${id}/export`}
              className="inline-block mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 transition"
            >
              {t.exportPdf}
            </a>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col items-center justify-center">
            <p className="text-sm text-slate-500 mb-3">{t.qrTitle}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/events/${id}/qrcode`} alt="QR" className="w-48 h-48" />
            <p className="text-xs text-slate-400 mt-3 text-center">{t.qrCaption}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-medium text-slate-700">{t.locationSettingTitle}</p>
              <p className={`text-xs mt-1 ${requireLocation ? 'text-emerald-600' : 'text-slate-400'}`}>
                {requireLocation ? t.locationOn : t.locationOff}
              </p>
            </div>
            <button
              onClick={toggleLocation}
              disabled={togglingLocation}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition disabled:opacity-50 ${
                requireLocation
                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {requireLocation ? t.locationToggleOff : t.locationToggleOn}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-700">{t.participantsTitle}</h2>
            <span className="text-sm text-indigo-600 font-medium">
              {participants.length} {t.participantsSuffix}
            </span>
          </div>

          {participants.length === 0 ? (
            <p className="text-sm text-slate-400">{t.empty}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-200">
                    <th className="py-2 pr-3">{t.colNo}</th>
                    <th className="py-2 pr-3">{t.colName}</th>
                    <th className="py-2 pr-3">{t.colInstitution}</th>
                    <th className="py-2 pr-3">{t.colPosition}</th>
                    <th className="py-2 pr-3">{t.colTime}</th>
                    <th className="py-2 pr-3">{t.colLocation}</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((p, idx) => (
                    <tr key={p.id} className="border-b border-slate-100">
                      <td className="py-2 pr-3">{idx + 1}</td>
                      <td className="py-2 pr-3 font-medium text-slate-800">{p.nama}</td>
                      <td className="py-2 pr-3">{p.asal_instansi}</td>
                      <td className="py-2 pr-3">{p.jabatan}</td>
                      <td className="py-2 pr-3">{new Date(p.presensi_at).toLocaleString()}</td>
                      <td className="py-2 pr-3">
                        {p.latitude && p.longitude ? (
                          <a
                            className="text-indigo-600 hover:underline"
                            href={`https://www.google.com/maps?q=${p.latitude},${p.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {t.viewMap}
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
