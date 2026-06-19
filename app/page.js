import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold text-slate-800">Sistem Presensi Event</h1>
        <p className="text-slate-500">
          Kelola event, generate QR Code, dan pantau presensi peserta secara real-time.
        </p>
        <Link
          href="/admin"
          className="inline-block px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          Masuk ke Halaman Admin
        </Link>
      </div>
    </main>
  );
}
