"use client";
import React, { useState } from 'react';
import type { Task, LabResult, TaskNote } from '../../lib/clinicalTypes';
import { mockLabResults } from '../../lib/mockClinicalData';
import { formatDateTimeConsistent } from '@/lib/formatDate';

type Props = {
  task: Task | null;
  onMarkComplete?: (id: string) => void;
  onDelegate?: (id: string) => void;
  onOpenResults?: (id?: string | null) => void;
  onSaveNote?: (taskId: string, body: string) => void;
};

export default function TaskDetailPanel({ task, onMarkComplete, onDelegate, onOpenResults, onSaveNote }: Props) {
  const [noteBody, setNoteBody] = useState('');
  if (!task) {
    return (
      <aside className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-[80vh]">
        <div className="text-slate-500">Select a task to see details</div>
      </aside>
    );
  }

  const relatedResults: LabResult[] = mockLabResults.filter((r) => r.id === task.relatedLabResultId);

  return (
    <aside className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-[80vh] overflow-auto">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-900">{task.title}</h2>
            {task.priority === 'high' || task.priority === 'critical' ? (
              <div className="text-xs px-2 py-1 rounded-full bg-rose-100 text-rose-700 font-semibold">High Priority</div>
            ) : null}
          </div>
          <div className="text-sm text-slate-500">{task.patient ? `${task.patient.givenName} ${task.patient.familyName} · MRN ${task.patient.mrn ?? ''}` : ''}</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onOpenResults?.(task.relatedLabResultId)} className="px-3 py-1 inline-flex items-center gap-2 bg-white border border-gray-200 rounded-md text-sm">Open Results</button>
          <button onClick={() => onMarkComplete?.(task.id)} className="px-3 py-1 inline-flex items-center gap-2 bg-sky-600 text-white rounded-md text-sm">Mark Complete</button>
          <button onClick={() => onDelegate?.(task.id)} className="px-3 py-1 inline-flex items-center gap-2 bg-white border border-gray-200 rounded-md text-sm">Delegate</button>
          <div className="relative">
            <button className="px-2 py-1 rounded text-slate-500">⋯</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <div className="md:col-span-2 space-y-4">
          <div className="bg-slate-50 rounded-lg p-4 border">
            <div className="text-xs text-slate-500 font-semibold">Task metadata</div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div><div className="text-xs text-slate-400">Due</div><div className="text-sm text-slate-900">{task.dueAt ?? '—'}</div></div>
              <div><div className="text-xs text-slate-400">Created</div><div className="text-sm text-slate-900">{task.createdAt}</div></div>
              <div><div className="text-xs text-slate-400">Created by</div><div className="text-sm text-slate-900">{task.createdBy}</div></div>
              <div><div className="text-xs text-slate-400">Category</div><div className="text-sm text-slate-900">{task.category ?? 'General'}</div></div>
              <div><div className="text-xs text-slate-400">Task ID</div><div className="text-sm text-slate-900">{task.id}</div></div>
              <div><div className="text-xs text-slate-400">Priority</div><div className="text-sm text-slate-900">{task.priority}</div></div>
            </div>
          </div>

          { (task.priority === 'high' || task.priority === 'critical') && (
            <div className="bg-white border rounded-lg p-4">
              <div className="text-xs font-medium">Why this is high priority</div>
              <div className="mt-2 text-sm text-slate-700">
                {task.priority === 'critical'
                  ? 'Critical lab values require provider review and follow up.'
                  : 'This task has been marked high priority and needs timely attention.'}
              </div>
              <div className="mt-3 text-sm"><a className="text-sky-600" href="#">View guideline</a></div>
            </div>
          )}

          <div className="bg-white border rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Abnormal Results</div>
              <div className="text-xs text-slate-400">{relatedResults.length} shown</div>
            </div>

            {relatedResults.length === 0 && <div className="text-xs text-slate-400 mt-2">No abnormal results attached to this task.</div>}
            {relatedResults.length > 0 && (
              <table className="w-full text-sm mt-3 table-fixed">
                <thead>
                  <tr className="text-left text-xs text-slate-500">
                    <th className="w-1/3">Test</th>
                    <th className="w-1/4">Result</th>
                    <th className="w-1/4">Reference</th>
                    <th className="w-1/4">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {relatedResults.map((r) => (
                    <tr key={r.id} className={`border-t ${r.abnormal ? 'bg-rose-50' : ''}`}>
                      <td className="py-2 font-medium">{r.test}</td>
                      <td className="py-2 font-semibold">{r.value} {r.unit} {r.abnormal ? <span className="text-rose-600 text-xs ml-2">High</span> : null}</td>
                      <td className="py-2 text-xs text-slate-500">{r.referenceRange}</td>
                      <td className="py-2 text-xs text-slate-400">{formatDateTimeConsistent(r.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="bg-white border rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Notes</div>
              <div className="text-xs text-slate-400">{task.notes?.length ?? 0} notes</div>
            </div>
            <div className="mt-2">
              <textarea value={noteBody} onChange={(e) => setNoteBody(e.target.value)} rows={4} className="w-full border rounded p-2 text-sm" placeholder="Add a note..." />
              <div className="mt-2 flex items-center gap-2 justify-end">
                <button onClick={() => setNoteBody('')} className="px-3 py-1 border rounded">Cancel</button>
                <button onClick={() => { if (noteBody.trim()) { onSaveNote?.(task.id, noteBody.trim()); setNoteBody(''); } }} className="px-3 py-1 bg-sky-600 text-white rounded">Save Note</button>
              </div>
            </div>
          </div>

        </div>

        <div className="space-y-4">
          <div className="bg-white border rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Patient snapshot</div>
              <div className="text-xs text-sky-600">View full chart →</div>
            </div>
            <div className="mt-2 text-xs text-slate-500">Problems, Medications, Allergies</div>
            <div className="mt-3 text-sm">
              <div><strong>Problems:</strong> Hypertension</div>
              <div><strong>Medications:</strong> Metformin 500mg, Lisinopril 10mg</div>
              <div><strong>Allergies:</strong> Penicillin</div>
              <div className="mt-2 text-xs text-slate-400">Last visit • Aug 6, 2025 • Office Visit • Dr. Sarah Kim</div>
            </div>
          </div>

          <div className="bg-white border rounded-lg p-3">
            <div className="text-sm font-medium">Activity</div>
            <div className="mt-2 space-y-2 text-sm text-slate-600">
              {task.activity?.map((a) => (
                <div key={a.id} className="flex items-start gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs">{a.actorId ? a.actorId.slice(0,2).toUpperCase() : 'SY'}</div>
                  <div>
                    <div className="text-xs text-slate-500">{formatDateTimeConsistent(a.createdAt)}</div>
                    <div className="text-sm text-slate-900">{a.detail}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 text-xs text-slate-400"><a href="#">Show more activity</a></div>
          </div>

          <div className="text-xs text-slate-400">All task actions are logged and auditable.</div>
        </div>
      </div>
    </aside>
  );
}
