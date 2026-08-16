"use client";

import React from 'react';
import { mockUsers } from '@/lib/mockClinicalData';
import type { Priority, Status } from '@/lib/clinicalTypes';

type Filters = {
  priorities: Priority[];
  statuses: Status[];
  assignedTo?: string | null;
};

export default function FilterPopover({ value, onChange }: { value: Filters; onChange: (v: Filters) => void }) {
  function togglePriority(p: Priority) {
    const exists = value.priorities.includes(p);
    onChange({ ...value, priorities: exists ? value.priorities.filter((x) => x !== p) : [...value.priorities, p] });
  }

  function toggleStatus(s: Status) {
    const exists = value.statuses.includes(s);
    onChange({ ...value, statuses: exists ? value.statuses.filter((x) => x !== s) : [...value.statuses, s] });
  }

  return (
    <div className="w-72 bg-white rounded-lg border p-3 shadow-lg">
      <div className="text-sm font-semibold mb-2">Filters</div>

      <div className="text-xs text-slate-500 mb-1">Priority</div>
      <div className="flex gap-2 mb-3">
        {(['critical','high','medium','low'] as Priority[]).map((p) => (
          <button key={p} onClick={() => togglePriority(p)} className={`px-2 py-1 rounded text-sm border ${value.priorities.includes(p) ? 'bg-sky-50 border-sky-200' : 'bg-white'}`}>
            {p}
          </button>
        ))}
      </div>

      <div className="text-xs text-slate-500 mb-1">Status</div>
      <div className="flex gap-2 mb-3">
        {(['todo','in_progress','delegated','completed','overdue'] as Status[]).map((s) => (
          <button key={s} onClick={() => toggleStatus(s)} className={`px-2 py-1 rounded text-sm border ${value.statuses.includes(s) ? 'bg-sky-50 border-sky-200' : 'bg-white'}`}>
            {s}
          </button>
        ))}
      </div>

      <div className="text-xs text-slate-500 mb-1">Assigned To</div>
      <select className="w-full border rounded p-2 text-sm" value={value.assignedTo ?? ''} onChange={(e) => onChange({ ...value, assignedTo: e.target.value || undefined })}>
        <option value="">Any</option>
        {mockUsers.map((u) => (
          <option key={u.id} value={u.id}>{u.name} · {u.role}</option>
        ))}
      </select>

      <div className="mt-3 flex items-center justify-end gap-2">
        <button onClick={() => onChange({ priorities: [], statuses: [], assignedTo: undefined })} className="px-3 py-1 text-sm">Clear</button>
        <button onClick={() => {}} className="px-3 py-1 bg-sky-600 text-white rounded text-sm">Apply</button>
      </div>
    </div>
  );
}
