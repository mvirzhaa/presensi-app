/** @type {import('next').NextConfig} */
const nextConfig = {
  // basePath diperlukan agar app berjalan di subpath /presensi
  // Contoh: https://u-talent.uika-bogor.ac.id/presensi
  basePath: '/presensi',
  assetPrefix: '/presensi/',
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
