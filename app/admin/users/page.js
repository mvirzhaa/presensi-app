'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/LanguageProvider';
import AdminHeaderBar from '@/components/AdminHeaderBar';
import UsersTable from '@/components/users/UsersTable';
import UserModal from '@/components/users/UserModal';
import { apiUrl } from '@/lib/api';

export default function UsersManagementPage() {
  const router = useRouter();
  const { dict } = useLanguage();
  const t = dict.userManagement;

  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal control
  const [modalState, setModalState] = useState({ isOpen: false, editingUser: null });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [meRes, usersRes] = await Promise.all([
        fetch(apiUrl('/api/auth/me')),
        fetch(apiUrl('/api/users')),
      ]);

      if (meRes.status === 401 || usersRes.status === 401) {
        return router.push('/admin/login');
      }
      if (usersRes.status === 403) {
        return router.push('/admin');
      }

      const meJson = await meRes.json();
      if (meJson.success) setCurrentUser(meJson.user);

      const usersJson = await usersRes.json();
      if (usersJson.success) setUsers(usersJson.data);
      else setError(usersJson.message || 'Gagal memuat data');
    } catch {
      setError('Terjadi kesalahan koneksi');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleModalSubmit(formData) {
    const isEdit = !!modalState.editingUser;
    const url = isEdit ? `/api/users/${modalState.editingUser.id}` : '/api/users';
    const method = isEdit ? 'PATCH' : 'POST';

    const payload = isEdit
      ? {
          username: formData.username?.trim(),
          nama: formData.nama?.trim(),
          is_active: Number(formData.is_active) === 1,
          ...(formData.password && formData.password.trim() ? { password: formData.password.trim() } : {}),
        }
      : {
          nama: formData.nama?.trim(),
          username: formData.username?.trim(),
          password: formData.password,
          role: 'admin',
        };

    const res = await fetch(apiUrl(url), {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    if (!json.success) {
      throw new Error(json.message || 'Operasi gagal');
    }

    await loadData();
  }

  async function handleDeleteUser(user) {
    if (!confirm(t.confirmDelete)) return;
    try {
      const res = await fetch(apiUrl(`/api/users/${user.id}`), { method: 'DELETE' });
      const json = await res.json();
      if (json.success) await loadData();
      else alert(json.message || 'Gagal menghapus user');
    } catch {
      alert('Terjadi kesalahan koneksi');
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 py-8 sm:py-10 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <AdminHeaderBar />

        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{t.title}</h1>
            <p className="text-slate-500 text-sm mt-0.5">{t.subtitle}</p>
          </div>
          <button
            onClick={() => setModalState({ isOpen: true, editingUser: null })}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition shadow-sm"
          >
            + {t.addUser}
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          {loading ? (
            <p className="text-sm text-slate-400">{dict.common.loading}</p>
          ) : (
            <UsersTable
              users={users}
              currentUser={currentUser}
              onEdit={(user) => setModalState({ isOpen: true, editingUser: user })}
              onDelete={handleDeleteUser}
              dict={dict}
            />
          )}
        </div>

        {/* Modal Tambah / Edit Operator */}
        {modalState.isOpen && (
          <UserModal
            isOpen={modalState.isOpen}
            onClose={() => setModalState({ isOpen: false, editingUser: null })}
            onSubmit={handleModalSubmit}
            initialData={modalState.editingUser}
            currentUser={currentUser}
            dict={dict}
          />
        )}
      </div>
    </main>
  );
}
