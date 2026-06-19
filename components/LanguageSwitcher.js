'use client';

import { useLanguage } from '@/components/LanguageProvider';

export default function LanguageSwitcher({ className = '' }) {
  const { lang, setLang, dict } = useLanguage();

  return (
    <div className={`inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5 text-xs ${className}`}>
      <button
        type="button"
        onClick={() => setLang('id')}
        className={`px-2.5 py-1 rounded-md font-medium transition ${
          lang === 'id' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        {dict.common.langId}
      </button>
      <button
        type="button"
        onClick={() => setLang('en')}
        className={`px-2.5 py-1 rounded-md font-medium transition ${
          lang === 'en' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        {dict.common.langEn}
      </button>
    </div>
  );
}
