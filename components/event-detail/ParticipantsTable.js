'use client';

import { useState } from 'react';
import { calculateDistance, formatDistance } from '@/lib/geo';
import EditParticipantModal from './EditParticipantModal';

export default function ParticipantsTable({
  event,
  participants,
  dict,
  canEdit = true,
  onEditParticipant,
  onDeleteParticipant,
}) {
  const t = dict.adminDetail;
  const [editingParticipant, setEditingParticipant] = useState(null);

  return (
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
                {canEdit && <th className="py-2 pr-3 text-center whitespace-nowrap">{t.colActions || 'Aksi'}</th>}
              </tr>
            </thead>
            <tbody>
              {participants.map((p, idx) => {
                let distance = null;
                let isWithin = true;
                if (
                  p.latitude &&
                  p.longitude &&
                  event?.target_latitude != null &&
                  event?.target_longitude != null
                ) {
                  distance = calculateDistance(
                    p.latitude,
                    p.longitude,
                    event.target_latitude,
                    event.target_longitude
                  );
                  isWithin = distance != null && distance <= (event.radius_meters || 50);
                }

                return (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                    <td className="py-2.5 pr-3 text-slate-400">{idx + 1}</td>
                    <td className="py-2.5 pr-3 font-medium text-slate-800">{p.nama}</td>
                    <td className="py-2.5 pr-3 text-slate-600">{p.asal_instansi}</td>
                    <td className="py-2.5 pr-3 text-slate-600">{p.jabatan}</td>
                    <td className="py-2.5 pr-3 text-slate-500">{new Date(p.presensi_at).toLocaleString()}</td>
                    <td className="py-2.5 pr-3">
                      {p.latitude && p.longitude ? (
                        <div className="flex items-center gap-1 flex-wrap">
                          <a
                            className="inline-flex items-center gap-1 text-indigo-600 hover:underline font-medium"
                            href={`https://www.google.com/maps?q=${p.latitude},${p.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            📍 {t.viewMap}
                          </a>
                          {distance !== null && (
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded-full font-medium border ${
                                isWithin
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-red-50 text-red-600 border-red-200'
                              }`}
                            >
                              {isWithin ? `✓ ±${formatDistance(distance)}` : `⚠ ±${formatDistance(distance)}`}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    {canEdit && (
                      <td className="py-2.5 pr-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 justify-center">
                          <button
                            type="button"
                            onClick={() => setEditingParticipant(p)}
                            className="px-2 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 rounded-md text-xs font-medium transition"
                            title={t.editParticipant || 'Edit Peserta'}
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteParticipant?.(p.id)}
                            className="px-2 py-1 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 hover:border-red-200 rounded-md text-xs font-medium transition"
                            title={t.deleteParticipant || 'Hapus Peserta'}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <EditParticipantModal
        isOpen={!!editingParticipant}
        onClose={() => setEditingParticipant(null)}
        participant={editingParticipant}
        dict={dict}
        onSave={async (data) => {
          await onEditParticipant?.(data);
          setEditingParticipant(null);
        }}
      />
    </div>
  );
}

