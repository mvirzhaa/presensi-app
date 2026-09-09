'use client';

import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import SignaturePad from '@/components/SignaturePad';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useLanguage } from '@/components/LanguageProvider';
import { apiUrl } from '@/lib/api';
import { calculateDistance, formatDistance } from '@/lib/geo';

export default function PresensiPage() {
  const { id } = useParams();
  const sigRef = useRef(null);
  const { dict } = useLanguage();
  const t = dict.presensi;

  const [event, setEvent] = useState(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [form, setForm] = useState({ nama: '', asal_instansi: '', jabatan: '' });
  const [coords, setCoords] = useState(null);
  const [locStatus, setLocStatus] = useState('idle');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadEvent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadEvent() {
    try {
      const res = await fetch(apiUrl(`/api/events/${id}`));
      const json = await res.json();
      if (json.success) {
        setEvent(json.data);
        // Hanya minta izin lokasi jika event ini mewajibkannya
        if (json.data.require_location) {
          requestLocation();
        } else {
          setLocStatus('disabled');
        }
      } else {
        setError(t.notFound);
      }
    } catch {
      setError(t.errorGeneric);
    } finally {
      setLoadingEvent(false);
    }
  }

  function requestLocation() {
    if (!navigator.geolocation) {
      setLocStatus('unsupported');
      return;
    }
    setLocStatus('requesting');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setLocStatus('granted');
      },
      () => setLocStatus('denied'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  const isFixLocation = !!event?.fix_location && event?.target_latitude != null && event?.target_longitude != null;
  const radiusMeters = event?.radius_meters || 50;

  const distance =
    isFixLocation && coords
      ? calculateDistance(coords.latitude, coords.longitude, event.target_latitude, event.target_longitude)
      : null;

  const isOutsideGeofence = isFixLocation && distance !== null && distance > radiusMeters;

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (sigRef.current.isEmpty()) {
      setError(t.errorEmptySignature);
      return;
    }

    if (isFixLocation) {
      if (locStatus === 'denied' || locStatus === 'unsupported' || !coords) {
        setError(
          t.locDeniedGeofence ||
            'Izin akses lokasi (GPS) wajib diaktifkan karena kegiatan ini memberlakukan pembatasan area kehadiran.'
        );
        return;
      }
      if (isOutsideGeofence) {
        const msg = (
          t.geofenceInvalid ||
          'Anda berada di luar area presensi (jarak: {dist}, maksimal: {radius} m)'
        )
          .replace('{dist}', formatDistance(distance))
          .replace('{radius}', radiusMeters);
        setError(msg);
        return;
      }
    }

    setSubmitting(true);
    try {
      const signature = sigRef.current.toDataURL();
      const res = await fetch(apiUrl(`/api/events/${id}/participants`), {
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
        setError(json.message || t.errorGeneric);
        return;
      }
      setSuccess(true);
    } catch {
      setError(t.errorGeneric);
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingEvent) {
    return (
      <main className="min-h-[100dvh] flex items-center justify-center text-slate-400 text-sm">
        {dict.common.loading}
      </main>
    );
  }

  if (!event) {
    return (
      <main className="min-h-[100dvh] flex items-center justify-center text-slate-400 text-center px-6 text-sm">
        {t.notFound}
      </main>
    );
  }

  if (success) {
    return (
      <main className="min-h-[100dvh] flex items-center justify-center bg-slate-50 px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center max-w-sm w-full">
          <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-emerald-600 mb-2">{t.successTitle}</h1>
          <p className="text-sm text-slate-500">
            {t.successText.replace('{event}', event.nama_event)}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-slate-50 flex flex-col">
      <div className="flex-1 px-4 py-6 sm:py-10">
        <div className="max-w-md mx-auto space-y-5">
          <div className="flex justify-end">
            <LanguageSwitcher />
          </div>

          <div className="text-center px-2">
            <h1 className="text-lg sm:text-xl font-bold text-slate-800 leading-snug">{event.nama_event}</h1>
            <p className="text-sm text-slate-500 mt-1">
              {event.lokasi_event} · {new Date(event.tanggal_event).toLocaleDateString()}
            </p>
            <p className="text-xs text-slate-400 mt-1">{t.formTitle}</p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6 space-y-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-600">{t.nameLabel}</label>
              <input
                name="nama"
                value={form.nama}
                onChange={handleChange}
                required
                autoComplete="name"
                className="border border-slate-300 rounded-lg px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-600">{t.institutionLabel}</label>
              <input
                name="asal_instansi"
                value={form.asal_instansi}
                onChange={handleChange}
                required
                className="border border-slate-300 rounded-lg px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-600">{t.positionLabel}</label>
              <textarea
                name="jabatan"
                value={form.jabatan}
                onChange={handleChange}
                required
                rows={3}
                className="border border-slate-300 rounded-lg px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-sm text-slate-600">{t.signatureLabel}</label>
                <button
                  type="button"
                  onClick={() => sigRef.current.clear()}
                  className="text-xs text-indigo-600 hover:underline px-2 py-1 -mr-2"
                >
                  {t.clearSignature}
                </button>
              </div>
              <SignaturePad ref={sigRef} />
            </div>

            {/* Status Geofencing / Deteksi Lokasi */}
            {isFixLocation ? (
              <div className="rounded-xl border p-3.5 text-xs space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-700">Verifikasi Lokasi Kehadiran</span>
                  <button
                    type="button"
                    onClick={requestLocation}
                    className="text-indigo-600 hover:underline font-medium"
                  >
                    🔄 Perbarui GPS
                  </button>
                </div>

                {locStatus === 'requesting' && (
                  <p className="text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-200">
                    ⏳ {t.locRequesting}
                  </p>
                )}

                {locStatus === 'denied' && (
                  <div className="bg-red-50 text-red-700 p-2.5 rounded-lg border border-red-200 space-y-1">
                    <p className="font-semibold">⚠️ Izin Lokasi Ditolak</p>
                    <p>{t.locDeniedGeofence}</p>
                    <p className="text-[11px] text-red-600">
                      Buka pengaturan browser Anda, aktifkan izin lokasi untuk situs ini, lalu klik tombol Perbarui GPS di atas.
                    </p>
                  </div>
                )}

                {coords && distance !== null && (
                  <div>
                    {isOutsideGeofence ? (
                      <div className="bg-red-50 text-red-700 p-2.5 rounded-lg border border-red-200 space-y-1">
                        <p className="font-semibold">⚠️ Anda Berada di Luar Area Acara</p>
                        <p>
                          Jarak Anda saat ini: <span className="font-bold">{formatDistance(distance)}</span> (toleransi maksimal: <span className="font-bold">{radiusMeters} m</span>).
                        </p>
                        <p className="text-[11px] text-red-600">
                          Presensi hanya dapat dikirim jika Anda berada di area lokasi kegiatan.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-emerald-50 text-emerald-700 p-2.5 rounded-lg border border-emerald-200">
                        <p className="font-semibold">✓ Lokasi Terverifikasi di Area Acara</p>
                        <p className="text-[11px] mt-0.5">
                          Jarak Anda: {formatDistance(distance)} (dalam batas radius {radiusMeters} m).
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              locStatus !== 'idle' && (
                <p className="text-xs text-slate-400">
                  {locStatus === 'requesting' && t.locRequesting}
                  {locStatus === 'granted' && t.locGranted}
                  {locStatus === 'denied' && t.locDenied}
                  {locStatus === 'unsupported' && t.locUnsupported}
                  {locStatus === 'disabled' && t.locDisabled}
                </p>
              )
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={
                submitting ||
                (isFixLocation && (isOutsideGeofence || !coords || locStatus === 'denied' || locStatus === 'requesting'))
              }
              className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg text-base sm:text-sm font-medium hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {submitting ? t.submitting : t.submit}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
