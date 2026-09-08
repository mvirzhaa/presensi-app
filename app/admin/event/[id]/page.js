'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import AdminHeaderBar from '@/components/AdminHeaderBar';
import { apiUrl } from '@/lib/api';

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function EventDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { dict, lang } = useLanguage();
  const t = dict.adminDetail;

  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [presensiUrl, setPresensiUrl] = useState('');
  const [togglingLocation, setTogglingLocation] = useState(false);

  // Notulensi state
  const [notulensi, setNotulensi] = useState('');
  const [savingNotulensi, setSavingNotulensi] = useState(false);
  const [notulensiSavedStatus, setNotulensiSavedStatus] = useState(false);

  // Upload states
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [activePreviewImage, setActivePreviewImage] = useState(null);

  const docInputRef = useRef(null);
  const photoInputRef = useRef(null);

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;
    setPresensiUrl(`${baseUrl}/presensi/${id}`);
    loadAll();

    // Auto-refresh daftar peserta tiap 10 detik agar admin lihat update real-time
    const interval = setInterval(loadParticipants, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadAll() {
    setLoading(true);
    await Promise.all([loadEvent(), loadParticipants(), loadFiles()]);
    setLoading(false);
  }

  async function loadEvent() {
    const res = await fetch(apiUrl(`/api/events/${id}`));
    if (res.status === 401) {
      router.push('/admin/login');
      return;
    }
    const json = await res.json();
    if (json.success) {
      setEvent(json.data);
      setNotulensi(json.data.notulensi || '');
    }
  }

  async function loadParticipants() {
    const res = await fetch(apiUrl(`/api/events/${id}/participants`));
    if (res.status === 401) {
      router.push('/admin/login');
      return;
    }
    const json = await res.json();
    if (json.success) setParticipants(json.data);
  }

  async function loadFiles() {
    try {
      const res = await fetch(apiUrl(`/api/events/${id}/files`));
      if (res.ok) {
        const json = await res.json();
        if (json.success) setFiles(json.data);
      }
    } catch (err) {
      console.error('Error loading files:', err);
    }
  }

  async function toggleLocation() {
    if (!event) return;
    setTogglingLocation(true);
    try {
      const res = await fetch(apiUrl(`/api/events/${id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ require_location: !event.require_location }),
      });
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      const json = await res.json();
      if (json.success) setEvent(json.data);
    } finally {
      setTogglingLocation(false);
    }
  }

  async function handleSaveNotulensi() {
    setSavingNotulensi(true);
    setNotulensiSavedStatus(false);
    try {
      const res = await fetch(apiUrl(`/api/events/${id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notulensi }),
      });
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      const json = await res.json();
      if (json.success) {
        setEvent(json.data);
        setNotulensiSavedStatus(true);
        setTimeout(() => setNotulensiSavedStatus(false), 3500);
      }
    } catch {
      alert('Gagal menyimpan notulensi');
    } finally {
      setSavingNotulensi(false);
    }
  }

  async function handleFileUpload(e, fileType) {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    const isPhoto = fileType === 'photo';
    if (isPhoto) setUploadingPhotos(true);
    else setUploadingDocs(true);

    try {
      const formData = new FormData();
      formData.append('file_type', fileType);
      for (let i = 0; i < selectedFiles.length; i++) {
        formData.append('files', selectedFiles[i]);
      }

      const res = await fetch(apiUrl(`/api/events/${id}/files`), {
        method: 'POST',
        body: formData,
      });

      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }

      const json = await res.json();
      if (json.success) {
        await loadFiles();
      } else {
        alert(json.message || 'Gagal mengunggah file');
      }
    } catch {
      alert('Terjadi kesalahan saat mengunggah');
    } finally {
      if (isPhoto) {
        setUploadingPhotos(false);
        if (photoInputRef.current) photoInputRef.current.value = '';
      } else {
        setUploadingDocs(false);
        if (docInputRef.current) docInputRef.current.value = '';
      }
    }
  }

  async function handleDeleteFile(fileId) {
    if (!confirm(t.confirmDeleteFile)) return;

    try {
      const res = await fetch(apiUrl(`/api/events/${id}/files?fileId=${fileId}`), {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        await loadFiles();
      } else {
        alert(json.message || 'Gagal menghapus file');
      }
    } catch {
      alert('Terjadi kesalahan jaringan');
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(presensiUrl);
    alert(t.copied);
  }

  if (loading && !event) {
    return <main className="min-h-screen flex items-center justify-center text-slate-400">{dict.common.loading}</main>;
  }

  if (!event) {
    return <main className="min-h-screen flex items-center justify-center text-slate-400">{t.notFound}</main>;
  }

  const requireLocation = !!event.require_location;
  const documentFiles = files.filter((f) => f.file_type === 'document');
  const photoFiles = files.filter((f) => f.file_type === 'photo');


  return (
    <main className="min-h-screen bg-slate-50 py-8 sm:py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <AdminHeaderBar />

        <Link href="/admin" className="text-sm text-indigo-600 hover:underline inline-block">
          &larr; {t.back}
        </Link>

        {/* Info Event & QR Code */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-2">
            <h1 className="text-xl font-bold text-slate-800">{event.nama_event}</h1>
            <p className="text-sm text-slate-500">
              {t.dateLabel}:{' '}
              {new Date(event.tanggal_event).toLocaleDateString(lang === 'en' ? 'en-US' : 'id-ID', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
              {event.waktu_event ? ` · ${event.waktu_event.slice(0, 5)}` : ''}
            </p>
            <p className="text-sm text-slate-500">{t.locationLabel}: {event.lokasi_event}</p>
            <p className="text-sm text-slate-500">{t.picLabel}: {event.pic_event}</p>
            {event.creator_nama && (
              <p className="text-sm text-slate-500">
                {t.creatorLabel}: <span className="font-medium text-slate-700">{event.creator_nama}</span>
              </p>
            )}

            <div className="pt-4 flex items-center gap-3">
              <input
                readOnly
                value={presensiUrl}
                className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-600 bg-slate-50 font-mono"
              />
              <button
                onClick={copyLink}
                className="px-3 py-2 bg-slate-200 text-slate-700 rounded-lg text-xs hover:bg-slate-300 transition shrink-0"
              >
                {t.copy}
              </button>
            </div>

            <div className="pt-2 flex flex-wrap gap-2">
              <a
                href={apiUrl(`/api/events/${id}/export`)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 transition shadow-sm font-medium"
              >
                📥 {t.exportPdf}
              </a>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col items-center justify-center">
            <p className="text-sm text-slate-500 mb-3">{t.qrTitle}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={apiUrl(`/api/events/${id}/qrcode`)} alt="QR" className="w-48 h-48" />
            <p className="text-xs text-slate-400 mt-3 text-center">{t.qrCaption}</p>
          </div>
        </div>

        {/* Pengaturan Deteksi Lokasi */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-medium text-slate-700">{t.locationSettingTitle}</p>
              <p className={`text-xs mt-1 ${requireLocation ? 'text-emerald-600' : 'text-slate-400'}`}>
                {requireLocation ? t.locationOn : t.locationOff}
              </p>
            </div>
            <button
              onClick={toggleLocation}
              disabled={togglingLocation}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition disabled:opacity-50 ${
                requireLocation
                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {requireLocation ? t.locationToggleOff : t.locationToggleOn}
            </button>
          </div>
        </div>

        {/* Text Box Notulensi Kegiatan */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span>📝</span> {t.notulensiTitle}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">{t.notulensiSubtitle}</p>
            </div>

            <div className="flex items-center gap-2">
              {notulensiSavedStatus && (
                <span className="text-xs text-emerald-600 font-medium bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg animate-fade-in">
                  ✓ {t.notulensiSaved}
                </span>
              )}
              <button
                onClick={handleSaveNotulensi}
                disabled={savingNotulensi}
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 shadow-sm"
              >
                {savingNotulensi ? dict.userManagement.saving : t.saveNotulensi}
              </button>
            </div>
          </div>

          <textarea
            rows={7}
            value={notulensi}
            onChange={(e) => setNotulensi(e.target.value)}
            placeholder={t.notulensiPlaceholder}
            className="w-full border border-slate-300 rounded-xl p-3.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 leading-relaxed font-normal"
          />
        </div>

        {/* Multiple Upload Dokumen Kegiatan */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span>📄</span> {t.documentsTitle}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">{t.documentsSubtitle}</p>
            </div>

            <div>
              <input
                ref={docInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
                onChange={(e) => handleFileUpload(e, 'document')}
                className="hidden"
                id="document-upload-input"
              />
              <button
                onClick={() => docInputRef.current?.click()}
                disabled={uploadingDocs}
                className="px-4 py-2 bg-slate-800 text-white text-xs font-medium rounded-lg hover:bg-slate-900 transition disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
              >
                {uploadingDocs ? t.uploading : `+ ${t.uploadDocument}`}
              </button>
            </div>
          </div>

          {documentFiles.length === 0 ? (
            <div className="border border-dashed border-slate-200 rounded-xl py-8 text-center text-slate-400 text-xs">
              {t.noDocuments}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {documentFiles.map((f) => (
                <div key={f.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl">📎</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate" title={f.original_name}>
                        {f.original_name}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {formatFileSize(f.file_size)} · {new Date(f.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={apiUrl(`/api/events/${id}/files/${f.id}?download=1`)}
                      target="_blank"
                      rel="noreferrer"
                      download={f.original_name}
                      className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs rounded-lg font-medium transition"
                    >
                      {t.download}
                    </a>
                    <button
                      onClick={() => handleDeleteFile(f.id)}
                      className="px-2.5 py-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 text-xs rounded-lg font-medium transition"
                    >
                      {t.delete}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Multiple Upload Foto Dokumentasi Kegiatan */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span>📸</span> {t.photosTitle}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">{t.photosSubtitle}</p>
            </div>

            <div>
              <input
                ref={photoInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleFileUpload(e, 'photo')}
                className="hidden"
                id="photo-upload-input"
              />
              <button
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhotos}
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
              >
                {uploadingPhotos ? t.uploading : `+ ${t.uploadPhoto}`}
              </button>
            </div>
          </div>

          {photoFiles.length === 0 ? (
            <div className="border border-dashed border-slate-200 rounded-xl py-8 text-center text-slate-400 text-xs">
              {t.noPhotos}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {photoFiles.map((p) => {
                const photoUrl = apiUrl(`/api/events/${id}/files/${p.id}`);
                return (
                  <div
                    key={p.id}
                    className="group relative border border-slate-200 rounded-xl overflow-hidden bg-slate-100 aspect-video shadow-xs flex flex-col justify-end"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photoUrl}
                      alt={p.original_name}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-300 cursor-pointer"
                      onClick={() => setActivePreviewImage(photoUrl)}
                    />

                    {/* Action Overlay */}
                    <div className="relative z-10 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-2 flex items-center justify-between opacity-90 sm:opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={() => setActivePreviewImage(photoUrl)}
                        className="text-[11px] text-white bg-black/40 hover:bg-black/60 px-2 py-0.5 rounded backdrop-blur-xs"
                      >
                        🔍 Lihat
                      </button>
                      <button
                        onClick={() => handleDeleteFile(p.id)}
                        className="text-[11px] text-red-300 hover:text-red-100 bg-red-600/70 hover:bg-red-600 px-2 py-0.5 rounded backdrop-blur-xs"
                      >
                        {t.delete}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>


        {/* Modal Lightbox Foto */}
        {activePreviewImage && (
          <div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs"
            onClick={() => setActivePreviewImage(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
              <button
                onClick={() => setActivePreviewImage(null)}
                className="absolute -top-10 right-0 text-white text-sm bg-white/20 hover:bg-white/40 px-3 py-1 rounded-lg"
              >
                ✕ {dict.qrModal.close}
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activePreviewImage}
                alt="Dokumentasi"
                className="max-w-full max-h-[85vh] rounded-xl object-contain shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}

        {/* Tabel Daftar Peserta Hadir */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-700">{t.participantsTitle}</h2>
            <span className="text-sm text-indigo-600 font-medium">
              {participants.length} {t.participantsSuffix}
            </span>
          </div>

          {participants.length === 0 ? (
            <p className="text-sm text-slate-400">{t.empty}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-200">
                    <th className="py-2 pr-3">{t.colNo}</th>
                    <th className="py-2 pr-3">{t.colName}</th>
                    <th className="py-2 pr-3">{t.colInstitution}</th>
                    <th className="py-2 pr-3">{t.colPosition}</th>
                    <th className="py-2 pr-3">{t.colTime}</th>
                    <th className="py-2 pr-3">{t.colLocation}</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((p, idx) => (
                    <tr key={p.id} className="border-b border-slate-100">
                      <td className="py-2 pr-3">{idx + 1}</td>
                      <td className="py-2 pr-3 font-medium text-slate-800">{p.nama}</td>
                      <td className="py-2 pr-3">{p.asal_instansi}</td>
                      <td className="py-2 pr-3">{p.jabatan}</td>
                      <td className="py-2 pr-3">{new Date(p.presensi_at).toLocaleString()}</td>
                      <td className="py-2 pr-3">
                        {p.latitude && p.longitude ? (
                          <a
                            className="text-indigo-600 hover:underline"
                            href={`https://www.google.com/maps?q=${p.latitude},${p.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {t.viewMap}
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
