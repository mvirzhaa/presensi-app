'use client';

import { useState, useRef } from 'react';
import { apiUrl } from '@/lib/api';

export default function PhotosGalleryCard({ eventId, photos, onUpload, onDelete, uploading, dict }) {
  const t = dict.adminDetail;
  const photoInputRef = useRef(null);
  const [activePreviewImage, setActivePreviewImage] = useState(null);

  return (
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
            onChange={(e) => {
              onUpload(e);
              if (photoInputRef.current) photoInputRef.current.value = '';
            }}
            className="hidden"
            id="photo-upload-input"
          />
          <button
            onClick={() => photoInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
          >
            {uploading ? t.uploading : `+ ${t.uploadPhoto}`}
          </button>
        </div>
      </div>

      {photos.length === 0 ? (
        <div className="border border-dashed border-slate-200 rounded-xl py-8 text-center text-slate-400 text-xs">
          {t.noPhotos}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {photos.map((p) => {
            const photoUrl = apiUrl(`/api/events/${eventId}/files/${p.id}`);
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
                    onClick={() => onDelete(p.id)}
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

      {/* Lightbox Modal */}
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
    </div>
  );
}
