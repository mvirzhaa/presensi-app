'use client';

import { apiUrl } from '@/lib/api';
import { formatDate } from '@/lib/formatters';

export default function EventInfoCard({ event, presensiUrl, dict, lang, id }) {
  const t = dict.adminDetail;

  function copyLink() {
    navigator.clipboard.writeText(presensiUrl);
    alert(t.copied);
  }

  const locale = lang === 'en' ? 'en-US' : 'id-ID';

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-2">
        <h1 className="text-xl font-bold text-slate-800">{event.nama_event}</h1>
        <p className="text-sm text-slate-500">
          {t.dateLabel}: {formatDate(event.tanggal_event, locale)}
          {event.waktu_event ? ` · ${event.waktu_event.slice(0, 5)}` : ''}
        </p>
        <p className="text-sm text-slate-500">{t.locationLabel}: {event.lokasi_event}</p>
        <p className="text-sm text-slate-500">{t.picLabel}: {event.pic_event}</p>
        {event.creator_nama && (
          <p className="text-sm text-slate-500">
            {t.creatorLabel}: <span className="font-medium text-slate-700">{event.creator_nama}</span>
          </p>
        )}

        <div className="pt-4 flex items-center gap-3">
          <input
            readOnly
            value={presensiUrl}
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-600 bg-slate-50 font-mono"
          />
          <button
            onClick={copyLink}
            className="px-3 py-2 bg-slate-200 text-slate-700 rounded-lg text-xs hover:bg-slate-300 transition shrink-0 font-medium"
          >
            {t.copy}
          </button>
        </div>

        <div className="pt-2 flex flex-wrap gap-2">
          <a
            href={apiUrl(`/api/events/${id}/export`)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 transition shadow-sm font-medium"
          >
            📥 {t.exportPdf}
          </a>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col items-center justify-center">
        <p className="text-sm text-slate-500 mb-3">{t.qrTitle}</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={apiUrl(`/api/events/${id}/qrcode`)} alt="QR" className="w-48 h-48" />
        <p className="text-xs text-slate-400 mt-3 text-center">{t.qrCaption}</p>
      </div>
    </div>
  );
}
