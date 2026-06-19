'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useLanguage } from '@/components/LanguageProvider';

export default function AdminHeaderBar() {
  const router = useRouter();
  const { dict } = useLanguage();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/admin/login');
      router.refresh();
    }
  }

  return (
    <div className="flex items-center justify-end gap-2 mb-4">
      <LanguageSwitcher />
      <button
        onClick={handleLogout}
        disabled={loggingOut}
        className="text-xs font-medium text-slate-500 hover:text-red-600 border border-slate-200 hover:border-red-200 rounded-lg px-3 py-1.5 transition disabled:opacity-50"
      >
        {dict.adminNav.logout}
      </button>
    </div>
  );
}
