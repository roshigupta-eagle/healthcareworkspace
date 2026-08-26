"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import type { ConditionRecord } from '@/lib/conditionsStore';
import { clinicalStatusLabel, verificationLabel, needsReview, careGapsForCondition, tasksForCondition, availableConditionActions, type CareGapItem, type TaskItem } from '@/lib/conditions';
import ConditionStatusDialog, { type StatusAction } from './ConditionStatusDialog';

const STATUS_TONE: Record<string, string> = {
  active: 'bg-teal-50 text-teal-800 border-teal-200',
  inactive: 'bg-slate-100 text-slate-600 border-slate-200',
  resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  remission: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'entered-in-error': 'bg-rose-50 text-rose-700 border-rose-200',
};

function formatDate(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
}

export default function ConditionDetailDrawer({
  patientId,
  condition,
  careGaps,
  tasks,
  onClose,
  onRefresh,
}: {
  patientId: string;
  condition: ConditionRecord;
  careGaps: CareGapItem[];
  tasks: TaskItem[];
  onClose: () => void;
  onRefresh: () => Promise<void> | void;
}) {
  const [statusAction, setStatusAction] = useState<StatusAction | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);

  const actions = availableConditionActions(condition);
  const relatedGaps = careGapsForCondition(condition, careGaps);
  const relatedTasks = tasksForCondition(condition, tasks);
  const attention = needsReview(condition);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-900">{condition.name}</h2>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${STATUS_TONE[condition.clinicalStatus]}`}>{clinicalStatusLabel(condition.clinicalStatus)}</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border bg-blue-50 text-blue-700 border-blue-200">{verificationLabel(condition.verificationStatus)}</span>
                {attention && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border bg-amber-50 text-amber-800 border-amber-200">Needs Review</span>}
              </div>
            </div>
            <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 flex-shrink-0" aria-label="Close">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-sm">
          {/* Overview */}
          <section className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Condition Overview</h3>
            <dl className="grid grid-cols-2 gap-y-3 gap-x-4">
              {condition.category && (
                <div><dt className="text-xs text-slate-400">Category</dt><dd className="font-medium text-slate-900">{condition.category}</dd></div>
              )}
              <div><dt className="text-xs text-slate-400">Onset</dt><dd className="font-medium text-slate-900">{formatDate(condition.onsetDate)}</dd></div>
              <div><dt className="text-xs text-slate-400">Recorded</dt><dd className="font-medium text-slate-900">{formatDate(condition.recordedDate)}</dd></div>
              <div><dt className="text-xs text-slate-400">Last Reviewed</dt><dd className="font-medium text-slate-900">{formatDate(condition.lastReviewed)}</dd></div>
              {condition.recorder && <div><dt className="text-xs text-slate-400">Recorder</dt><dd className="font-medium text-slate-900">{condition.recorder}</dd></div>}
              {condition.managedBy && <div><dt className="text-xs text-slate-400">Responsible Clinician</dt><dd className="font-medium text-slate-900">{condition.managedBy}</dd></div>}
              {condition.resolvedDate && <div><dt className="text-xs text-slate-400">Resolved</dt><dd className="font-medium text-slate-900">{formatDate(condition.resolvedDate)}</dd></div>}
            </dl>
            {condition.note && <p className="mt-3 text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 italic">{condition.note}</p>}
          </section>

          {/* Current Management */}
          <section className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Current Management</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between"><span className="text-slate-500">Responsible clinician</span><span className="font-medium text-slate-900">{condition.managedBy || 'Not documented'}</span></div>
              <div className="flex items-center justify-between"><span className="text-slate-500">Open tasks</span><span className="font-medium text-slate-900">{relatedTasks.length}</span></div>
              <div className="flex items-center justify-between"><span className="text-slate-500">Care plan</span><span className="font-medium text-slate-500">No care plan documented</span></div>
            </div>
          </section>

          {/* Care gaps */}
          {relatedGaps.length > 0 && (
            <section>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Care Gaps</h3>
              <div className="space-y-2">
                {relatedGaps.map((g) => (
                  <div key={g.id} className="rounded-xl border border-amber-100 bg-amber-50/50 p-3 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-900">{g.title}</div>
                      <div className="text-xs text-amber-800 capitalize mt-0.5">{g.status.replace('-', ' ')}{g.dueDate ? ` · Due ${formatDate(g.dueDate)}` : ''}</div>
                    </div>
                    <Link href={`/dashboard/records/${patientId}/care-gaps`} className="text-xs font-semibold text-amber-800 hover:underline flex-shrink-0">Open Care Gap</Link>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Tasks */}
          {relatedTasks.length > 0 && (
            <section>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Open Tasks</h3>
              <div className="space-y-2">
                {relatedTasks.map((t) => (
                  <div key={t.id} className="rounded-xl border border-blue-100 bg-blue-50/40 p-3 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-900">{t.title}</div>
                      <div className="text-xs text-blue-800 mt-0.5">
                        {t.dueDate ? `Due ${formatDate(t.dueDate)}` : 'No due date'}{t.assignee?.name ? ` · ${t.assignee.name}` : ''}
                      </div>
                    </div>
                    <Link href={`/dashboard/records/${patientId}/tasks?task=${encodeURIComponent(t.id)}`} className="text-xs font-semibold text-blue-800 hover:underline flex-shrink-0">Open Task</Link>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* History */}
          <section>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Condition History</h3>
            {condition.history.length === 0 ? (
              <p className="text-slate-400 italic">No history recorded.</p>
            ) : (
              <div className="relative border-l-2 border-slate-100 ml-2 space-y-3">
                {condition.history.slice().reverse().map((h, idx) => (
                  <div key={idx} className="pl-4 relative">
                    <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-teal-500" />
                    <div className="font-medium text-slate-800 capitalize">{h.action}</div>
                    <div className="text-xs text-slate-400">{h.actor} · {formatDate(h.date)}</div>
                  </div>
                ))}
              </div>
            )}
            <Link href={`/dashboard/records/${patientId}/timeline?condition=${encodeURIComponent(condition.id)}`} className="inline-block mt-3 text-xs font-semibold text-teal-700 hover:underline">View in Clinical Timeline →</Link>
          </section>
        </div>

        {/* Footer actions */}
        <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {actions.includes('create-follow-up') && (
              <Link
                href={`/dashboard/records/${patientId}/tasks?new=1&title=${encodeURIComponent(`Follow-up: ${condition.name}`)}`}
                className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Create Follow-Up
              </Link>
            )}
            <div className="relative">
              <button onClick={() => setMoreOpen((v) => !v)} aria-haspopup="menu" aria-expanded={moreOpen} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">More</button>
              {moreOpen && (
                <div role="menu" className="absolute left-0 bottom-10 w-48 rounded-lg bg-white border border-slate-200 shadow-lg py-1 z-30">
                  {actions.includes('resolve') && <button role="menuitem" onClick={() => { setStatusAction('resolve'); setMoreOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50">Resolve Condition</button>}
                  {actions.includes('reopen') && <button role="menuitem" onClick={() => { setStatusAction('reopen'); setMoreOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50">Reopen Condition</button>}
                  {actions.includes('mark-entered-in-error') && <button role="menuitem" onClick={() => { setStatusAction('mark-entered-in-error'); setMoreOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50">Mark Entered in Error</button>}
                </div>
              )}
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800">Close</button>
        </div>
      </div>

      {statusAction && (
        <ConditionStatusDialog
          patientId={patientId}
          condition={condition}
          action={statusAction}
          onClose={() => setStatusAction(null)}
          onConfirmed={async () => { await onRefresh(); setStatusAction(null); onClose(); }}
        />
      )}
    </div>
  );
}
