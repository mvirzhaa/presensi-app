'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useLanguage } from '@/components/LanguageProvider';
import ProfileModal from '@/components/profile/ProfileModal';
import { apiUrl } from '@/lib/api';

export default function AdminHeaderBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { dict } = useLanguage();
  const t = dict.adminNav;

  const [user, setUser] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    fetch(apiUrl('/api/auth/me'))
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data?.success && data?.user) {
          setUser(data.user);
        }
      })
      .catch(() => {});
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch(apiUrl('/api/auth/logout'), { method: 'POST' });
    } finally {
      const eportalUrl = process.env.NEXT_PUBLIC_EPORTAL_URL || 'https://eportal.uika-bogor.ac.id';
      window.location.href = eportalUrl;
    }
  }

  const isEventsActive = pathname === '/admin' || pathname.startsWith('/admin/event');
  const isUsersActive = pathname.startsWith('/admin/users');

  return (
    <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
        <Link
          href="/admin"
          className={`text-xs sm:text-sm font-medium px-3 py-1.5 rounded-lg transition ${
            isEventsActive
              ? 'bg-indigo-50 text-indigo-700 font-semibold'
              : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50'
          }`}
        >
          📋 {t.eventsList}
        </Link>

        {user?.role === 'superadmin' && (
          <Link
            href="/admin/users"
            className={`text-xs sm:text-sm font-medium px-3 py-1.5 rounded-lg transition ${
              isUsersActive
                ? 'bg-indigo-50 text-indigo-700 font-semibold'
                : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50'
            }`}
          >
            👥 {t.manageUsers}
          </Link>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-3 flex-wrap ml-auto">
        {user && (
          <button
            type="button"
            onClick={() => setIsProfileOpen(true)}
            className="flex items-center gap-1.5 text-xs text-slate-700 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 rounded-lg px-2.5 py-1.5 transition cursor-pointer group shadow-xs"
            title="Klik untuk edit username & ganti password"
          >
            <span>👤</span>
            <span className="font-semibold text-slate-800 group-hover:text-indigo-600 transition truncate max-w-[110px] sm:max-w-[160px]">
              {user.nama || user.username}
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                user.role === 'superadmin'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {user.role === 'superadmin' ? t.roleSuperadmin : t.roleAdmin}
            </span>
            <span className="text-[11px] text-slate-400 group-hover:text-indigo-600 transition font-medium">
              ⚙️
            </span>
          </button>
        )}

        <LanguageSwitcher />

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="text-xs font-medium text-slate-500 hover:text-red-600 border border-slate-200 hover:border-red-200 rounded-lg px-2.5 py-1.5 transition disabled:opacity-50 cursor-pointer"
        >
          {t.logout}
        </button>
      </div>

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        currentUser={user}
        onProfileUpdated={(updatedUser) => {
          setUser(updatedUser);
        }}
        dict={dict}
      />
    </div>
  );
}
