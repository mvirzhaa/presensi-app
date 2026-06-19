'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { translations, defaultLanguage, supportedLanguages } from '@/lib/i18n';

const LanguageContext = createContext(null);

const STORAGE_KEY = 'presensi_lang';

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(defaultLanguage);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved && supportedLanguages.includes(saved)) {
        setLangState(saved);
      } else {
        const browserLang = (navigator.language || '').toLowerCase().startsWith('en') ? 'en' : 'id';
        setLangState(browserLang);
      }
    } catch {
      // localStorage tidak tersedia (mis. mode privat) -> gunakan default
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setLang(next) {
    if (!supportedLanguages.includes(next)) return;
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // abaikan jika localStorage tidak tersedia
    }
  }

  const value = { lang, setLang, dict: translations[lang] };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage harus dipakai di dalam <LanguageProvider>');
  }
  return ctx;
}
