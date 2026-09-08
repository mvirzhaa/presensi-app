'use client';

export default function LocationSettingCard({ requireLocation, onToggle, toggling, dict }) {
  const t = dict.adminDetail;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-medium text-slate-700">{t.locationSettingTitle}</p>
          <p className={`text-xs mt-1 ${requireLocation ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
            {requireLocation ? t.locationOn : t.locationOff}
          </p>
        </div>
        <button
          onClick={onToggle}
          disabled={toggling}
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
  );
}
