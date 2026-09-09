/**
 * Helper & utility fungsi geografis untuk presensi
 */

/**
 * Menghitung jarak antara dua titik koordinat (dalam meter) menggunakan formula Haversine
 * @param {number|string} lat1 - Latitude titik 1
 * @param {number|string} lon1 - Longitude titik 1
 * @param {number|string} lat2 - Latitude titik 2
 * @param {number|string} lon2 - Longitude titik 2
 * @returns {number|null} Jarak dalam meter (dibulatkan) atau null jika koordinat tidak valid
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const nLat1 = Number(lat1);
  const nLon1 = Number(lon1);
  const nLat2 = Number(lat2);
  const nLon2 = Number(lon2);

  if (isNaN(nLat1) || isNaN(nLon1) || isNaN(nLat2) || isNaN(nLon2)) {
    return null;
  }

  const R = 6371e3; // Radius bumi dalam meter (~6,371 km)
  const phi1 = (nLat1 * Math.PI) / 180;
  const phi2 = (nLat2 * Math.PI) / 180;
  const deltaPhi = ((nLat2 - nLat1) * Math.PI) / 180;
  const deltaLambda = ((nLon2 - nLon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Format jarak menjadi teks ramah pengguna (contoh: "35 m" atau "1.2 km")
 * @param {number} meters 
 * @returns {string}
 */
export function formatDistance(meters) {
  if (meters == null || isNaN(meters)) return '-';
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${meters} m`;
}

/**
 * Membuat link Google Maps untuk koordinat atau query teks lokasi
 * @param {number|string} lat 
 * @param {number|string} lon 
 * @param {string} [fallbackQuery]
 * @returns {string}
 */
export function getGoogleMapsUrl(lat, lon, fallbackQuery = '') {
  const nLat = Number(lat);
  const nLon = Number(lon);
  if (!isNaN(nLat) && !isNaN(nLon) && nLat !== 0 && nLon !== 0) {
    return `https://www.google.com/maps?q=${nLat},${nLon}`;
  }
  if (fallbackQuery && fallbackQuery.trim()) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fallbackQuery.trim())}`;
  }
  return 'https://maps.google.com';
}
