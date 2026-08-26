"use client";

import React from 'react';
import type { MedicationRecord } from '@/lib/medicationsStore';

function formatDateTime(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: '2-digit', hour: 'numeric', minute: '2-digit' });
}

export default function MedicationHistoryDrawer({ medication, onClose }: { medication: MedicationRecord; onClose: () => void }) {
  const events = medication.history.slice().reverse();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-xs">
      <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Medication History</h2>
            <p className="text-xs text-slate-500 mt-0.5">{medication.name}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {events.length === 0 ? (
            <p className="text-slate-400 italic text-sm">No history recorded.</p>
          ) : (
            <div className="relative border-l-2 border-slate-100 ml-2 space-y-4">
              {events.map((h, idx) => (
                <div key={idx} className="pl-4 relative">
                  <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-teal-500" />
                  <div className="font-medium text-slate-800 capitalize">{h.action.replace(/-/g, ' ')}</div>
                  <div className="text-xs text-slate-400">{h.actor} · {formatDateTime(h.date)}</div>
                  {h.detail && <div className="text-xs text-slate-600 mt-1 bg-slate-50 rounded-lg px-2.5 py-1.5 border border-slate-100">{h.detail}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="border-t border-slate-100 px-6 py-4 flex justify-end">
          <button onClick={onClose} className="rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800">Close</button>
        </div>
      </div>
    </div>
  );
}
