import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function parseLocationInput(text) {
  if (!text) return null;
  const match = text.match(/(-?\d+\.\d+)[\s,]+(-?\d+\.\d+)/);
  if (match) {
    return { lat: match[1], lon: match[2] };
  }
  return null;
}

// GET /api/geo/search?q=... -> cari nama tempat / koordinat
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || !query.trim()) {
      return NextResponse.json({ success: true, data: [] });
    }

    const trimmed = query.trim();

    // 1. Cek apakah query adalah koordinat langsung atau URL Google Maps
    const directCoords = parseLocationInput(trimmed);
    if (directCoords) {
      return NextResponse.json({
        success: true,
        data: [
          {
            name: `Titik Koordinat: ${directCoords.lat}, ${directCoords.lon}`,
            lat: directCoords.lat,
            lon: directCoords.lon,
          },
        ],
      });
    }

    // 2. Pencarian Nama Tempat via OpenStreetMap Nominatim
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      trimmed
    )}&limit=5&addressdetails=1`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'PresensiApp/1.0 (https://u-talent.uika-bogor.ac.id)',
        'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
      },
    });

    if (!res.ok) {
      return NextResponse.json({ success: true, data: [] });
    }

    const rawData = await res.json();
    const results = (Array.isArray(rawData) ? rawData : []).map((item) => ({
      name: item.display_name,
      lat: item.lat,
      lon: item.lon,
    }));

    return NextResponse.json({ success: true, data: results });
  } catch (err) {
    console.error('Geo search error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
