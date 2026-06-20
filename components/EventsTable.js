'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/components/LanguageProvider';
import QrModal from '@/components/QrModal';
import { apiUrl } from '@/lib/api';

const PAGE_SIZE_OPTIONS = [10, 20, 50];

function SortIcon({ active, direction }) {
  return (
    <svg viewBox="0 0 24 24" className={`w-3 h-3 inline-block ml-1 ${active ? 'text-indigo-600' : 'text-slate-300'}`} fill="none" stroke="currentColor" strokeWidth="3">
      {(!active || direction === 'asc') && <path strokeLinecap="round" strokeLinejoin="round" d="M6 14l6-6 6 6" opacity={active && direction === 'desc' ? 0.25 : 1} />}
      {(!active || direction === 'desc') && <path strokeLinecap="round" strokeLinejoin="round" d="M6 10l6 6 6-6" opacity={active && direction === 'asc' ? 0.25 : 1} />}
    </svg>
  );
}

function formatTime(value) {
  if (!value) return null;
  // mysql2 mengembalikan kolom TIME sebagai string "HH:MM:SS"
  const parts = String(value).split(':');
  if (parts.length < 2) return value;
  return `${parts[0]}.${parts[1]}`;
}

export default function EventsTable({ events }) {
  const { dict, lang } = useLanguage();
  const t = dict.adminList;

  const [search, setSearch] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterPic, setFilterPic] = useState('');
  const [sortKey, setSortKey] = useState('tanggal_event');
  const [sortDir, setSortDir] = useState('desc');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [qrEvent, setQrEvent] = useState(null);

  const locations = useMemo(
    () => Array.from(new Set(events.map((e) => e.lokasi_event).filter(Boolean))).sort(),
    [events]
  );
  const pics = useMemo(
    () => Array.from(new Set(events.map((e) => e.pic_event).filter(Boolean))).sort(),
    [events]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((ev) => {
      if (filterLocation && ev.lokasi_event !== filterLocation) return false;
      if (filterPic && ev.pic_event !== filterPic) return false;
      if (!q) return true;
      return (
        ev.nama_event?.toLowerCase().includes(q) ||
        ev.lokasi_event?.toLowerCase().includes(q) ||
        ev.pic_event?.toLowerCase().includes(q)
      );
    });
  }, [events, search, filterLocation, filterPic]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      let va = a[sortKey];
      let vb = b[sortKey];

      if (sortKey === 'jumlah_peserta') {
        va = Number(va) || 0;
        vb = Number(vb) || 0;
      } else {
        va = (va ?? '').toString().toLowerCase();
        vb = (vb ?? '').toString().toLowerCase();
      }

      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  const totalItems = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => {
    setPage(1);
  }, [search, filterLocation, filterPic, pageSize, sortKey, sortDir]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function Th({ label, sortKeyName, className = '' }) {
    return (
      <th
        onClick={() => toggleSort(sortKeyName)}
        className={`py-2 pr-3 cursor-pointer select-none hover:text-slate-700 transition whitespace-nowrap ${className}`}
      >
        {label}
        <SortIcon active={sortKey === sortKeyName} direction={sortDir} />
      </th>
    );
  }

  const dateLocale = lang === 'en' ? 'en-US' : 'id-ID';
  const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);

  return (
    <div>
      {/* Search & filter */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <svg viewBox="0 0 24 24" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path strokeLinecap="round" d="M21 21l-4.3-4.3" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={filterLocation}
          onChange={(e) => setFilterLocation(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">{t.filterLocationAll}</option>
          {locations.map((loc) => (
            <option key={loc} value={loc}>{loc}</option>
          ))}
        </select>
        <select
          value={filterPic}
          onChange={(e) => setFilterPic(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">{t.filterPicAll}</option>
          {pics.map((pic) => (
            <option key={pic} value={pic}>{pic}</option>
          ))}
        </select>
      </div>

      {totalItems === 0 ? (
        <p className="text-sm text-slate-400 py-6 text-center">
          {events.length === 0 ? t.empty : t.noResults}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-2 pr-3 w-10">{t.colNo}</th>
                  <Th label={t.colName} sortKeyName="nama_event" />
                  <Th label={t.colDate} sortKeyName="tanggal_event" />
                  <Th label={t.colTime} sortKeyName="waktu_event" />
                  <Th label={t.colLocation} sortKeyName="lokasi_event" />
                  <Th label={t.colPic} sortKeyName="pic_event" />
                  <Th label={t.colParticipants} sortKeyName="jumlah_peserta" className="text-right" />
                  <th className="py-2 pr-3 text-center">{t.colQr}</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((ev, idx) => (
                  <tr key={ev.public_id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                    <td className="py-2.5 pr-3 text-slate-400">{(page - 1) * pageSize + idx + 1}</td>
                    <td className="py-2.5 pr-3">
                      <Link href={`/admin/event/${ev.public_id}`} className="font-medium text-slate-800 hover:text-indigo-600 transition">
                        {ev.nama_event}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-3 text-slate-600 whitespace-nowrap">
                      {new Date(ev.tanggal_event).toLocaleDateString(dateLocale)}
                    </td>
                    <td className="py-2.5 pr-3 text-slate-600 whitespace-nowrap">
                      {formatTime(ev.waktu_event) || t.noTime}
                    </td>
                    <td className="py-2.5 pr-3 text-slate-600">{ev.lokasi_event}</td>
                    <td className="py-2.5 pr-3 text-slate-600">{ev.pic_event}</td>
                    <td className="py-2.5 pr-3 text-right">
                      <span className="text-indigo-600 font-medium">{ev.jumlah_peserta}</span>
                    </td>
                    <td className="py-2 pr-3">
                      <button
                        onClick={() => setQrEvent(ev)}
                        className="block mx-auto w-10 h-10 rounded-md border border-slate-200 overflow-hidden hover:ring-2 hover:ring-indigo-300 transition"
                        title={t.colQr}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={apiUrl(`/api/events/${ev.public_id}/qrcode`)}
                          alt="QR"
                          className="w-full h-full object-cover"
                        />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>{t.rowsPerPage}</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="border border-slate-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
              <span className="hidden sm:inline">
                · {t.showingInfo.replace('{from}', from).replace('{to}', to).replace('{total}', totalItems)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                {t.prev}
              </button>
              <span className="text-xs text-slate-500 whitespace-nowrap">
                {t.pageInfo.replace('{page}', page).replace('{totalPages}', totalPages)}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                {t.next}
              </button>
            </div>
          </div>
        </>
      )}

      <QrModal
        open={!!qrEvent}
        onClose={() => setQrEvent(null)}
        qrUrl={qrEvent ? apiUrl(`/api/events/${qrEvent.public_id}/qrcode`) : ''}
        eventName={qrEvent?.nama_event}
      />
    </div>
  );
}
