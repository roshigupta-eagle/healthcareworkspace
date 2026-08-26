"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { splitComparisonWindows, summarizePeriod } from '@/lib/weightInsights';
import { formatWeight } from '@/lib/weightMath';
import type { WeightTrendGoal, WeightTrendMeasurement } from './weightTrendTypes';

type Preset = '30' | '90' | '180' | '365';

const PRESET_LABELS: Record<Preset, string> = {
  '30': '30 Days',
  '90': '90 Days',
  '180': '6 Months',
  '365': '1 Year',
};

function fmt(n: number | null | undefined, unit: 'kg' | 'lb' = 'kg', decimals = 2) {
  return n == null ? '—' : formatWeight(n, 'kg', unit, decimals);
}

export default function ComparePeriodsDrawer({
  patientId,
  goal,
  displayUnit = 'kg',
  onClose,
}: {
  patientId: string;
  goal?: WeightTrendGoal | null;
  displayUnit?: 'kg' | 'lb';
  onClose: () => void;
}) {
  const [preset, setPreset] = useState<Preset>('90');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [allMeasurements, setAllMeasurements] = useState<WeightTrendMeasurement[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/patients/${encodeURIComponent(patientId)}/weight-trend`)
      .then((res) => { if (!res.ok) throw new Error('failed'); return res.json(); })
      .then((json) => { if (!cancelled) { setAllMeasurements(Array.isArray(json.items) ? json.items as WeightTrendMeasurement[] : []); setLoading(false); } })
      .catch(() => { if (!cancelled) { setError(true); setLoading(false); } });
    return () => { cancelled = true; };
  }, [patientId]);

  const comparison = useMemo(() => {
    if (!allMeasurements) return null;
    const days = Number(preset);
    const { currentItems, previousItems } = splitComparisonWindows(allMeasurements, days);
    return { current: summarizePeriod(currentItems), previous: summarizePeriod(previousItems) };
  }, [allMeasurements, preset]);

  function describeDelta(currentVal: number | null, previousVal: number | null, higherWord: string, lowerWord: string) {
    if (currentVal == null || previousVal == null) return 'Insufficient data to compare';
    if (Math.abs(currentVal - previousVal) < 0.05) return 'No meaningful change';
    return currentVal > previousVal ? higherWord : lowerWord;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="weight-trend-drawer flex h-full flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100/80 text-blue-700 ring-1 ring-blue-600/20">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4M16 17H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Compare Periods</h2>
              <p className="text-xs text-slate-500">Descriptive comparison — not a clinical judgment</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 pt-4">
          <div className="flex items-center gap-1.5 flex-wrap">
            {(Object.keys(PRESET_LABELS) as Preset[]).map((p) => (
              <button
                key={p}
                onClick={() => setPreset(p)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md ${preset === p ? 'bg-blue-100 text-blue-800' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                {PRESET_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-sm">
          {loading && (
            <div className="animate-pulse space-y-3">
              <div className="h-20 bg-slate-100 rounded-xl" />
              <div className="h-20 bg-slate-100 rounded-xl" />
              <div className="h-20 bg-slate-100 rounded-xl" />
            </div>
          )}

          {error && (
            <p className="text-rose-700 text-sm">Unable to load comparison data. Please try again.</p>
          )}

          {!loading && !error && comparison && (
            <>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">
                Last {PRESET_LABELS[preset]} vs Previous {PRESET_LABELS[preset]}
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4 space-y-1">
                <div className="text-[11px] font-semibold text-blue-900 uppercase tracking-wider">Average Weight</div>
                <div className="flex items-center justify-between text-slate-900 font-bold text-lg tabular-nums">
                  <span>{fmt(comparison.previous.average, displayUnit)}</span>
                  <span className="text-blue-400">→</span>
                  <span>{fmt(comparison.current.average, displayUnit)}</span>
                </div>
                <p className="text-[11px] text-blue-800/80">{describeDelta(comparison.current.average, comparison.previous.average, 'Average weight increased', 'Average weight decreased')}</p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 flex items-center justify-between">
                <span className="font-medium text-slate-600">Measurements</span>
                <span className="font-bold text-slate-900 tabular-nums">{comparison.previous.count} → {comparison.current.count}</span>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 flex items-center justify-between">
                <span className="font-medium text-slate-600">Fluctuation</span>
                <span className="font-bold text-slate-900 tabular-nums">{fmt(comparison.previous.fluctuation, displayUnit)} → {fmt(comparison.current.fluctuation, displayUnit)}</span>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 flex items-center justify-between">
                <span className="font-medium text-slate-600">Measurement Days</span>
                <span className="font-bold text-slate-900 tabular-nums">{comparison.previous.weekdaysWithData} → {comparison.current.weekdaysWithData}</span>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 flex items-center justify-between">
                <span className="font-medium text-slate-600">Full Range</span>
                <span className="font-bold text-slate-900 tabular-nums">
                  {comparison.previous.range ? fmt(comparison.previous.range.difference, displayUnit) : '—'} → {comparison.current.range ? fmt(comparison.current.range.difference, displayUnit) : '—'}
                </span>
              </div>

              {goal && (
                <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-3.5">
                  <div className="text-[11px] font-semibold text-violet-900 uppercase tracking-wider">Goal Context</div>
                  <div className="text-slate-800 font-medium mt-1">{goal.targetWeight != null ? `Target: ${formatWeight(Number(goal.targetWeight), 'kg', displayUnit)}` : 'Documented target range'}</div>
                </div>
              )}
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
