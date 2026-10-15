"use client";

import React, { useMemo, useState } from 'react';
import type { LogMeasurement } from '@/lib/weightLog';
import { detectOutlierIds } from '@/lib/weightMath';

const PERIODS = [
  { key: '7', label: 'Last 7 Days' },
  { key: '30', label: 'Last 30 Days' },
  { key: '90', label: 'Last 90 Days' },
];

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: '2-digit' });
}

export default function ReviewChangesDrawer({
  measurements,
  onClose,
  onSelectMeasurement,
}: {
  measurements: LogMeasurement[];
  onClose: () => void;
  onSelectMeasurement: (m: LogMeasurement) => void;
}) {
  const [period, setPeriod] = useState('30');

  const { added, corrected, enteredInError, review } = useMemo(() => {
    const cutoff = Date.now() - Number(period) * 24 * 60 * 60 * 1000;
    const withinPeriod = (m: LogMeasurement) => Date.parse(m.occurredAt) >= cutoff;
    const added = measurements.filter((m) => withinPeriod(m) && !m.enteredInError && !m.correction);
    const corrected = measurements.filter((m) => m.correction && (Date.parse(m.correction.correctedAt || m.occurredAt) >= cutoff));
    const enteredInError = measurements.filter((m) => m.enteredInError && withinPeriod(m));
    const validInPeriod = measurements.filter((m) => !m.enteredInError && withinPeriod(m));
    const outlierIds = detectOutlierIds(validInPeriod.map((m) => ({ id: m.id, value: m.value, unit: m.unit, occurredAt: m.occurredAt })));
    const review = validInPeriod.filter((m) => outlierIds.has(m.id));
    return { added, corrected, enteredInError, review };
  }, [measurements, period]);

  function Section({ title, items, tone }: { title: string; items: LogMeasurement[]; tone: string }) {
    if (items.length === 0) return null;
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">{title}</h3>
          <span className={`text-xs font-semibold ${tone}`}>{items.length}</span>
        </div>
        <div className="space-y-1.5">
          {items.map((m) => (
            <button
              key={m.id}
              onClick={() => onSelectMeasurement(m)}
              className="w-full text-left rounded-xl border border-slate-100 bg-slate-50/60 p-3 hover:border-teal-200 hover:bg-teal-50/40 transition-colors flex items-center justify-between"
            >
              <div>
                <span className="font-semibold text-slate-900">{m.value} {m.unit || 'kg'}</span>
                <span className="text-xs text-slate-400 ml-2">{fmt(m.occurredAt)}</span>
              </div>
              <span className="text-xs text-slate-500 capitalize">{m.source?.replace('-', ' ') || 'clinic'}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const isEmpty = added.length === 0 && corrected.length === 0 && enteredInError.length === 0 && review.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="flex h-full w-full max-w-lg flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Weight History Changes</h2>
            <p className="text-xs text-slate-500">Meaningful record changes over the selected period</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="px-6 pt-4 flex items-center gap-1.5">
          {PERIODS.map((p) => (
            <button key={p.key} onClick={() => setPeriod(p.key)} className={`px-2.5 py-1 text-xs font-semibold rounded-md ${period === p.key ? 'bg-teal-100 text-teal-800' : 'text-slate-500 hover:bg-slate-50'}`}>
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {isEmpty ? (
            <p className="text-sm text-slate-500 italic text-center py-8">No changes recorded in this period.</p>
          ) : (
            <>
              <Section title="Recently Added" items={added} tone="text-teal-700" />
              <Section title="Corrected" items={corrected} tone="text-blue-700" />
              <Section title="Entered in Error" items={enteredInError} tone="text-rose-700" />
              <Section title="Data Quality Review" items={review} tone="text-amber-700" />
            </>
          )}
        </div>

        <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-4 flex items-center justify-end">
          <button onClick={onClose} className="rounded-xl bg-slate-800 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-900">Close</button>
        </div>
      </div>
    </div>
  );
}
