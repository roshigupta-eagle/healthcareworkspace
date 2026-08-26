"use client";

import React, { useState } from 'react';
import { Modal } from '@/design-system/components';
import type { MedicationRecord } from '@/lib/medicationsStore';

export type LifecycleAction = 'hold' | 'resume' | 'discontinue' | 'correct' | 'mark-entered-in-error';

const COPY: Record<LifecycleAction, { title: string; description: string; confirmLabel: string; requiresReason: boolean; tone: string }> = {
  hold: { title: 'Place medication on hold?', description: 'The medication remains documented but is paused pending review.', confirmLabel: 'Place On Hold', requiresReason: true, tone: 'bg-amber-600 hover:bg-amber-700' },
  resume: { title: 'Resume medication?', description: 'This returns the medication to active status.', confirmLabel: 'Resume Medication', requiresReason: false, tone: 'bg-teal-700 hover:bg-teal-800' },
  discontinue: { title: 'Discontinue medication?', description: 'History is preserved. This does not delete the medication record.', confirmLabel: 'Discontinue Medication', requiresReason: true, tone: 'bg-rose-600 hover:bg-rose-700' },
  correct: { title: 'Correct medication record?', description: 'Document a correction reason. The prior state remains in history.', confirmLabel: 'Save Correction', requiresReason: true, tone: 'bg-teal-700 hover:bg-teal-800' },
  'mark-entered-in-error': { title: 'Mark medication entered in error?', description: 'This preserves the record in history but excludes it from active medication management.', confirmLabel: 'Mark Entered in Error', requiresReason: true, tone: 'bg-rose-600 hover:bg-rose-700' },
};

export default function MedicationActionDialog({
  patientId,
  medication,
  action,
  onClose,
  onConfirmed,
}: {
  patientId: string;
  medication: MedicationRecord;
  action: LifecycleAction;
  onClose: () => void;
  onConfirmed: () => Promise<void> | void;
}) {
  const [reason, setReason] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const copy = COPY[action];
  const needsEffectiveDate = action === 'hold' || action === 'discontinue';

  async function handleConfirm() {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const patch: Record<string, unknown> = { action, detail: reason.trim() || undefined };
      if (action === 'hold') {
        patch.status = 'on-hold';
        patch.holdReason = reason.trim() || undefined;
        patch.holdEffectiveDate = effectiveDate;
      } else if (action === 'resume') {
        patch.status = 'active';
      } else if (action === 'discontinue') {
        patch.status = 'stopped';
        patch.stopReason = reason.trim() || undefined;
        patch.stopEffectiveDate = effectiveDate;
      } else if (action === 'correct') {
        patch.instructions = medication.instructions ? `${medication.instructions} (corrected: ${reason.trim()})` : `Correction: ${reason.trim()}`;
      } else if (action === 'mark-entered-in-error') {
        patch.status = 'entered-in-error';
        patch.enteredInErrorReason = reason.trim() || undefined;
      }
      const res = await fetch(`/api/patients/${encodeURIComponent(patientId)}/medications/${encodeURIComponent(medication.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error('The change could not be saved.');
      await onConfirmed();
    } catch (err: any) {
      setErrorMsg(err?.message || 'We couldn\u2019t save this change. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open
      onClose={() => !submitting && onClose()}
      title={copy.title}
      description={copy.description}
      size="sm"
      footer={
        <>
          <button type="button" onClick={onClose} disabled={submitting} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            Cancel
          </button>
          <button type="button" onClick={handleConfirm} disabled={submitting} className={`rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 ${copy.tone}`}>
            {submitting ? 'Saving…' : copy.confirmLabel}
          </button>
        </>
      }
    >
      <div className="space-y-3 text-sm">
        {errorMsg && <div className="rounded-lg bg-rose-50 p-3 text-xs font-medium text-rose-800 ring-1 ring-rose-200">{errorMsg}</div>}
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
          <div className="font-semibold text-slate-900">{medication.name} {medication.dose ? `${medication.dose}${medication.unit || ''}` : ''}</div>
          <div className="text-xs text-slate-500 mt-0.5">{medication.prescribedBy ? `Prescribed by ${medication.prescribedBy}` : 'No prescriber documented'}</div>
        </div>
        {needsEffectiveDate && (
          <div>
            <label htmlFor="effective-date" className="block text-xs font-medium text-slate-600 mb-1">Effective date</label>
            <input id="effective-date" type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
          </div>
        )}
        {copy.requiresReason && (
          <div>
            <label htmlFor="action-reason" className="block text-xs font-medium text-slate-600 mb-1">Reason</label>
            <textarea
              id="action-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
              placeholder="e.g. Patient reported side effects, reviewed with patient"
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
