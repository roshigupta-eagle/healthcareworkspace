"use client";

import React from 'react';
import Link from 'next/link';

type ClinicalEvent = {
  id: string;
  date: string;
  type?: string;
  category?: string;
  title: string;
  actor?: string;
  details?: string;
  recordHref?: string;
};

const ICON_BY_TYPE: Record<string, { bg: string; text: string; ring: string }> = {
  medication: { bg: 'bg-violet-100/80', text: 'text-violet-700', ring: 'ring-violet-600/20' },
  encounter: { bg: 'bg-cyan-100/80', text: 'text-cyan-800', ring: 'ring-cyan-600/20' },
  goal: { bg: 'bg-teal-100/80', text: 'text-teal-700', ring: 'ring-teal-600/20' },
  dietitian: { bg: 'bg-emerald-100/80', text: 'text-emerald-700', ring: 'ring-emerald-600/20' },
  plan: { bg: 'bg-sky-100/80', text: 'text-sky-700', ring: 'ring-sky-600/20' },
};

/** Returns a real, existing Roshi record link for a clinical event — never a fabricated destination. */
function linkFor(evt: ClinicalEvent, patientId: string): { label: string; href?: string; onClick?: () => void } | null {
  switch (evt.type) {
    case 'medication':
      return { label: 'View Medication', href: `/dashboard/records/${patientId}/medications` };
    case 'encounter':
      return { label: 'View Encounter', href: `/dashboard/records/${patientId}/history` };
    case 'dietitian':
      return { label: 'View Care Team', href: `/dashboard/records/${patientId}/care-team` };
    case 'plan':
      return { label: 'View Care Plan', href: `/dashboard/records/${patientId}/care-gaps` };
    default:
      return null;
  }
}

export default function EventDetailPopover({
  event,
  patientId,
  onClose,
  onManageGoal,
}: {
  event: ClinicalEvent;
  patientId: string;
  onClose: () => void;
  onManageGoal: () => void;
}) {
  const tone = ICON_BY_TYPE[event.type || ''] || ICON_BY_TYPE.plan;
  const link = event.type === 'goal' ? { label: 'View Goal', onClick: onManageGoal } : event.recordHref ? { label: 'View Record', href: event.recordHref } : linkFor(event, patientId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl border border-slate-100 bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={event.title}
      >
        <div className="flex items-start gap-3 border-b border-slate-100 bg-slate-50/50 px-5 py-4">
          <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${tone.bg} ${tone.text} ring-1 ${tone.ring}`}>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-slate-900">{event.title}</div>
            <div className="text-xs text-slate-500 mt-0.5">
              {new Date(event.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' })}
              {event.actor ? ` · ${event.actor}` : ''}
            </div>
          </div>
          <button onClick={onClose} className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-3 text-sm">
          {event.details && <p className="text-slate-700 leading-relaxed">{event.details}</p>}
          <p className="text-[11px] text-slate-400 italic">This event occurred during the selected period. Timeline proximity does not imply causation.</p>
        </div>

        <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-3.5 flex items-center justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            Close
          </button>
          {link && (
            link.href ? (
              <Link href={link.href} className="rounded-lg bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-teal-800">
                {link.label}
              </Link>
            ) : (
              <button onClick={link.onClick} className="rounded-lg bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-teal-800">
                {link.label}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
