'use client';

import { useRef } from 'react';
import { apiUrl } from '@/lib/api';
import { formatFileSize } from '@/lib/formatters';

export default function DocumentsCard({ eventId, documents, onUpload, onDelete, uploading, dict }) {
  const t = dict.adminDetail;
  const docInputRef = useRef(null);

  return (
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
            onChange={(e) => {
              onUpload(e);
              if (docInputRef.current) docInputRef.current.value = '';
            }}
            className="hidden"
            id="document-upload-input"
          />
          <button
            onClick={() => docInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 bg-slate-800 text-white text-xs font-medium rounded-lg hover:bg-slate-900 transition disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
          >
            {uploading ? t.uploading : `+ ${t.uploadDocument}`}
          </button>
        </div>
      </div>

      {documents.length === 0 ? (
        <div className="border border-dashed border-slate-200 rounded-xl py-8 text-center text-slate-400 text-xs">
          {t.noDocuments}
        </div>
      ) : (
        <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
          {documents.map((f) => (
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
                  href={apiUrl(`/api/events/${eventId}/files/${f.id}?download=1`)}
                  target="_blank"
                  rel="noreferrer"
                  download={f.original_name}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs rounded-lg font-medium transition"
                >
                  {t.download}
                </a>
                <button
                  onClick={() => onDelete(f.id)}
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
  );
}
