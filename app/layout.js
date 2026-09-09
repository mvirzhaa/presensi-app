import './globals.css';
import 'leaflet/dist/leaflet.css';
import { LanguageProvider } from '@/components/LanguageProvider';

export const metadata = {
  title: 'Sistem Presensi Event',
  description: 'Sistem presensi kehadiran event berbasis QR Code',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
