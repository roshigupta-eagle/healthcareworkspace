"use client";

import React from 'react';
import { formatSignedWeight, formatWeight, toKg } from '@/lib/weightMath';
import type { WeightTrendEvent, WeightTrendGoal, WeightTrendMeasurement, WeightTrendPatient } from './weightTrendTypes';

type Props = {
  patient: WeightTrendPatient;
  currentMeasurement: WeightTrendMeasurement;
  previousVisitMeasurement?: WeightTrendMeasurement | null;
  clinicalEvents: WeightTrendEvent[];
  displayUnit?: 'kg' | 'lb';
  lastClinicalVisit?: string;
  measurementsSinceLastVisit?: number;
  reviewCountSinceLastVisit?: number;
  goal?: WeightTrendGoal | null;
  onClose: () => void;
  onOpenThread: () => void;
};

export default function WhatChangedDrawer({
  patient,
  currentMeasurement,
  previousVisitMeasurement,
  clinicalEvents,
  displayUnit = 'kg',
  lastClinicalVisit,
  measurementsSinceLastVisit = 0,
  reviewCountSinceLastVisit = 0,
  goal,
  onClose,
  onOpenThread,
}: Props) {
  const lastVisitDate = lastClinicalVisit || patient?.lastVisit;
  const hasComparison = currentMeasurement && previousVisitMeasurement;
  const currKg = hasComparison ? toKg(Number(currentMeasurement.value), currentMeasurement.unit) : null;
  const prevKg = hasComparison ? toKg(Number(previousVisitMeasurement.value), previousVisitMeasurement.unit) : null;
  const diffKg = currKg != null && prevKg != null ? +(currKg - prevKg).toFixed(2) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="weight-trend-drawer flex h-full flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100/80 text-cyan-800 ring-1 ring-cyan-600/20">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">What Changed Since Last Visit?</h2>
              <p className="text-xs text-slate-500">
                Longitudinal clinical delta since {lastVisitDate ? new Date(lastVisitDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' }) : 'the last documented visit'}
              </p>
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
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {/* Delta Hero Card */}
          <div className="rounded-2xl border border-cyan-100 bg-cyan-50/40 p-4 space-y-2 ring-1 ring-cyan-500/10">
            <div className="text-[11px] font-semibold text-cyan-900 uppercase tracking-wider">Weight Delta</div>
            {hasComparison ? (
              <>
                <div className="flex items-baseline justify-between">
                  <div className="text-2xl font-black text-slate-900 tabular-nums">
                    {diffKg == null ? '—' : formatSignedWeight(diffKg, displayUnit)}
                  </div>
                  <div className="text-slate-600 font-medium">
                    {formatWeight(Number(previousVisitMeasurement.value), previousVisitMeasurement.unit, displayUnit)} → <span className="font-bold text-slate-900">{formatWeight(Number(currentMeasurement.value), currentMeasurement.unit, displayUnit)}</span>
                  </div>
                </div>
                <p className="text-[11px] text-cyan-800/80 italic pt-1">
                  Note: Medical events listed below occurred during this interval. Direct clinical causation is not implied without explicit assessment.
                </p>
              </>
            ) : (
              <p className="text-xs text-cyan-800/80">Not enough documented measurements to compute a comparison for this period.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3"><div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Measurements</div><div className="mt-1 text-lg font-black text-slate-900">{measurementsSinceLastVisit}</div><div className="text-[11px] text-slate-500">new since visit</div></div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3"><div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Data quality</div><div className="mt-1 text-lg font-black text-slate-900">{reviewCountSinceLastVisit}</div><div className="text-[11px] text-slate-500">review item{reviewCountSinceLastVisit === 1 ? '' : 's'}</div></div>
          </div>

          {goal && <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-3 text-xs text-slate-700"><div className="text-[10px] font-bold uppercase tracking-wide text-violet-700">Documented goal</div><div className="mt-1 font-semibold">{goal.targetWeight != null ? `${goal.targetWeight} kg target` : 'Target range or maintenance goal'}</div><div className="mt-0.5 text-slate-500">Direction is used only when explicitly documented.</div></div>}

          {/* Section: Clinical Events in Interval */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 text-sm">Relevant Clinical Events in Period</h3>
            {clinicalEvents.length === 0 ? (
              <p className="text-slate-500 italic">No documented clinical events during this period.</p>
            ) : (
              <div className="space-y-2">
                {clinicalEvents.map((evt) => (
                  <div key={evt.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">{evt.title}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(evt.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">{evt.details}</p>
                    <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                      <span>{evt.actor}</span>
                      <span className="font-semibold text-teal-700 capitalize">{evt.category}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-4 flex items-center justify-between gap-3">
          <button
            onClick={() => {
              onClose();
              onOpenThread();
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-4 py-2.5 text-xs font-semibold text-teal-800 hover:bg-teal-100"
          >
            <span>View Clinical Thread</span>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
          <button onClick={onClose} className="rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-900">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}