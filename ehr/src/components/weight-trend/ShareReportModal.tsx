"use client";

import React, { useState } from 'react';
import { formatSignedWeight, formatWeight } from '@/lib/weightMath';
import type { WeightTrendGoal, WeightTrendMeasurement, WeightTrendPatient, WeightTrendStats } from './weightTrendTypes';

type Props = {
  patient: WeightTrendPatient;
  currentWeight: WeightTrendMeasurement;
  stats: WeightTrendStats;
  goal: WeightTrendGoal | null;
  onClose: () => void;
  displayUnit?: 'kg' | 'lb';
};

export default function ShareReportModal({ patient, currentWeight, stats, goal, displayUnit = 'kg', onClose }: Props) {
  const [includeChart, setIncludeChart] = useState(true);
  const [includeGoal, setIncludeGoal] = useState(true);
  const [includeStats, setIncludeStats] = useState(true);
  const [includeEvents, setIncludeEvents] = useState(true);
  const [copied, setCopied] = useState(false);

  function handlePrint() {
    window.print();
  }

  function handleCopySummary() {
    const text = `Weight Trend Report for ${patient?.name || 'Patient'} (MRN: ${patient?.mrn})
Current Weight: ${currentWeight ? formatWeight(Number(currentWeight.value), currentWeight.unit, displayUnit) : '—'} (${currentWeight?.occurredAt ? new Date(currentWeight.occurredAt).toLocaleDateString() : 'Date not documented'})
Total Change: ${stats ? formatSignedWeight(Number(stats.totalChangeKg || 0), displayUnit) : '—'} (${stats?.totalChangePct || 0}%)
Active Goal: ${goal ? goal.targetWeight != null ? `${formatWeight(Number(goal.targetWeight), 'kg', displayUnit)}${goal.targetDate ? ` by ${new Date(goal.targetDate).toLocaleDateString()}` : ''}` : 'Documented range' : 'No active goal'}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150 print:hidden">
      <div className="flex w-full max-w-lg flex-col bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100/80 text-teal-800 ring-1 ring-teal-600/20">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Share Weight Trend Report</h2>
              <p className="text-xs text-slate-500">Configure clinical summary report for export or sharing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 space-y-1">
            <span className="font-semibold text-slate-900">{patient?.name} (MRN {patient?.mrn})</span>
            <p className="text-slate-500">
              Current Weight: <span className="font-bold text-slate-800">{currentWeight ? formatWeight(Number(currentWeight.value), currentWeight.unit, displayUnit) : '—'}</span>
            </p>
          </div>

          <div className="space-y-2">
            <span className="font-semibold text-slate-700 block text-xs">Include Sections in Report:</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeChart}
                onChange={(e) => setIncludeChart(e.target.checked)}
                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-slate-800">Longitudinal Weight & Goal Trend Chart</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeGoal}
                onChange={(e) => setIncludeGoal(e.target.checked)}
                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-slate-800">Target Weight Goal & Care Plan Metrics</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeStats}
                onChange={(e) => setIncludeStats(e.target.checked)}
                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-slate-800">Range Statistics (Starting, Lowest, Highest, Average)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeEvents}
                onChange={(e) => setIncludeEvents(e.target.checked)}
                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-slate-800">Relevant Clinical Event Markers (Medications, Consults)</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50/60 px-6 py-4 flex items-center justify-between gap-3">
          <button
            onClick={handleCopySummary}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            {copied ? 'Copied Summary!' : 'Copy Text Summary'}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 shadow-sm"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print / Save PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}