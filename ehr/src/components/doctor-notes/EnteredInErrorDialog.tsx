"use client";

import { useState } from 'react';
import type { DoctorNote } from '@/types/doctorNote';
import Modal from './Modal';
import { AlertIcon } from './Icons';

type Props = {
  patientId: string;
  note: DoctorNote;
  onClose: () => void;
  onSaved: (note: DoctorNote) => void;
  onToast: (message: string, level?: 'success' | 'error' | 'info') => void;
};

export default function EnteredInErrorDialog({ patientId, note, onClose, onSaved, onToast }: Props) {
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!reason.trim() || !confirmed) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/patients/${encodeURIComponent(patientId)}/notes/${encodeURIComponent(note.id)}/entered-in-error`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || 'failed');
      onSaved(body);
      onToast('Note marked entered in error.', 'success');
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Unable to update this note.', 'error');
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
          <button
            type="button"
            disabled={submitting || !reason.trim() || !confirmed}
            onClick={submit}
            className="px-4 py-2 text-sm font-semibold rounded-md bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Mark Entered in Error'}
          </button>
        </div>
      }
    >
      <div className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 mb-3">
        <AlertIcon size={16} className="text-rose-600 mt-0.5" />
        <p className="text-sm text-rose-700">This preserves the note and its full history — it is never deleted. The record will be clearly flagged as entered in error.</p>
      </div>
      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">REASON (REQUIRED)</label>
      <input value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200" />
      <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="rounded border-slate-300 text-rose-600 focus:ring-rose-400" />
        I confirm this note should be marked entered in error.
      </label>
    </Modal>
  );
}
