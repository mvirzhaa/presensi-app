// Menghasilkan ID publik acak (32 karakter heksadesimal / 128-bit) untuk
// dipakai di URL (link presensi, QR Code, halaman admin) menggantikan ID
// auto-increment dari database. Tujuannya supaya ID di URL tidak bisa
// ditebak/diutak-atik (mis. dari /event/1 diubah jadi /event/2 untuk
// mengintip event lain), karena ID publik ini acak & tidak berurutan.
//
// Memakai Web Crypto API bawaan (crypto.getRandomValues) yang tersedia
// secara global di Node.js modern maupun Edge Runtime, tanpa dependensi
// tambahan.
export function generatePublicId() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
