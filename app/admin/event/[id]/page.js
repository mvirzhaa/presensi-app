'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function EventDetailPage() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [presensiUrl, setPresensiUrl] = useState('');

  useEffect(() => {
    setPresensiUrl(`${window.location.origin}/presensi/scan/${id}`);
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
    const json = await res.json();
    if (json.success) setEvent(json.data);
  }

  async function loadParticipants() {
    const res = await fetch(`/api/events/${id}/participants`);
    const json = await res.json();
    if (json.success) setParticipants(json.data);
  }

  function copyLink() {
    navigator.clipboard.writeText(presensiUrl);
    alert('Link presensi berhasil disalin');
  }

  if (loading && !event) {
    return <main className="min-h-screen flex items-center justify-center text-slate-400">Memuat...</main>;
  }

  if (!event) {
    return (
      <main className="min-h-screen flex items-center justify-center text-slate-400">
        Event tidak ditemukan
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-8">
        <Link href="/admin" className="text-sm text-indigo-600 hover:underline">
          &larr; Kembali ke daftar event
        </Link>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-2">
            <h1 className="text-xl font-bold text-slate-800">{event.nama_event}</h1>
            <p className="text-sm text-slate-500">
              Tanggal:{' '}
              {new Date(event.tanggal_event).toLocaleDateString('id-ID', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </p>
            <p className="text-sm text-slate-500">Lokasi: {event.lokasi_event}</p>
            <p className="text-sm text-slate-500">PIC: {event.pic_event}</p>

            <div className="pt-4 flex items-center gap-3">
              <input
                readOnly
                value={presensiUrl}
                className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-600 bg-slate-50"
              />
              <button
                onClick={copyLink}
                className="px-3 py-2 bg-slate-200 text-slate-700 rounded-lg text-xs hover:bg-slate-300 transition"
              >
                Salin
              </button>
            </div>

            <a
              href={`/api/events/${id}/export`}
              className="inline-block mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 transition"
            >
              Export Daftar Hadir (PDF)
            </a>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col items-center justify-center">
            <p className="text-sm text-slate-500 mb-3">QR Code Presensi</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/events/${id}/qrcode`} alt="QR Presensi" className="w-48 h-48" />
            <p className="text-xs text-slate-400 mt-3 text-center">Pindai untuk mengisi presensi</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-700">Daftar Peserta Hadir</h2>
            <span className="text-sm text-indigo-600 font-medium">{participants.length} peserta</span>
          </div>

          {participants.length === 0 ? (
            <p className="text-sm text-slate-400">Belum ada peserta yang mengisi presensi.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-200">
                    <th className="py-2 pr-3">No</th>
                    <th className="py-2 pr-3">Nama</th>
                    <th className="py-2 pr-3">Instansi</th>
                    <th className="py-2 pr-3">Jabatan</th>
                    <th className="py-2 pr-3">Waktu Hadir</th>
                    <th className="py-2 pr-3">Lokasi</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((p, idx) => (
                    <tr key={p.id} className="border-b border-slate-100">
                      <td className="py-2 pr-3">{idx + 1}</td>
                      <td className="py-2 pr-3 font-medium text-slate-800">{p.nama}</td>
                      <td className="py-2 pr-3">{p.asal_instansi}</td>
                      <td className="py-2 pr-3">{p.jabatan}</td>
                      <td className="py-2 pr-3">{new Date(p.presensi_at).toLocaleString('id-ID')}</td>
                      <td className="py-2 pr-3">
                        {p.latitude && p.longitude ? (
                          <a
                            className="text-indigo-600 hover:underline"
                            href={`https://www.google.com/maps?q=${p.latitude},${p.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Lihat Peta
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
