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
        // Port 3001 dikonfirmasi tersedia di VPS (3003 sudah dipakai app lain)
        PORT: 3001,
      },
    },
  ],
};
