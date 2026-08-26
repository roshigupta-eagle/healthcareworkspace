"use client";

import { useState } from 'react';
import type { HealthConcern } from '@/types/healthConcern';
import type { ClinicalTask } from '@/types/clinicalTask';
import Drawer from '@/components/doctor-notes/Drawer';
import { formatConcernDate } from './constants';

type Props = {
  patientId: string;
  concern: HealthConcern;
  existingTask: ClinicalTask | null;
  onClose: () => void;
  onCreated: (task: ClinicalTask, updatedConcern: HealthConcern) => void;
  onCompleted: (task: ClinicalTask) => void;
  onToast: (message: string, level?: 'success' | 'error' | 'info') => void;
};

export default function ConcernFollowUpDrawer({ patientId, concern, existingTask, onClose, onCreated, onCompleted, onToast }: Props) {
  const [title, setTitle] = useState(`Follow up: ${concern.term}`);
  const [assignee, setAssignee] = useState(concern.responsibleProvider?.name || '');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<'routine' | 'normal' | 'high' | 'urgent'>('normal');
  const [instructions, setInstructions] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (existingTask) {
    const isComplete = existingTask.status === 'completed';
    return (
      <Drawer title="Follow-Up Task" subtitle={concern.term} onClose={onClose}>
        <div className="space-y-3 text-sm text-slate-700">
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
            <div className="font-semibold text-slate-900">{existingTask.title}</div>
            {existingTask.description && <p className="mt-1 text-slate-600">{existingTask.description}</p>}
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500">
              <div>Assignee: <span className="font-medium text-slate-700">{existingTask.assignee?.name || '—'}</span></div>
              <div>Priority: <span className="font-medium text-slate-700 capitalize">{existingTask.priority}</span></div>
              <div>Due: <span className="font-medium text-slate-700">{existingTask.dueDate ? formatConcernDate(existingTask.dueDate) : '—'}</span></div>
              <div>
                Status: <span className={`font-medium ${isComplete ? 'text-emerald-700' : 'text-amber-700'}`}>{isComplete ? 'Completed' : 'Open'}</span>
              </div>
            </div>
          </div>
          {!isComplete && (
            <button
              type="button"
              disabled={submitting}
              onClick={async () => {
                setSubmitting(true);
                try {
                  const res = await fetch(`/api/patients/${encodeURIComponent(patientId)}/health-concerns/follow-up-tasks/${encodeURIComponent(existingTask.id)}`, {
                    method: 'PATCH',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ status: 'completed' }),
                  });
                  if (!res.ok) throw new Error('failed');
                  const updated: ClinicalTask = await res.json();
                  onCompleted(updated);
                  onToast('Follow-up task marked complete.', 'success');
                } catch {
                  onToast('Unable to update the follow-up task.', 'error');
                } finally {
                  setSubmitting(false);
                }
              }}
              className="w-full rounded-md bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {submitting ? 'Updating…' : 'Mark Complete'}
            </button>
          )}
        </div>
      </Drawer>
    );
  }

  return (
    <Drawer
      title="Create Follow-Up"
      subtitle={concern.term}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-2 text-sm font-medium rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting || !title.trim()}
            onClick={async () => {
              setSubmitting(true);
              try {
                const res = await fetch(`/api/patients/${encodeURIComponent(patientId)}/health-concerns/${encodeURIComponent(concern.id)}/follow-up`, {
                  method: 'POST',
                  headers: { 'content-type': 'application/json' },
                  body: JSON.stringify({ title, assignee, dueDate: dueDate || undefined, priority, instructions }),
                });
                if (!res.ok) throw new Error('failed');
                const body = await res.json();
                onCreated(body.task, body.concern);
                onToast('Follow-up task created.', 'success');
              } catch {
                onToast('Unable to create the follow-up task.', 'error');
              } finally {
                setSubmitting(false);
              }
            }}
            className="px-4 py-2 text-sm font-semibold rounded-md bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-60"
          >
            {submitting ? 'Creating…' : 'Create Task'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Task</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200" />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Assignee</label>
          <input value={assignee} onChange={(e) => setAssignee(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Due Date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200">
              <option value="routine">Routine</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Instructions</label>
          <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={4} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200" />
        </div>
      </div>
    </Drawer>
  );
}
