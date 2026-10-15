"use client";

import React from 'react';

type Props = {
  weekday: string;
  measurements: any[];
  unit: string;
  onClose: () => void;
  onSelectMeasurement: (m: any) => void;
};

/** Drill-down list of a single weekday's measurements within the active period. */
export default function WeekdayMeasurementsDrawer({ weekday, measurements, unit, onClose, onSelectMeasurement }: Props) {
  const sorted = [...measurements].sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Measurements — {weekday}</h2>
            <p className="text-xs text-slate-500">{sorted.length} measurement{sorted.length === 1 ? '' : 's'} in the selected period</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {sorted.length === 0 ? (
            <p className="text-sm text-slate-500 italic">No measurements recorded on this weekday.</p>
          ) : (
            <div className="space-y-2">
              {sorted.map((m, idx) => {
                const prev = sorted[idx + 1];
                const delta = prev ? +(Number(m.value) - Number(prev.value)).toFixed(2) : null;
                return (
                  <button
                    key={m.id}
                    onClick={() => onSelectMeasurement(m)}
                    className="w-full text-left rounded-xl border border-slate-100 bg-slate-50/60 p-3 hover:border-teal-200 hover:bg-teal-50/40 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{m.value} {m.unit || unit}</span>
                      <span className="text-xs text-slate-400">{new Date(m.occurredAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' })}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 capitalize">{m.source?.replace('-', ' ') || 'clinic'}{delta != null ? ` · ${delta === 0 ? 'no change' : delta > 0 ? `+${delta} kg` : `${delta} kg`}` : ''}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-4 flex items-center justify-end">
          <button onClick={onClose} className="rounded-xl bg-slate-800 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-900">Close</button>
        </div>
      </div>
    </div>
  );
}
