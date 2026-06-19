import './globals.css';

export const metadata = {
  title: 'Sistem Presensi Event',
  description: 'Sistem presensi kehadiran event berbasis QR Code',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
