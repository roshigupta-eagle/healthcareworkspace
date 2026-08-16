import React, { useState } from 'react';

export default function FilterBar({ counts = {}, active = 'all', onSelect, onOpenAdvanced }: any) {
  const chips = [
    { key: 'all', label: `All (${counts.total ?? 0})` },
    { key: 'critical', label: `Critical (${counts.critical ?? 0})` },
    { key: 'overdue', label: `Overdue (${counts.overdue ?? 0})` },
    { key: 'due-soon', label: `Due Soon (${counts.dueSoon ?? 0})` },
    { key: 'recommended', label: `Recommended (${counts.recommended ?? 0})` },
  ];

  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2 flex-wrap">
        {chips.map((c) => (
          <button key={c.key} onClick={() => onSelect(c.key)} aria-current={active === c.key ? 'true' : undefined} className={`px-3 py-1 rounded-full text-sm font-medium ${active === c.key ? 'bg-teal-50 border border-teal-200 text-teal-700' : 'bg-white border border-gray-100 text-gray-700'}`}>{c.label}</button>
        ))}
      </div>

      <div className="relative">
        <button onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-white border border-gray-200 text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path d="M3 5a1 1 0 011-1h12a1 1 0 01.8 1.6l-4.5 6a1 1 0 00-.2.6V17l-4-2v-3l-4-6A1 1 0 013 5z" /></svg>
          Filter
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
        </button>
        {open && (
          <div className="absolute right-0 mt-2 w-64 rounded-md bg-white shadow-lg ring-1 ring-black/5 py-2 z-20">
            <div className="px-3 py-2 text-sm text-gray-700">Category</div>
            <div className="px-3 py-2 space-y-1">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" /> Diabetes Care</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" /> Cardiovascular</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" /> Preventive Care</label>
            </div>
            <div className="border-t border-gray-100 mt-2 pt-2 px-3 flex items-center justify-between">
              <button onClick={() => { setOpen(false); onOpenAdvanced && onOpenAdvanced(); }} className="text-sm text-gray-600">Clear</button>
              <button onClick={() => setOpen(false)} className="text-sm bg-teal-700 text-white px-3 py-1 rounded">Apply</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
