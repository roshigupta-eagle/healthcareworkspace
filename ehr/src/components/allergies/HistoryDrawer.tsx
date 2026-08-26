'use client';

import React, { useState } from 'react';
import { IconX, IconHistory, IconFilter } from './AllergyIcons';
import type { AllergyRecord } from '@/lib/allergyStore';
import type { AllergyReviewRecord } from '@/lib/allergyReviewStore';

interface Props {
  allergies: AllergyRecord[];
  review: AllergyReviewRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

function formatDate(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
  } catch {
    return iso;
  }
}

export default function HistoryDrawer({ allergies, review, isOpen, onClose }: Props) {
  const [filter, setFilter] = useState<'all' | 'clinical' | 'patient' | 'reviews'>('all');

  if (!isOpen) return null;

  // Aggregate timeline events
  const events: Array<{ date: string; actor: string; action: string; detail?: string; category: string }> = [];

  for (const a of allergies) {
    for (const h of a.history || []) {
      events.push({
        date: h.date,
        actor: h.actor,
        action: `${a.substance?.display}: ${h.action}`,
        detail: h.detail,
        category: 'clinical',
      });
    }
  }

  for (const r of review?.history || []) {
    events.push({
      date: r.date,
      actor: r.by,
      action: `Allergy Assessment Review: ${r.nkaStatus}`,
      detail: `${r.patientReportedStatus} ${r.note ? `• ${r.note}` : ''}`,
      category: 'reviews',
    });
  }

  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredEvents = events.filter((e) => {
    if (filter === 'all') return true;
    return e.category === filter;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-[580px] bg-white h-full shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-[#DDE7F0] bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-800 flex items-center justify-center flex-shrink-0">
              <IconHistory className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#121A2D]">Full Allergy Audit History</h2>
              <p className="text-xs text-gray-500">
                Complete timeline of record additions, modifications, reviews, & status changes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {/* Filter bar */}
        <div className="p-4 border-b border-gray-100 bg-white flex items-center gap-2 overflow-x-auto text-xs">
          <IconFilter className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          {(['all', 'clinical', 'reviews'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full font-semibold capitalize transition-colors ${
                filter === f
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {f === 'all' ? 'All Events' : f}
            </button>
          ))}
        </div>

        {/* Timeline Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="relative border-l-2 border-slate-200 pl-4 space-y-5">
            {filteredEvents.map((e, idx) => (
              <div key={idx} className="relative">
                <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-teal-600 ring-4 ring-white" />
                <div className="text-xs font-bold text-[#121A2D]">{e.action}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {formatDate(e.date)} by <span className="font-semibold text-gray-800">{e.actor}</span>
                </div>
                {e.detail && (
                  <p className="text-xs text-gray-700 mt-1.5 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    {e.detail}
                  </p>
                )}
              </div>
            ))}

            {filteredEvents.length === 0 && (
              <div className="text-xs text-gray-500 italic">No timeline events match the filter.</div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#DDE7F0] bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
