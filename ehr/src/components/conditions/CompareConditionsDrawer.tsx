"use client";

import React from 'react';
import type { ConditionRecord } from '@/lib/conditionsStore';
import { clinicalStatusLabel, verificationLabel, careGapsForCondition, tasksForCondition, type CareGapItem, type TaskItem } from '@/lib/conditions';

function formatDate(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
}

function Column({ condition, careGaps, tasks }: { condition: ConditionRecord; careGaps: CareGapItem[]; tasks: TaskItem[] }) {
  const rows: [string, React.ReactNode][] = [
    ['Status', clinicalStatusLabel(condition.clinicalStatus)],
    ['Verification', verificationLabel(condition.verificationStatus)],
    ['Onset', formatDate(condition.onsetDate)],
    ['Last Reviewed', formatDate(condition.lastReviewed)],
    ['Responsible Clinician', condition.managedBy || 'Not documented'],
    ['Open Tasks', String(tasksForCondition(condition, tasks).length)],
    ['Care Gaps', String(careGapsForCondition(condition, careGaps).length)],
    ['Care Plan', 'No care plan documented'],
  ];
  return (
    <div className="flex-1 min-w-0 rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
      <h3 className="font-bold text-slate-900 truncate mb-3">{condition.name}</h3>
      <dl className="space-y-2.5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-2 text-xs">
            <dt className="text-slate-400 flex-shrink-0">{label}</dt>
            <dd className="font-medium text-slate-900 text-right">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function CompareConditionsDrawer({
  conditions,
  careGaps,
  tasks,
  onClose,
}: {
  conditions: [ConditionRecord, ConditionRecord];
  careGaps: CareGapItem[];
  tasks: TaskItem[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-xs">
      <div className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
        <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Compare Conditions</h2>
            <p className="text-xs text-slate-500 mt-0.5">A side-by-side view of documented facts — not a severity ranking.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex gap-4">
            <Column condition={conditions[0]} careGaps={careGaps} tasks={tasks} />
            <Column condition={conditions[1]} careGaps={careGaps} tasks={tasks} />
          </div>
        </div>
        <div className="border-t border-slate-100 px-6 py-4 flex justify-end">
          <button onClick={onClose} className="rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800">Close</button>
        </div>
      </div>
    </div>
  );
}
