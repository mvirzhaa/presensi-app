'use client';

export default function NotulensiCard({ notulensi, onChange, onSave, saving, saved, dict }) {
  const t = dict.adminDetail;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span>📝</span> {t.notulensiTitle}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">{t.notulensiSubtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          {saved && (
            <span className="text-xs text-emerald-600 font-medium bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
              ✓ {t.notulensiSaved}
            </span>
          )}
          <button
            onClick={onSave}
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 shadow-sm"
          >
            {saving ? dict.userManagement.saving : t.saveNotulensi}
          </button>
        </div>
      </div>

      <textarea
        rows={7}
        value={notulensi}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t.notulensiPlaceholder}
        className="w-full border border-slate-300 rounded-xl p-3.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 leading-relaxed font-normal"
      />
    </div>
  );
}
