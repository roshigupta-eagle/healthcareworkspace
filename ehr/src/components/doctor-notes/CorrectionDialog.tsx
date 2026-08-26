"use client";

import { useState } from 'react';
import type { DoctorNote, DoctorNoteSection } from '@/types/doctorNote';
import Modal from './Modal';

type Props = {
  patientId: string;
  note: DoctorNote;
  onClose: () => void;
  onSaved: (note: DoctorNote) => void;
  onToast: (message: string, level?: 'success' | 'error' | 'info') => void;
};

export default function CorrectionDialog({ patientId, note, onClose, onSaved, onToast }: Props) {
  const [sections, setSections] = useState<DoctorNoteSection[]>(note.sections.map((s) => ({ ...s })));
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!reason.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/patients/${encodeURIComponent(patientId)}/notes/${encodeURIComponent(note.id)}/correction`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sections, reason }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || 'failed');
      onSaved(body);
      onToast('Correction recorded.', 'success');
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Unable to record correction.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title="Correct Note"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-2 text-sm font-medium rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button type="button" disabled={submitting || !reason.trim()} onClick={submit} className="px-4 py-2 text-sm font-semibold rounded-md bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-60">
            {submitting ? 'Saving…' : 'Save Correction'}
          </button>
        </div>
      }
    >
      <p className="text-sm text-slate-600 mb-3">The original signed content is preserved in version history. This creates a corrected version with a required reason.</p>
      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
        {sections.map((s, i) => (
          <div key={i}>
            {s.heading && <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">{s.heading}</div>}
            <textarea
              value={s.body}
              onChange={(e) => setSections((prev) => prev.map((p, idx) => (idx === i ? { ...p, body: e.target.value } : p)))}
              rows={3}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200"
            />
          </div>
        ))}
      </div>
      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mt-3 mb-1.5">REASON FOR CORRECTION (REQUIRED)</label>
      <input value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200" />
    </Modal>
  );
}
