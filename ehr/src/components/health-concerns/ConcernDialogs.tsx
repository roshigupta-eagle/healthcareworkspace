"use client";

import { useState } from 'react';
import type { HealthConcern } from '@/types/healthConcern';
import Modal from '@/components/doctor-notes/Modal';
import { AlertIcon } from '@/components/doctor-notes/Icons';

type BaseProps = {
  patientId: string;
  concern: HealthConcern;
  onClose: () => void;
  onSaved: (updated: HealthConcern) => void;
  onToast: (message: string, level?: 'success' | 'error' | 'info') => void;
};

export function ResolveConcernDialog({ patientId, concern, onClose, onSaved, onToast }: BaseProps) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/patients/${encodeURIComponent(patientId)}/health-concerns/${encodeURIComponent(concern.id)}/resolve`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reason, note }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || 'failed');
      onSaved(body);
      onToast('Health concern marked resolved.', 'success');
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Unable to resolve this concern.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title="Mark Resolved"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-2 text-sm font-medium rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button type="button" disabled={submitting} onClick={submit} className="px-4 py-2 text-sm font-semibold rounded-md bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-60">
            {submitting ? 'Saving…' : 'Confirm Resolved'}
          </button>
        </div>
      }
    >
      <p className="text-sm text-slate-600 mb-3">
        Resolving <span className="font-medium text-slate-800">{concern.term}</span> preserves its full history — it is never deleted.
      </p>
      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">RESOLUTION REASON (OPTIONAL)</label>
      <input value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200" />
      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mt-3 mb-1.5">NOTE (OPTIONAL)</label>
      <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200" />
    </Modal>
  );
}

export function ReopenConcernDialog({ patientId, concern, onClose, onSaved, onToast }: BaseProps) {
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/patients/${encodeURIComponent(patientId)}/health-concerns/${encodeURIComponent(concern.id)}/reopen`, { method: 'POST' });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || 'failed');
      onSaved(body);
      onToast('Health concern reopened.', 'success');
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Unable to reopen this concern.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title="Reopen Concern"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-2 text-sm font-medium rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button type="button" disabled={submitting} onClick={submit} className="px-4 py-2 text-sm font-semibold rounded-md bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-60">
            {submitting ? 'Saving…' : 'Reopen'}
          </button>
        </div>
      }
    >
      <p className="text-sm text-slate-600">
        Reopen <span className="font-medium text-slate-800">{concern.term}</span> and set its clinical status back to active? History is preserved.
      </p>
    </Modal>
  );
}

export function ConcernEnteredInErrorDialog({ patientId, concern, onClose, onSaved, onToast }: BaseProps) {
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!reason.trim() || !confirmed) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/patients/${encodeURIComponent(patientId)}/health-concerns/${encodeURIComponent(concern.id)}/entered-in-error`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || 'failed');
      onSaved(body);
      onToast('Concern marked entered in error.', 'success');
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Unable to update this concern.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title="Mark Entered in Error"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-2 text-sm font-medium rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button type="button" disabled={submitting || !reason.trim() || !confirmed} onClick={submit} className="px-4 py-2 text-sm font-semibold rounded-md bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50">
            {submitting ? 'Saving…' : 'Mark Entered in Error'}
          </button>
        </div>
      }
    >
      <div className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 mb-3">
        <AlertIcon size={16} className="text-rose-600 mt-0.5" />
        <p className="text-sm text-rose-700">This preserves the concern and its history — it is never deleted.</p>
      </div>
      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Reason (required)</label>
      <input value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200" />
      <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="rounded border-slate-300 text-rose-600 focus:ring-rose-400" />
        I confirm this concern should be marked entered in error.
      </label>
    </Modal>
  );
}
