"use client";

import React, { useState } from 'react';
import { Modal } from '@/design-system/components';
import type { LogMeasurement } from '@/lib/weightLog';

export default function MarkEnteredInErrorDialog({
  patientId,
  measurement,
  onClose,
  onConfirmed,
}: {
  patientId: string;
  measurement: LogMeasurement;
  onClose: () => void;
  onConfirmed: () => Promise<void> | void;
}) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleConfirm() {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch(
        `/api/patients/${encodeURIComponent(patientId)}/measurements/weight/${encodeURIComponent(measurement.id)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enteredInError: true, status: 'entered-in-error', enteredInErrorReason: reason.trim() || undefined }),
        }
      );
      if (!res.ok) throw new Error('Failed to update measurement status');
      await onConfirmed();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to mark this measurement entered in error.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open
      onClose={() => !submitting && onClose()}
      title="Mark measurement entered in error?"
      description="This preserves the record in history but excludes it from clinical analytics."
      size="sm"
      footer={
        <>
          <button type="button" onClick={onClose} disabled={submitting} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            Cancel
          </button>
          <button type="button" onClick={handleConfirm} disabled={submitting} className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50">
            {submitting ? 'Marking…' : 'Mark Entered in Error'}
          </button>
        </>
      }
    >
      <div className="space-y-3 text-sm">
        {errorMsg && <div className="rounded-lg bg-rose-50 p-3 text-xs font-medium text-rose-800 ring-1 ring-rose-200">{errorMsg}</div>}
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
          <div className="text-lg font-bold text-slate-900">{measurement.value} {measurement.unit || 'kg'}</div>
          <div className="text-xs text-slate-500 mt-0.5">
            {new Date(measurement.occurredAt).toLocaleString(undefined, { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="text-xs text-slate-500 capitalize mt-0.5">{measurement.source?.replace('-', ' ') || 'Clinic'}</div>
        </div>
        <div>
          <label htmlFor="error-reason" className="block text-xs font-medium text-slate-600 mb-1">Reason</label>
          <textarea
            id="error-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
            placeholder="e.g. Duplicate entry, incorrect unit"
          />
        </div>
      </div>
    </Modal>
  );
}
