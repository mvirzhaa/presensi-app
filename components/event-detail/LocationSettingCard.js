'use client';

import { useState } from 'react';
import { getGoogleMapsUrl } from '@/lib/geo';

export default function LocationSettingCard({
  event,
  requireLocation,
  onToggle,
  toggling,
  onUpdateEvent,
  dict,
}) {
  const t = dict.adminDetail;
  const isFixed = !!event?.fix_location;

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    target_latitude: event?.target_latitude ?? '',
    target_longitude: event?.target_longitude ?? '',
    radius_meters: event?.radius_meters ?? 50,
  });
  const [gettingGps, setGettingGps] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleToggleFixLocation() {
    if (!onUpdateEvent) return;
    setSaving(true);
    try {
      const nextFix = !isFixed;
      await onUpdateEvent({
        fix_location: nextFix,
        require_location: nextFix ? true : requireLocation,
      });
    } finally {
      setSaving(false);
    }
  }

  function handleGetCurrentLocation() {
    if (!navigator.geolocation) {
      alert('Browser tidak mendukung akses lokasi');
      return;
    }
    setGettingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((prev) => ({
          ...prev,
          target_latitude: pos.coords.latitude.toFixed(7),
          target_longitude: pos.coords.longitude.toFixed(7),
        }));
        setGettingGps(false);
      },
      (err) => {
        alert('Gagal mendeteksi lokasi GPS: ' + err.message);
        setGettingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleSaveSettings(e) {
    e.preventDefault();
    if (!onUpdateEvent) return;
    setSaving(true);
    try {
      await onUpdateEvent({
        fix_location: true,
        require_location: true,
        target_latitude: form.target_latitude !== '' ? Number(form.target_latitude) : null,
        target_longitude: form.target_longitude !== '' ? Number(form.target_longitude) : null,
        radius_meters: Number(form.radius_meters) || 50,
      });
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  }

  const mapsUrl = getGoogleMapsUrl(event?.target_latitude, event?.target_longitude, event?.lokasi_event);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
      {/* 1. Toggle Deteksi Lokasi Peserta */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-5 border-b border-slate-100">
        <div>
          <p className="text-sm font-semibold text-slate-800">{t.locationSettingTitle}</p>
          <p className={`text-xs mt-1 ${requireLocation ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
            {requireLocation ? t.locationOn : t.locationOff}
          </p>
        </div>
        <button
          onClick={onToggle}
          disabled={toggling || saving}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition disabled:opacity-50 ${
            requireLocation
              ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          {requireLocation ? t.locationToggleOff : t.locationToggleOn}
        </button>
      </div>

      {/* 2. Pengaturan Fix Lokasi (Geofencing Dinamis) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-slate-800">{t.geofenceTitle}</p>
              {isFixed && (
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[11px] font-semibold">
                  Aktif
                </span>
              )}
            </div>
            <p className="text-xs mt-1 text-slate-500">
              {isFixed
                ? t.geofenceActive.replace('{radius}', event?.radius_meters || 50)
                : t.geofenceInactive}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleFixLocation}
              disabled={saving || toggling}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition disabled:opacity-50 ${
                isFixed
                  ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              {isFixed ? t.geofenceToggleOff : t.geofenceToggleOn}
            </button>
          </div>
        </div>

        {/* Informasi Koordinat & Radius saat Geofence Aktif atau Dikonfigurasi */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="space-y-1">
              <p className="text-slate-600">
                <span className="font-medium text-slate-700">{t.targetCoordsLabel}: </span>
                {event?.target_latitude && event?.target_longitude ? (
                  <span className="font-mono text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {event.target_latitude}, {event.target_longitude}
                  </span>
                ) : (
                  <span className="italic text-amber-600">Belum diset (akan presensi di mana saja)</span>
                )}
              </p>
              <p className="text-slate-600">
                <span className="font-medium text-slate-700">{t.radiusToleranceLabel}: </span>
                <span className="font-semibold text-slate-800">{event?.radius_meters || 50} meter</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-100 text-indigo-600 border border-slate-300 rounded-lg font-medium transition"
              >
                📍 {t.openGoogleMaps} ↗
              </a>
              <button
                type="button"
                onClick={() => {
                  setForm({
                    target_latitude: event?.target_latitude ?? '',
                    target_longitude: event?.target_longitude ?? '',
                    radius_meters: event?.radius_meters ?? 50,
                  });
                  setIsEditing(!isEditing);
                }}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition"
              >
                ✏️ {t.editLocation}
              </button>
            </div>
          </div>

          {/* Form Modal/Inline untuk Edit Koordinat & Radius */}
          {isEditing && (
            <form onSubmit={handleSaveSettings} className="pt-3 border-t border-slate-200 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-700">Form Pengaturan Titik Lokasi</span>
                <button
                  type="button"
                  onClick={handleGetCurrentLocation}
                  disabled={gettingGps}
                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-xs font-medium transition disabled:opacity-50"
                >
                  📍 {gettingGps ? dict.adminList.gettingLocation : dict.adminList.getMyLocation}
                </button>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={form.target_latitude}
                    onChange={(e) => setForm({ ...form, target_latitude: e.target.value })}
                    required
                    placeholder="-6.5612345"
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={form.target_longitude}
                    onChange={(e) => setForm({ ...form, target_longitude: e.target.value })}
                    required
                    placeholder="106.7812345"
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Toleransi Radius (Meter)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="50000"
                    value={form.radius_meters}
                    onChange={(e) => setForm({ ...form, radius_meters: e.target.value })}
                    required
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-lg text-xs font-medium"
                >
                  {dict.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-xs font-medium disabled:opacity-50"
                >
                  {saving ? dict.adminList.submitting : dict.common.save}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
