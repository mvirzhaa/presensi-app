'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/components/LanguageProvider';

export default function QrModal({ open, onClose, qrUrl, eventName }) {
  const { dict } = useLanguage();
  const t = dict.qrModal;

  const [status, setStatus] = useState('idle'); // idle | copying | copied | failed

  useEffect(() => {
    if (!open) return;
    setStatus('idle');

    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleCopy() {
    setStatus('copying');
    try {
      const res = await fetch(qrUrl);
      const blob = await res.blob();

      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([new window.ClipboardItem({ [blob.type]: blob })]);
        setStatus('copied');
      } else {
        throw new Error('Clipboard image API tidak didukung');
      }
    } catch (err) {
      console.error(err);
      setStatus('failed');
    } finally {
      setTimeout(() => setStatus('idle'), 3000);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-lg w-full max-w-xs p-6 text-center relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label={t.close}
          className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 transition"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <p className="text-sm font-semibold text-slate-700 mb-1">{t.title}</p>
        {eventName && <p className="text-xs text-slate-400 mb-3 truncate">{eventName}</p>}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrUrl} alt="QR Code" className="w-56 h-56 mx-auto rounded-lg border border-slate-200" />

        <p className="text-xs text-slate-400 mt-3">{t.caption}</p>

        <div className="flex gap-2 mt-5">
          <button
            onClick={handleCopy}
            disabled={status === 'copying'}
            className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {t.copyImage}
          </button>
          <a
            href={qrUrl}
            download={`qrcode-${(eventName || 'event').replace(/[^a-zA-Z0-9]+/g, '_')}.png`}
            className="flex-1 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-200 transition text-center"
          >
            {t.download}
          </a>
        </div>

        {status === 'copied' && <p className="text-xs text-emerald-600 mt-3">{t.copied}</p>}
        {status === 'failed' && <p className="text-xs text-red-500 mt-3">{t.copyFailed}</p>}
      </div>
    </div>
  );
}
