import React from 'react';

function StatusBadge({ status }: { status: string }) {
  const s = (status || '').toLowerCase();
  if (s === 'overdue') return <span className="inline-flex items-center gap-2 px-2 py-0.5 rounded text-xs font-semibold bg-red-50 text-red-700">Overdue</span>;
  if (s === 'due-soon' || s === 'due soon') return <span className="inline-flex items-center gap-2 px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700">Due Soon</span>;
  if (s === 'recommended') return <span className="inline-flex items-center gap-2 px-2 py-0.5 rounded text-xs font-semibold bg-sky-50 text-sky-700">Recommended</span>;
  if (s === 'critical') return <span className="inline-flex items-center gap-2 px-2 py-0.5 rounded text-xs font-semibold bg-red-50 text-red-700">Critical</span>;
  return <span className="inline-flex items-center gap-2 px-2 py-0.5 rounded text-xs font-semibold bg-gray-50 text-gray-700">{status}</span>;
}

export default function CareGapsTable({ items = [], onOrder, onSchedule, onOpen }: any) {
  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-gray-100 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-white">
          <tr>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Care Gap</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Category</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Due Date</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Last Completed</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it: any) => (
            <tr key={it.id} className="border-t border-gray-50 hover:bg-gray-50">
              <td className="px-4 py-3 align-middle">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full" style={{ background: statusToColor(it.status) }} aria-hidden />
                  <button onClick={() => onOpen(it)} className="text-sm font-medium text-gray-900 text-left">{it.title}</button>
                </div>
              </td>
              <td className="px-4 py-3 align-middle text-gray-700">{it.category}</td>
              <td className="px-4 py-3 align-middle"><StatusBadge status={it.status} /></td>
              <td className="px-4 py-3 align-middle">{formatDate(it.dueDate)}</td>
              <td className="px-4 py-3 align-middle text-gray-600">{it.lastCompletedDate ? formatDate(it.lastCompletedDate) : 'Never'}</td>
              <td className="px-4 py-3 align-middle text-right">
                {it.recommendedAction === 'order' && (
                  <button onClick={() => onOrder(it)} className="inline-flex items-center gap-2 px-3 py-1 text-sm rounded border border-teal-300 text-teal-700">Order</button>
                )}
                {it.recommendedAction === 'schedule' && (
                  <button onClick={() => onSchedule(it)} className="inline-flex items-center gap-2 px-3 py-1 text-sm rounded border border-teal-300 text-teal-700">Schedule</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatDate(d: any) {
  if (!d) return '—';
  try { const dt = new Date(d); const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return `${months[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`; } catch (e) { return d; }
}

function statusToColor(status: string) {
  const s = (status || '').toLowerCase();
  if (s === 'overdue') return '#ef4444';
  if (s === 'due-soon' || s === 'due soon') return '#f59e0b';
  if (s === 'recommended') return '#3b82f6';
  if (s === 'critical') return '#dc2626';
  return '#94a3b8';
}
