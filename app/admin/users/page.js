'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/LanguageProvider';
import AdminHeaderBar from '@/components/AdminHeaderBar';
import { apiUrl } from '@/lib/api';

export default function UsersManagementPage() {
  const router = useRouter();
  const { dict } = useLanguage();
  const t = dict.userManagement;
  const common = dict.common;

  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Forms
  const [addForm, setAddForm] = useState({
    nama: '',
    username: '',
    password: '',
    role: 'admin',
  });

  const [editForm, setEditForm] = useState({
    id: null,
    nama: '',
    username: '',
    password: '',
    role: 'admin',
    is_active: 1,
  });

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [meRes, usersRes] = await Promise.all([
        fetch(apiUrl('/api/auth/me')),
        fetch(apiUrl('/api/users')),
      ]);

      if (meRes.status === 401 || usersRes.status === 401) {
        router.push('/admin/login');
        return;
      }

      if (usersRes.status === 403) {
        router.push('/admin');
        return;
      }

      const meJson = await meRes.json();
      if (meJson.success) setCurrentUser(meJson.user);

      const usersJson = await usersRes.json();
      if (usersJson.success) setUsers(usersJson.data);
      else setError(usersJson.message || 'Gagal memuat data');
    } catch {
      setError('Terjadi kesalahan jaringan');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddSubmit(e) {
    e.preventDefault();
    setModalSubmitting(true);
    setModalError('');

    try {
      const res = await fetch(apiUrl('/api/users'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      });
      const json = await res.json();
      if (!json.success) {
        setModalError(json.message || 'Gagal menambahkan user');
        return;
      }

      setIsAddOpen(false);
      setAddForm({ nama: '', username: '', password: '', role: 'admin' });
      await loadData();
    } catch {
      setModalError('Terjadi kesalahan koneksi');
    } finally {
      setModalSubmitting(false);
    }
  }

  function openEdit(user) {
    setEditForm({
      id: user.id,
      nama: user.nama,
      username: user.username,
      password: '',
      role: user.role,
      is_active: user.is_active ? 1 : 0,
    });
    setModalError('');
    setIsEditOpen(true);
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    setModalSubmitting(true);
    setModalError('');

    try {
      const payload = {
        nama: editForm.nama,
        role: editForm.role,
        is_active: Number(editForm.is_active) === 1,
      };
      if (editForm.password.trim()) {
        payload.password = editForm.password.trim();
      }

      const res = await fetch(apiUrl(`/api/users/${editForm.id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) {
        setModalError(json.message || 'Gagal mengupdate user');
        return;
      }

      setIsEditOpen(false);
      await loadData();
    } catch {
      setModalError('Terjadi kesalahan koneksi');
    } finally {
      setModalSubmitting(false);
    }
  }

  async function handleDelete(user) {
    if (!confirm(t.confirmDelete)) return;
    try {
      const res = await fetch(apiUrl(`/api/users/${user.id}`), { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) {
        alert(json.message || 'Gagal menghapus user');
        return;
      }
      await loadData();
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
            onClick={() => {
              setModalError('');
              setIsAddOpen(true);
            }}
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
            <p className="text-sm text-slate-400">{common.loading}</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-slate-400">{t.empty}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-200">
                    <th className="py-2.5 pr-3">{t.colNo}</th>
                    <th className="py-2.5 pr-3">{t.colName}</th>
                    <th className="py-2.5 pr-3">{t.colUsername}</th>
                    <th className="py-2.5 pr-3">{t.colRole}</th>
                    <th className="py-2.5 pr-3">{t.colStatus}</th>
                    <th className="py-2.5 pr-3">{t.colTotalEvents}</th>
                    <th className="py-2.5 text-right">{t.colActions}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, idx) => {
                    const isSelf = currentUser?.id === u.id;
                    return (
                      <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                        <td className="py-3 pr-3 text-slate-400">{idx + 1}</td>
                        <td className="py-3 pr-3 font-medium text-slate-800">
                          {u.nama}
                          {isSelf && (
                            <span className="ml-2 text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                              Anda
                            </span>
                          )}
                        </td>
                        <td className="py-3 pr-3 text-slate-600 font-mono text-xs">{u.username}</td>
                        <td className="py-3 pr-3">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              u.role === 'superadmin'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {u.role === 'superadmin' ? dict.adminNav.roleSuperadmin : dict.adminNav.roleAdmin}
                          </span>
                        </td>
                        <td className="py-3 pr-3">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              u.is_active
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {u.is_active ? t.active : t.inactive}
                          </span>
                        </td>
                        <td className="py-3 pr-3 text-slate-600">{u.total_events || 0}</td>
                        <td className="py-3 text-right space-x-2">
                          <button
                            onClick={() => openEdit(u)}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 rounded hover:bg-indigo-50 transition"
                          >
                            {t.edit}
                          </button>
                          {!isSelf && (
                            <button
                              onClick={() => handleDelete(u)}
                              className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition"
                            >
                              {t.delete}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Tambah User */}
        {isAddOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
              <h2 className="text-lg font-bold text-slate-800">{t.modalAddTitle}</h2>

              {modalError && (
                <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                  {modalError}
                </div>
              )}

              <form onSubmit={handleAddSubmit} className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">{t.nameLabel}</label>
                  <input
                    required
                    value={addForm.nama}
                    onChange={(e) => setAddForm({ ...addForm, nama: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="Contoh: Panitia Seminar / Humas"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">{t.usernameLabel}</label>
                  <input
                    required
                    value={addForm.username}
                    onChange={(e) => setAddForm({ ...addForm, username: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="Contoh: panitia_ti"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">{t.passwordLabel}</label>
                  <input
                    type="password"
                    required
                    value={addForm.password}
                    onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder={t.passwordPlaceholderNew}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">{t.roleLabel}</label>
                  <div className="w-full border border-slate-200 bg-slate-50 rounded-lg px-3 py-2 text-sm text-slate-700 flex items-center justify-between">
                    <span>{t.roleAdmin}</span>
                    <span className="text-[10px] bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">
                      Operator
                    </span>
                  </div>
                </div>


                <div className="pt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddOpen(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={modalSubmitting}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition disabled:opacity-50"
                  >
                    {modalSubmitting ? t.saving : t.save}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Edit User */}
        {isEditOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
              <h2 className="text-lg font-bold text-slate-800">{t.modalEditTitle}</h2>

              {modalError && (
                <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                  {modalError}
                </div>
              )}

              <form onSubmit={handleEditSubmit} className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">{t.usernameLabel}</label>
                  <input
                    disabled
                    value={editForm.username}
                    className="w-full border border-slate-200 bg-slate-50 text-slate-500 rounded-lg px-3 py-2 text-sm cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">{t.nameLabel}</label>
                  <input
                    required
                    value={editForm.nama}
                    onChange={(e) => setEditForm({ ...editForm, nama: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">{t.passwordLabel}</label>
                  <input
                    type="password"
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder={t.passwordPlaceholderEdit}
                  />
                  <p className="text-[11px] text-slate-400 mt-1">{t.passwordPlaceholderEdit}</p>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">{t.roleLabel}</label>
                  <div className="w-full border border-slate-200 bg-slate-50 rounded-lg px-3 py-2 text-sm text-slate-700 flex items-center justify-between">
                    <span>{editForm.role === 'superadmin' ? dict.adminNav.roleSuperadmin : t.roleAdmin}</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        editForm.role === 'superadmin'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {editForm.role === 'superadmin' ? 'Super Admin' : 'Operator'}
                    </span>
                  </div>
                </div>


                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">{t.statusLabel}</label>
                  <select
                    value={editForm.is_active}
                    disabled={currentUser?.id === editForm.id}
                    onChange={(e) => setEditForm({ ...editForm, is_active: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white disabled:bg-slate-50"
                  >
                    <option value={1}>{t.active}</option>
                    <option value={0}>{t.inactive}</option>
                  </select>
                </div>

                <div className="pt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditOpen(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={modalSubmitting}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition disabled:opacity-50"
                  >
                    {modalSubmitting ? t.saving : t.save}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
