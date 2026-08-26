"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { LogMeasurement } from '@/lib/weightLog';
import { formatWeight } from '@/lib/weightMath';

const PERIODS = [
  { key: '7', label: 'Last 7 Days' },
  { key: '30', label: 'Last 30 Days' },
  { key: '90', label: 'Last 90 Days' },
];

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: '2-digit' });
}

function ReviewChangesSection({ title, items, tone, displayUnit, onSelectMeasurement }: { title: string; items: LogMeasurement[]; tone: string; displayUnit: 'kg' | 'lb'; onSelectMeasurement: (m: LogMeasurement) => void }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</h3>
        <span className={`text-xs font-semibold ${tone}`}>{items.length}</span>
      </div>
      <div className="space-y-1.5">
        {items.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onSelectMeasurement(m)}
            className="w-full rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-left transition-colors hover:border-teal-200 hover:bg-teal-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          >
            <span className="flex items-start justify-between gap-3">
              <span>
                <span className="font-semibold text-slate-900">{formatWeight(Number(m.value), m.unit, displayUnit)}</span>
                <span className="ml-2 text-xs text-slate-400">{fmt(m.occurredAt)}</span>
                {m.dataQuality?.reason && <span className="mt-1 block text-xs text-amber-700">{m.dataQuality.reason}</span>}
              </span>
              <span className="shrink-0 text-xs capitalize text-slate-500">{m.source?.replace('-', ' ') || 'clinic'}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ReviewChangesDrawer({
  measurements,
  displayUnit = 'kg',
  onClose,
  onSelectMeasurement,
}: {
  measurements: LogMeasurement[];
  displayUnit?: 'kg' | 'lb';
  onClose: () => void;
  onSelectMeasurement: (m: LogMeasurement) => void;
}) {
  const [period, setPeriod] = useState('30');
  const [now] = useState(() => Date.now());
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab' || !drawerRef.current) return;
      const focusable = Array.from(drawerRef.current.querySelectorAll<HTMLElement>('button, select, a[href]')).filter((element) => !element.hasAttribute('disabled'));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  const { added, corrected, enteredInError, review } = useMemo(() => {
    const cutoff = now - Number(period) * 24 * 60 * 60 * 1000;
    const withinPeriod = (m: LogMeasurement) => Date.parse(m.occurredAt) >= cutoff;
    const added = measurements.filter((m) => withinPeriod(m) && !m.enteredInError && !m.correction);
    const corrected = measurements.filter((m) => m.correction && (Date.parse(m.correction.correctedAt || m.occurredAt) >= cutoff));
    const enteredInError = measurements.filter((m) => m.enteredInError && withinPeriod(m));
    const review = measurements.filter((m) => withinPeriod(m) && !m.enteredInError && m.dataQuality?.state === 'review');
    return { added, corrected, enteredInError, review };
  }, [measurements, period, now]);


  const isEmpty = added.length === 0 && corrected.length === 0 && enteredInError.length === 0 && review.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div ref={drawerRef} role="dialog" aria-modal="true" aria-labelledby="weight-history-changes-title" className="weight-trend-drawer flex h-full flex-col bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <div>
            <h2 id="weight-history-changes-title" className="text-lg font-bold text-slate-900">Weight History Changes</h2>
            <p className="text-xs text-slate-500">Meaningful record changes over the selected period</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close weight history changes">
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
              <ReviewChangesSection title="Recently Added" items={added} tone="text-teal-700" displayUnit={displayUnit} onSelectMeasurement={onSelectMeasurement} />
              <ReviewChangesSection title="Corrected" items={corrected} tone="text-blue-700" displayUnit={displayUnit} onSelectMeasurement={onSelectMeasurement} />
              <ReviewChangesSection title="Entered in Error" items={enteredInError} tone="text-rose-700" displayUnit={displayUnit} onSelectMeasurement={onSelectMeasurement} />
              <ReviewChangesSection title="Data Quality Review" items={review} tone="text-amber-700" displayUnit={displayUnit} onSelectMeasurement={onSelectMeasurement} />
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
