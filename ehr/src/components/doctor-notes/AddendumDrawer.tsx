"use client";

import { useState } from 'react';
import type { DoctorNote } from '@/types/doctorNote';
import Drawer from './Drawer';

type Props = {
  patientId: string;
  note: DoctorNote;
  onClose: () => void;
  onSaved: (note: DoctorNote) => void;
  onToast: (message: string, level?: 'success' | 'error' | 'info') => void;
};

export default function AddendumDrawer({ patientId, note, onClose, onSaved, onToast }: Props) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/patients/${encodeURIComponent(patientId)}/notes/${encodeURIComponent(note.id)}/addendum`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || 'failed');
      onSaved(body);
      onToast('Addendum added.', 'success');
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Unable to add addendum.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Drawer
      title="Add Addendum"
      subtitle="The original note remains unchanged; this text is appended below it."
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-2 text-sm font-medium rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button type="button" disabled={submitting || !text.trim()} onClick={submit} className="px-4 py-2 text-sm font-semibold rounded-md bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-60">
            {submitting ? 'Saving…' : 'Add Addendum'}
          </button>
        </div>
      }
    >
      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">ADDENDUM TEXT</label>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200" />
    </Drawer>
  );
}
