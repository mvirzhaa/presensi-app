// ecosystem.config.js - Konfigurasi PM2 untuk production
// Jalankan dengan: pm2 start ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'presensi-app',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        // PORT: ubah ke nomor port yang tersedia di server Anda
        // Cek port tersedia dengan: ss -tlnp | grep LISTEN
        PORT: 3001,
      },
    },
  ],
};
