import React from 'react';

export type SummaryItem = { label: string; value: string };

export default function ContactSummaryCard({ title, items }: { title: string; items: SummaryItem[] }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-[#E6EEF2] shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[#121A2D]">{title}</h3>
          <div className="mt-2 space-y-1 text-sm text-gray-700">
            {items.map((it) => (
              <div key={it.label} className="flex items-center justify-between">
                <div className="text-xs text-gray-500">{it.label}</div>
                <div className="font-medium text-gray-900 ml-4">{it.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <button className="px-3 py-1 rounded bg-white border text-sm">Edit</button>
          <button className="px-3 py-1 rounded bg-white border text-sm">Verify</button>
        </div>
      </div>
    </div>
  );
}
