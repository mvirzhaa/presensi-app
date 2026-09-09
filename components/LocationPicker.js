'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { apiUrl } from '@/lib/api';
import { getGoogleMapsUrl } from '@/lib/geo';

const InteractiveMapPicker = dynamic(
  () => import('@/components/InteractiveMapPicker'),
  {
    ssr: false,
    loading: () => (
      <div className="h-80 w-full bg-slate-100 rounded-xl animate-pulse flex flex-col items-center justify-center gap-2 text-slate-400 text-xs font-medium border border-slate-200">
        <span className="text-2xl animate-bounce">🗺️</span>
        <span>Memuat Peta Interaktif...</span>
      </div>
    ),
  }
);

export default function LocationPicker({
  latitude,
  longitude,
  radius,
  onChange,
  defaultSearchQuery = '',
}) {
  const [searchQuery, setSearchQuery] = useState(defaultSearchQuery);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState('');
  const [gettingGps, setGettingGps] = useState(false);

  // Ambil Lokasi Saat Ini (GPS)
  function handleGetCurrentLocation() {
    if (!navigator.geolocation) {
      alert('Browser Anda tidak mendukung deteksi lokasi.');
      return;
    }
    setGettingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(7);
        const lon = pos.coords.longitude.toFixed(7);
        onChange({
          target_latitude: lat,
          target_longitude: lon,
          radius_meters: radius || 50,
        });
        setGettingGps(false);
      },
      (err) => {
        alert('Gagal mendeteksi lokasi GPS: ' + err.message);
        setGettingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // Cari Nama Tempat di Maps
  async function handleSearchPlace(e) {
    if (e) e.preventDefault();
    if (!searchQuery || !searchQuery.trim()) return;

    setSearching(true);
    setSearchError('');
    setSearchResults([]);

    try {
      const res = await fetch(apiUrl(`/api/geo/search?q=${encodeURIComponent(searchQuery.trim())}`));
      const json = await res.json();
      if (json.success && json.data.length > 0) {
        setSearchResults(json.data);
      } else {
        setSearchError('Tempat tidak ditemukan. Coba ketik kata kunci yang lebih spesifik atau kota (cth: UIKA Bogor).');
      }
    } catch {
      setSearchError('Gagal mencari tempat, periksa koneksi internet.');
    } finally {
      setSearching(false);
    }
  }

  function handleSelectPlace(item) {
    const lat = Number(item.lat).toFixed(7);
    const lon = Number(item.lon).toFixed(7);
    onChange({
      target_latitude: lat,
      target_longitude: lon,
      radius_meters: radius || 50,
    });
    setSearchResults([]);
  }

  const hasCoords = latitude && longitude;
  const mapsUrl = hasCoords ? getGoogleMapsUrl(latitude, longitude) : null;

  return (
    <div className="space-y-4">
      {/* 1. Tombol Utama & Menonjol: AMBIL LOKASI SAYA SAAT INI */}
      <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 rounded-xl p-4 sm:p-5 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xl">📍</span>
            <p className="font-bold text-base sm:text-lg">Ambil Lokasi Saya Saat Ini</p>
          </div>
          <p className="text-xs sm:text-sm text-indigo-100 leading-relaxed">
            Paling direkomendasikan jika Anda saat ini sedang berada di tempat/ruangan kegiatan.
          </p>
        </div>

        <button
          type="button"
          onClick={handleGetCurrentLocation}
          disabled={gettingGps}
          className="px-5 py-3 bg-white hover:bg-indigo-50 active:bg-indigo-100 text-indigo-700 font-bold text-sm rounded-xl shadow transition shrink-0 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
        >
          {gettingGps ? (
            <>
              <span className="animate-spin">⏳</span>
              <span>Mendeteksi GPS...</span>
            </>
          ) : (
            <>
              <span>🎯</span>
              <span>Gunakan Lokasi Saya</span>
            </>
          )}
        </button>
      </div>

      {/* 2. Cari Berdasarkan Nama Tempat Sesuai Maps */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Atau Cari Nama Tempat / Alamat di Maps
          </label>
          <p className="text-xs text-slate-500 mt-0.5">
            Ketik nama tempat, gedung, atau kampus (contoh: <i>UIKA Bogor, Gedung Rektorat, Hotel Salak</i>), atau tempel link Google Maps.
          </p>
        </div>

        <form onSubmit={handleSearchPlace} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Ketik nama tempat / gedung..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
            />
          </div>
          <button
            type="submit"
            disabled={searching || !searchQuery.trim()}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold shrink-0 transition disabled:opacity-50 cursor-pointer"
          >
            {searching ? 'Mencari...' : '🔍 Cari Tempat'}
          </button>
        </form>

        {searchError && <p className="text-xs text-amber-600 font-medium">{searchError}</p>}

        {/* Hasil Pencarian Tempat */}
        {searchResults.length > 0 && (
          <div className="border border-indigo-100 rounded-xl bg-indigo-50/40 p-2 space-y-1.5 max-h-56 overflow-y-auto">
            <p className="text-[11px] font-semibold text-indigo-800 px-2 py-0.5">
              Pilih tempat yang cocok ({searchResults.length} hasil ditemukan):
            </p>
            {searchResults.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectPlace(item)}
                className="w-full text-left p-2.5 rounded-lg bg-white hover:bg-indigo-100/70 border border-slate-200/80 transition flex items-start gap-2.5 text-xs group cursor-pointer"
              >
                <span className="text-base text-indigo-600 mt-0.5">📍</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 group-hover:text-indigo-700 leading-snug">
                    {item.name}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                    Lat: {Number(item.lat).toFixed(6)}, Lon: {Number(item.lon).toFixed(6)}
                  </p>
                </div>
                <span className="text-xs font-bold text-indigo-600 shrink-0 self-center px-2 py-1 bg-indigo-50 rounded">
                  Pilih
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3. Peta Interaktif (Titikkan Langsung di Peta Seperti Google Maps) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <span>🗺️</span>
              <span>Titikkan Langsung di Peta (Interactive Map)</span>
            </label>
            <p className="text-xs text-slate-500 mt-0.5">
              Klik langsung di peta atau geser pin merah untuk memposisikan titik acara. Lingkaran biru menandakan batas toleransi radius presensi.
            </p>
          </div>
          {hasCoords && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-medium">
              ✓ Lokasi Terpasang
            </span>
          )}
        </div>

        <InteractiveMapPicker
          latitude={latitude}
          longitude={longitude}
          radius={radius}
          onLocationSelect={({ lat, lng }) => {
            onChange({
              target_latitude: lat,
              target_longitude: lng,
              radius_meters: radius || 50,
            });
          }}
        />
      </div>

      {/* 4. Pengisian Koordinat Latitude & Longitude (TETAP TERSEDIA & DAPAT DIEDIT MANUAL) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Koordinat Titik Acara (Latitude &amp; Longitude)
            </label>
            <p className="text-xs text-slate-500 mt-0.5">
              Otomatis terisi saat menitikkan peta / GPS / pencarian, dan Anda juga dapat mengetik/mengubah koordinat secara manual.
            </p>
          </div>
          {hasCoords && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold transition"
            >
              📍 Cek di Google Maps ↗
            </a>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Latitude (Lintang) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="any"
              value={latitude ?? ''}
              onChange={(e) =>
                onChange({
                  target_latitude: e.target.value,
                  target_longitude: longitude,
                  radius_meters: radius,
                })
              }
              placeholder="-6.5604180"
              required
              className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Longitude (Bujur) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="any"
              value={longitude ?? ''}
              onChange={(e) =>
                onChange({
                  target_latitude: latitude,
                  target_longitude: e.target.value,
                  radius_meters: radius,
                })
              }
              placeholder="106.7920810"
              required
              className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
            />
          </div>
        </div>
      </div>

      {/* 4. Toleransi Radius Jarak */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Toleransi Radius Jarak Presensi
            </label>
            <p className="text-xs text-slate-500 mt-0.5">
              Jarak toleransi maksimal peserta dari titik kegiatan untuk diizinkan presensi.
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {[25, 50, 100, 200].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() =>
                  onChange({
                    target_latitude: latitude,
                    target_longitude: longitude,
                    radius_meters: preset,
                  })
                }
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                  Number(radius) === preset
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {preset} m
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 max-w-xs">
          <input
            type="number"
            min="5"
            max="50000"
            value={radius ?? 50}
            onChange={(e) =>
              onChange({
                target_latitude: latitude,
                target_longitude: longitude,
                radius_meters: Number(e.target.value) || 50,
              })
            }
            required
            className="border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold w-28 text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <span className="text-sm font-medium text-slate-600">meter</span>
        </div>
      </div>
    </div>
  );
}
