'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';

export default function InteractiveMapPicker({
  latitude,
  longitude,
  radius = 50,
  onLocationSelect,
  height = '320px',
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);

  const numLat = latitude ? parseFloat(latitude) : null;
  const numLng = longitude ? parseFloat(longitude) : null;
  const hasValidCoords = !isNaN(numLat) && !isNaN(numLng) && numLat !== null && numLng !== null;

  // Inisialisasi Peta
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // sudah dibuat

    // Center awal: jika belum ada koordinat, default ke area Jawa Barat / Jabodetabek (Bogor -6.5971, 106.8060)
    const initialCenter = hasValidCoords ? [numLat, numLng] : [-6.5971, 106.8060];
    const initialZoom = hasValidCoords ? 17 : 13;

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      zoomControl: true,
      attributionControl: false,
    });

    // Tile Layer OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    // Attribution kecil di pojok kanan bawah
    L.control.attribution({ position: 'bottomright', prefix: false })
      .addAttribution('&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>')
      .addTo(map);

    // Event Klik pada Peta untuk Menitikan Lokasi
    map.on('click', (e) => {
      const clickedLat = e.latlng.lat.toFixed(7);
      const clickedLng = e.latlng.lng.toFixed(7);
      if (onLocationSelect) {
        onLocationSelect({ lat: clickedLat, lng: clickedLng });
      }
    });

    mapInstanceRef.current = map;

    // Pastikan ukuran peta terhitung tepat setelah render
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Marker & Circle saat koordinat atau radius berubah
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Buat Custom Pin Icon agar tampil modern & tidak bergantung pada asset internal leaflet
    const customPinIcon = L.divIcon({
      className: 'bg-transparent border-0',
      html: `
        <div style="position: relative; transform: translate(-50%, -100%); cursor: grab;">
          <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            width: 38px;
            height: 38px;
            background: #ef4444;
            color: white;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 3px solid white;
            box-shadow: 0 4px 10px rgba(0,0,0,0.35);
          ">
            <div style="
              width: 14px;
              height: 14px;
              background: white;
              border-radius: 50%;
              transform: rotate(45deg);
            "></div>
          </div>
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 38],
      popupAnchor: [0, -38],
    });

    if (hasValidCoords) {
      const pos = [numLat, numLng];

      // Update / Buat Marker
      if (!markerRef.current) {
        const marker = L.marker(pos, {
          icon: customPinIcon,
          draggable: true,
          autoPan: true,
        }).addTo(map);

        marker.bindPopup(
          '<div style="font-family: sans-serif; font-size: 12px; font-weight: 600; color: #1e293b; text-align: center;">' +
          '📍 Titik Lokasi Presensi<br/>' +
          '<span style="font-size: 11px; font-weight: 400; color: #64748b;">(Geser pin ini untuk ubah posisi)</span>' +
          '</div>'
        );

        marker.on('dragend', (e) => {
          const draggedLatLng = e.target.getLatLng();
          if (onLocationSelect) {
            onLocationSelect({
              lat: draggedLatLng.lat.toFixed(7),
              lng: draggedLatLng.lng.toFixed(7),
            });
          }
        });

        markerRef.current = marker;
      } else {
        markerRef.current.setLatLng(pos);
      }

      // Update / Buat Radius Circle
      const rMeters = Number(radius) || 50;
      if (!circleRef.current) {
        const circle = L.circle(pos, {
          radius: rMeters,
          color: '#4f46e5',
          fillColor: '#6366f1',
          fillOpacity: 0.18,
          weight: 2,
          dashArray: '4, 4',
        }).addTo(map);

        circle.bindTooltip(`Radius: ${rMeters} m`, {
          permanent: false,
          direction: 'top',
          className: 'text-xs font-semibold text-indigo-900',
        });

        circleRef.current = circle;
      } else {
        circleRef.current.setLatLng(pos);
        circleRef.current.setRadius(rMeters);
        circleRef.current.setTooltipContent(`Radius: ${rMeters} m`);
      }

      // Selalu pusatkan peta ke titik terbaru jika jaraknya jauh
      map.panTo(pos, { animate: true, duration: 0.5 });
    } else {
      // Hapus marker & circle jika koordinat kosong
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      if (circleRef.current) {
        circleRef.current.remove();
        circleRef.current = null;
      }
    }
  }, [numLat, numLng, radius, hasValidCoords, onLocationSelect]);

  function handleRecenter() {
    if (mapInstanceRef.current && hasValidCoords) {
      mapInstanceRef.current.setView([numLat, numLng], 17, { animate: true });
    }
  }

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-slate-300 shadow-inner group">
      {/* Kontainer Peta Leaflet */}
      <div ref={mapContainerRef} style={{ height }} className="w-full z-0 bg-slate-100" />

      {/* Petunjuk Interaktif di Atas Peta */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-[1000] pointer-events-none flex items-center justify-between gap-2">
        <div className="bg-slate-900/85 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-xs shadow-md font-medium flex items-center gap-1.5 pointer-events-auto">
          <span>👆</span>
          <span>Klik di mana saja pada peta atau geser pin merah untuk menitikan lokasi</span>
        </div>

        {hasValidCoords && (
          <button
            type="button"
            onClick={handleRecenter}
            className="bg-white/95 hover:bg-white text-slate-800 border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-bold shadow-md transition pointer-events-auto flex items-center gap-1 cursor-pointer shrink-0"
            title="Pusatkan kembali ke titik pin"
          >
            <span>🎯</span>
            <span className="hidden sm:inline">Pusatkan</span>
          </button>
        )}
      </div>

      {/* Info Status di Pojok Kiri Bawah Peta */}
      <div className="absolute bottom-2.5 left-2.5 z-[1000] pointer-events-none">
        {hasValidCoords ? (
          <div className="bg-white/95 backdrop-blur-sm border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg text-[11px] font-mono shadow-sm">
            Titik: {numLat.toFixed(6)}, {numLng.toFixed(6)} • R: {radius || 50}m
          </div>
        ) : (
          <div className="bg-amber-500/90 text-white px-2.5 py-1 rounded-lg text-[11px] shadow-sm font-medium">
            ⚠️ Belum ada pin dititikan di peta
          </div>
        )}
      </div>
    </div>
  );
}
