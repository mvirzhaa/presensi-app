'use client';

import Link from 'next/link';
import { useLanguage } from '@/components/LanguageProvider';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function Home() {
  const { dict } = useLanguage();
  const t = dict.home;

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4 relative">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="text-center space-y-4 max-w-sm">
        <h1 className="text-2xl font-bold text-slate-800">{t.title}</h1>
        <p className="text-slate-500">{t.subtitle}</p>
        <Link
          href="/admin"
          className="inline-block px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          {t.cta}
        </Link>
      </div>
    </main>
  );
}
