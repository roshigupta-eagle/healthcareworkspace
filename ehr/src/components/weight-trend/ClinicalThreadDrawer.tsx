"use client";

import React from 'react';
import { formatWeight } from '@/lib/weightMath';
import type { WeightTrendEvent, WeightTrendMeasurement, WeightTrendPatient } from './weightTrendTypes';

type Props = {
  patient: WeightTrendPatient;
  clinicalEvents: WeightTrendEvent[];
  measurements: WeightTrendMeasurement[];
  displayUnit?: 'kg' | 'lb';
  onClose: () => void;
};

export default function ClinicalThreadDrawer({ patient, clinicalEvents, measurements, displayUnit = 'kg', onClose }: Props) {
  // Combine measurements and clinical events into a unified chronological thread
  const threadItems = [
    ...measurements.map((m) => ({
      id: m.id,
      date: m.occurredAt,
      type: 'measurement',
      title: `Weight Recorded: ${formatWeight(Number(m.value), m.unit, displayUnit)}`,
      subtitle: `${patient.name} · ${m.source || 'clinic'} · Recorded by ${m.recorder?.name || 'Clinician'}`,
      badge: formatWeight(Number(m.value), m.unit, displayUnit),
      badgeColor: 'bg-teal-100 text-teal-800',
    })),
    ...clinicalEvents.map((e) => ({
      id: e.id,
      date: e.date,
      type: 'event',
      title: e.title,
      subtitle: `${e.category} · ${e.actor}`,
      details: e.details,
      badge: e.category,
      badgeColor: 'bg-violet-100 text-violet-800',
    })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="weight-trend-drawer flex h-full flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100/80 text-teal-800 ring-1 ring-teal-600/20">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Longitudinal Clinical Thread</h2>
              <p className="text-xs text-slate-500">Connected timeline of weight observations & clinical events</p>
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

        {/* Content Thread */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="relative border-l-2 border-slate-200 ml-4 space-y-6">
            {threadItems.map((item, idx) => (
              <div key={item.id || idx} className="relative pl-6 group">
                {/* Timeline Dot */}
                <div
                  className={`absolute -left-[9px] top-1.5 h-4 w-4 rounded-full ring-4 ring-white ${
                    item.type === 'measurement' ? 'bg-teal-600' : 'bg-violet-600'
                  }`}
                />

                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 space-y-1 hover:border-slate-200 transition-colors">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">{item.title}</span>
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 font-medium">{item.subtitle}</div>

                  {item.details && <p className="text-xs text-slate-600 mt-1">{item.details}</p>}

                  <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100/80 mt-2">
                    {new Date(item.date).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-4 flex items-center justify-end">
          <button onClick={onClose} className="rounded-xl bg-slate-800 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-900">
            Close Thread
          </button>
        </div>
      </div>
    </div>
  );
}