'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import AdminHeaderBar from '@/components/AdminHeaderBar';
import EventInfoCard from '@/components/event-detail/EventInfoCard';
import LocationSettingCard from '@/components/event-detail/LocationSettingCard';
import NotulensiCard from '@/components/event-detail/NotulensiCard';
import DocumentsCard from '@/components/event-detail/DocumentsCard';
import PhotosGalleryCard from '@/components/event-detail/PhotosGalleryCard';
import ParticipantsTable from '@/components/event-detail/ParticipantsTable';
import { apiUrl } from '@/lib/api';

export default function EventDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { dict, lang } = useLanguage();

  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [presensiUrl, setPresensiUrl] = useState('');

  // Notulensi state
  const [notulensi, setNotulensi] = useState('');
  const [savingNotulensi, setSavingNotulensi] = useState(false);
  const [notulensiSavedStatus, setNotulensiSavedStatus] = useState(false);

  // Upload & toggling states
  const [togglingLocation, setTogglingLocation] = useState(false);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  const loadEvent = useCallback(async () => {
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
  }, [id, router]);

  const loadParticipants = useCallback(async () => {
    const res = await fetch(apiUrl(`/api/events/${id}/participants`));
    if (res.status === 401) {
      router.push('/admin/login');
      return;
    }
    const json = await res.json();
    if (json.success) setParticipants(json.data);
  }, [id, router]);

  const loadFiles = useCallback(async () => {
    try {
      const res = await fetch(apiUrl(`/api/events/${id}/files`));
      if (res.ok) {
        const json = await res.json();
        if (json.success) setFiles(json.data);
      }
    } catch (err) {
      console.error('Error loading files:', err);
    }
  }, [id]);

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;
    setPresensiUrl(`${baseUrl}/presensi/${id}`);

    setLoading(true);
    Promise.all([loadEvent(), loadParticipants(), loadFiles()]).finally(() => setLoading(false));

    // Auto-refresh peserta tiap 10 detik
    const interval = setInterval(loadParticipants, 10000);
    return () => clearInterval(interval);
  }, [id, loadEvent, loadParticipants, loadFiles]);

  async function handleToggleLocation() {
    if (!event) return;
    setTogglingLocation(true);
    try {
      const res = await fetch(apiUrl(`/api/events/${id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ require_location: !event.require_location }),
      });
      if (res.status === 401) return router.push('/admin/login');
      const json = await res.json();
      if (json.success) setEvent(json.data);
    } finally {
      setTogglingLocation(false);
    }
  }

  async function handleUpdateEvent(patchData) {
    if (!event) return;
    try {
      const res = await fetch(apiUrl(`/api/events/${id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchData),
      });
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      const json = await res.json();
      if (json.success) {
        setEvent(json.data);
      } else {
        alert(json.message || 'Gagal memperbarui event');
      }
      return json;
    } catch {
      alert('Terjadi kesalahan saat memperbarui event');
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
      if (res.status === 401) return router.push('/admin/login');
      const json = await res.json();
      if (json.success) {
        setEvent(json.data);
        setNotulensiSavedStatus(true);
        setTimeout(() => setNotulensiSavedStatus(false), 3000);
      }
    } catch {
      alert('Gagal menyimpan notulensi');
    } finally {
      setSavingNotulensi(false);
    }
  }

  async function handleUploadFiles(e, fileType) {
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

      if (res.status === 401) return router.push('/admin/login');
      const json = await res.json();
      if (json.success) {
        await loadFiles();
      } else {
        alert(json.message || 'Gagal mengunggah file');
      }
    } catch {
      alert('Terjadi kesalahan saat mengunggah');
    } finally {
      if (isPhoto) setUploadingPhotos(false);
      else setUploadingDocs(false);
    }
  }

  async function handleDeleteFile(fileId) {
    if (!confirm(dict.adminDetail.confirmDeleteFile)) return;
    try {
      const res = await fetch(apiUrl(`/api/events/${id}/files?fileId=${fileId}`), {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) await loadFiles();
      else alert(json.message || 'Gagal menghapus file');
    } catch {
      alert('Terjadi kesalahan jaringan');
    }
  }

  if (loading && !event) {
    return <main className="min-h-screen flex items-center justify-center text-slate-400">{dict.common.loading}</main>;
  }

  if (!event) {
    return <main className="min-h-screen flex items-center justify-center text-slate-400">{dict.adminDetail.notFound}</main>;
  }

  const documentFiles = files.filter((f) => f.file_type === 'document');
  const photoFiles = files.filter((f) => f.file_type === 'photo');

  return (
    <main className="min-h-screen bg-slate-50 py-8 sm:py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <AdminHeaderBar />

        <Link href="/admin" className="text-sm text-indigo-600 hover:underline inline-block">
          &larr; {dict.adminDetail.back}
        </Link>

        {/* 1. Info Event & QR Code */}
        <EventInfoCard
          event={event}
          presensiUrl={presensiUrl}
          dict={dict}
          lang={lang}
          id={id}
        />

        {/* 2. Pengaturan Lokasi & Geofencing */}
        <LocationSettingCard
          event={event}
          requireLocation={!!event.require_location}
          onToggle={handleToggleLocation}
          onUpdateEvent={handleUpdateEvent}
          toggling={togglingLocation}
          dict={dict}
        />

        {/* 3. Notulensi Kegiatan */}
        <NotulensiCard
          notulensi={notulensi}
          onChange={setNotulensi}
          onSave={handleSaveNotulensi}
          saving={savingNotulensi}
          saved={notulensiSavedStatus}
          dict={dict}
        />

        {/* 4. Dokumen Kegiatan */}
        <DocumentsCard
          eventId={id}
          documents={documentFiles}
          onUpload={(e) => handleUploadFiles(e, 'document')}
          onDelete={handleDeleteFile}
          uploading={uploadingDocs}
          dict={dict}
        />

        {/* 5. Foto Dokumentasi Kegiatan */}
        <PhotosGalleryCard
          eventId={id}
          photos={photoFiles}
          onUpload={(e) => handleUploadFiles(e, 'photo')}
          onDelete={handleDeleteFile}
          uploading={uploadingPhotos}
          dict={dict}
        />

        {/* 6. Daftar Peserta Hadir */}
        <ParticipantsTable
          event={event}
          participants={participants}
          dict={dict}
        />
      </div>
    </main>
  );
}
