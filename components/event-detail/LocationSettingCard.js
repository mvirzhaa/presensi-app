'use client';

import { useState } from 'react';
import { getGoogleMapsUrl } from '@/lib/geo';
import LocationPicker from '@/components/LocationPicker';

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
  const [pickerState, setPickerState] = useState({
    target_latitude: event?.target_latitude ?? '',
    target_longitude: event?.target_longitude ?? '',
    radius_meters: event?.radius_meters ?? 50,
  });
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

  async function handleSaveSettings(e) {
    if (e) e.preventDefault();
    if (!onUpdateEvent) return;
    setSaving(true);
    try {
      await onUpdateEvent({
        fix_location: true,
        require_location: true,
        target_latitude:
          pickerState.target_latitude !== '' ? Number(pickerState.target_latitude) : null,
        target_longitude:
          pickerState.target_longitude !== '' ? Number(pickerState.target_longitude) : null,
        radius_meters: Number(pickerState.radius_meters) || 50,
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

        {/* Info Ringkas Lokasi Saat Ini */}
        {!isEditing ? (
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <p className="text-slate-600">
                <span className="font-medium text-slate-700">{t.targetCoordsLabel}: </span>
                {event?.target_latitude && event?.target_longitude ? (
                  <span className="font-mono text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 font-medium">
                    {event.target_latitude}, {event.target_longitude}
                  </span>
                ) : (
                  <span className="italic text-amber-600">Belum diatur</span>
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
                className="inline-flex items-center gap-1 px-3.5 py-2 bg-white hover:bg-slate-100 text-indigo-600 border border-slate-300 rounded-lg font-medium transition shadow-sm"
              >
                📍 {t.openGoogleMaps} ↗
              </a>
              <button
                type="button"
                onClick={() => {
                  setPickerState({
                    target_latitude: event?.target_latitude ?? '',
                    target_longitude: event?.target_longitude ?? '',
                    radius_meters: event?.radius_meters ?? 50,
                  });
                  setIsEditing(true);
                }}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition shadow-sm"
              >
                ✏️ {t.editLocation}
              </button>
            </div>
          </div>
        ) : (
          /* Form Edit dengan LocationPicker */
          <div className="bg-slate-50 rounded-2xl p-5 border border-indigo-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Pengaturan Titik Lokasi Presensi
              </h3>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-xs text-slate-400 hover:text-slate-600 font-medium"
              >
                ✕ Tutup
              </button>
            </div>

            <LocationPicker
              latitude={pickerState.target_latitude}
              longitude={pickerState.target_longitude}
              radius={pickerState.radius_meters}
              defaultSearchQuery={event?.lokasi_event || ''}
              onChange={(updated) => setPickerState((prev) => ({ ...prev, ...updated }))}
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                disabled={saving}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition"
              >
                {dict.common.cancel}
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={saving || !pickerState.target_latitude || !pickerState.target_longitude}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow transition disabled:opacity-50"
              >
                {saving ? dict.adminList.submitting : dict.common.save}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
