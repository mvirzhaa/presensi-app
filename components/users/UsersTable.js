'use client';

export default function UsersTable({ users, currentUser, onEdit, onDelete, dict }) {
  const t = dict.userManagement;

  if (users.length === 0) {
    return <p className="text-sm text-slate-400">{t.empty}</p>;
  }

  return (
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
                    <span className="ml-2 text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-normal">
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
                    onClick={() => onEdit(u)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 rounded hover:bg-indigo-50 transition"
                  >
                    {t.edit}
                  </button>
                  {!isSelf && (
                    <button
                      onClick={() => onDelete(u)}
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
  );
}
