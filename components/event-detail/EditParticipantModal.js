'use client';

import { useState, useEffect } from 'react';

export default function EditParticipantModal({
  isOpen,
  onClose,
  participant,
  onSave,
  dict,
}) {
  const t = dict?.adminDetail || {};
  const [nama, setNama] = useState('');
  const [asalInstansi, setAsalInstansi] = useState('');
  const [jabatan, setJabatan] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && participant) {
      setNama(participant.nama || '');
      setAsalInstansi(participant.asal_instansi || '');
      setJabatan(participant.jabatan || '');
      setError('');
    }
  }, [isOpen, participant]);

  if (!isOpen || !participant) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!nama.trim() || !asalInstansi.trim() || !jabatan.trim()) {
      setError('Semua field wajib diisi');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await onSave({
        participantId: participant.id,
        nama: nama.trim(),
        asal_instansi: asalInstansi.trim(),
        jabatan: jabatan.trim(),
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Gagal menyimpan perubahan peserta');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-800">
            ✏️ {t.modalEditParticipantTitle || 'Edit Data Peserta'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg leading-none p-1 rounded-md hover:bg-slate-100 transition"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              {t.colName || 'Nama Peserta'} <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              {t.colInstitution || 'Instansi / Asal'} <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={asalInstansi}
              onChange={(e) => setAsalInstansi(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              {t.colPosition || 'Jabatan / Kesan'} <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={jabatan}
              onChange={(e) => setJabatan(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              {dict?.common?.cancel || 'Batal'}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 text-xs bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {submitting ? (dict?.common?.loading || 'Menyimpan...') : (dict?.common?.save || 'Simpan')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
