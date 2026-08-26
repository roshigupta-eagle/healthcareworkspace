"use client";

import type { WeightTrendMeasurement } from './weightTrendTypes';
import React from 'react';
import { formatSignedWeight, formatWeight, toKg } from '@/lib/weightMath';

type Props = {
  weekday: string;
  unit: 'kg' | 'lb';
  measurements: WeightTrendMeasurement[];
  onClose: () => void;
  onSelectMeasurement: (m: WeightTrendMeasurement) => void;
};

/** Drill-down list of a single weekday's measurements within the active period. */
export default function WeekdayMeasurementsDrawer({ weekday, measurements, unit, onClose, onSelectMeasurement }: Props) {
  const sorted = [...measurements].sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="weight-trend-drawer flex h-full flex-col bg-white shadow-2xl">
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
                const delta = prev ? +(toKg(Number(m.value), m.unit) - toKg(Number(prev.value), prev.unit)).toFixed(2) : null;
                return (
                  <button
                    key={m.id}
                    onClick={() => onSelectMeasurement(m)}
                    className="w-full text-left rounded-xl border border-slate-100 bg-slate-50/60 p-3 hover:border-teal-200 hover:bg-teal-50/40 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{formatWeight(Number(m.value), m.unit, unit as 'kg' | 'lb')}</span>
                    <div className="text-xs text-slate-500 mt-1 capitalize">{m.source?.replace('-', ' ') || 'clinic'}{delta != null ? ` · ${delta === 0 ? 'no change' : formatSignedWeight(delta, unit)}` : ''}</div>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 capitalize">{m.source?.replace('-', ' ') || 'clinic'}{delta != null ? ` · ${delta === 0 ? 'no change' : formatSignedWeight(delta, unit as 'kg' | 'lb')}` : ''}</div>
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
