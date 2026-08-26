"use client";

import React, { useState } from 'react';
import { Modal } from '@/design-system/components';
import type { ConditionRecord } from '@/lib/conditionsStore';

export type StatusAction = 'resolve' | 'reopen' | 'mark-entered-in-error';

const COPY: Record<StatusAction, { title: string; description: string; confirmLabel: string; requiresReason: boolean; tone: string }> = {
  resolve: { title: 'Resolve condition?', description: 'This marks the condition as resolved. History is preserved.', confirmLabel: 'Resolve Condition', requiresReason: true, tone: 'bg-emerald-600 hover:bg-emerald-700' },
  reopen: { title: 'Reopen condition?', description: 'This returns the condition to active management.', confirmLabel: 'Reopen Condition', requiresReason: false, tone: 'bg-teal-700 hover:bg-teal-800' },
  'mark-entered-in-error': { title: 'Mark condition entered in error?', description: 'This preserves the record in history but excludes it from active clinical management.', confirmLabel: 'Mark Entered in Error', requiresReason: true, tone: 'bg-rose-600 hover:bg-rose-700' },
};

export default function ConditionStatusDialog({
  patientId,
  condition,
  action,
  onClose,
  onConfirmed,
}: {
  patientId: string;
  condition: ConditionRecord;
  action: StatusAction;
  onClose: () => void;
  onConfirmed: () => Promise<void> | void;
}) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const copy = COPY[action];

  async function handleConfirm() {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const patch: Record<string, unknown> = { action };
      if (action === 'resolve') {
        patch.clinicalStatus = 'resolved';
        patch.resolvedDate = new Date().toISOString().slice(0, 10);
        patch.resolvedReason = reason.trim() || undefined;
      } else if (action === 'reopen') {
        patch.clinicalStatus = 'active';
      } else if (action === 'mark-entered-in-error') {
        patch.clinicalStatus = 'entered-in-error';
        patch.verificationStatus = 'entered-in-error';
        patch.enteredInErrorReason = reason.trim() || undefined;
      }
      const res = await fetch(`/api/patients/${encodeURIComponent(patientId)}/conditions/${encodeURIComponent(condition.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error('The update could not be saved.');
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
        {errorMsg && <div className="rounded-lg bg-rose-50 p-3 text-xs font-medium text-rose-800 ring-1 ring-rose-200">We couldn&apos;t save this condition. Your information has been preserved. {errorMsg}</div>}
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
          <div className="font-semibold text-slate-900">{condition.name}</div>
          <div className="text-xs text-slate-500 mt-0.5">{condition.managedBy ? `Managed by ${condition.managedBy}` : 'No owner documented'}</div>
        </div>
        {copy.requiresReason && (
          <div>
            <label htmlFor="status-reason" className="block text-xs font-medium text-slate-600 mb-1">Reason{action === 'resolve' ? ' (optional)' : ''}</label>
            <textarea
              id="status-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
              placeholder={action === 'resolve' ? 'e.g. Condition managed and resolved' : 'e.g. Duplicate entry, documented in error'}
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
