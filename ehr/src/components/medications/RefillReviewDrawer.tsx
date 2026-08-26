"use client";

import React, { useState } from 'react';
import type { MedicationRecord } from '@/lib/medicationsStore';
import type { PatientSafetyResult } from '@/lib/medicationSafetyStore';
import { formatDoseLine, medicationSafetyStatus, alertsForMedication } from '@/lib/medications';

type RefillDecision = 'approve' | 'decline' | 'more-info';

export default function RefillReviewDrawer({
  patientId,
  medication,
  safety,
  onClose,
  onResolved,
}: {
  patientId: string;
  medication: MedicationRecord;
  safety: PatientSafetyResult | null;
  onClose: () => void;
  onResolved: () => Promise<void> | void;
}) {
  const [decision, setDecision] = useState<RefillDecision | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const alerts = alertsForMedication(safety, medication.id);
  const safetyLevel = medicationSafetyStatus(safety, medication.id);

  async function handleConfirm() {
    if (!decision) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const patch: Record<string, unknown> = {};
      let action = '';
      if (decision === 'approve') {
        action = 'renewed';
        const now = new Date();
        patch.refillsRemaining = medication.refillsAuthorized ?? (medication.refillsRemaining || 0) + 1;
        patch.lastRefillDate = now.toISOString().slice(0, 10);
        const next = new Date(now);
        next.setDate(next.getDate() + (medication.daysSupply || 30));
        patch.nextEligibleRefillDate = next.toISOString().slice(0, 10);
      } else if (decision === 'decline') {
        action = 'refill-declined';
      } else {
        action = 'refill-more-info-requested';
      }
      const res = await fetch(`/api/patients/${encodeURIComponent(patientId)}/medications/${encodeURIComponent(medication.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, detail: note.trim() || undefined, ...patch }),
      });
      if (!res.ok) throw new Error('The refill decision could not be saved.');
      await onResolved();
    } catch (err: any) {
      setErrorMsg(err?.message || 'We couldn\u2019t save this decision. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-xs">
      <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Review Refill</h2>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-sm">
          {errorMsg && <div className="rounded-lg bg-rose-50 p-3 text-xs font-medium text-rose-800 ring-1 ring-rose-200">{errorMsg}</div>}

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <div className="text-lg font-bold text-slate-900">{medication.name}</div>
            <div className="text-sm text-slate-600 mt-0.5">{formatDoseLine(medication)}</div>
            <div className="text-xs text-slate-500 mt-1">{medication.instructions || 'No instructions documented'}</div>
          </div>

          <dl className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-xs">
            <div><dt className="text-slate-400">Refills remaining</dt><dd className="font-medium text-slate-900">{medication.refillsRemaining ?? '—'}</dd></div>
            <div><dt className="text-slate-400">Last refill</dt><dd className="font-medium text-slate-900">{medication.lastRefillDate || '—'}</dd></div>
            <div><dt className="text-slate-400">Days supply</dt><dd className="font-medium text-slate-900">{medication.daysSupply ? `${medication.daysSupply} days` : '—'}</dd></div>
            <div><dt className="text-slate-400">Pharmacy</dt><dd className="font-medium text-slate-900">{medication.pharmacy || '—'}</dd></div>
          </dl>

          <div className={`rounded-xl p-3 text-xs font-medium ${safetyLevel === 'clear' ? 'bg-emerald-50 text-emerald-800' : safetyLevel === 'unavailable' ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-800'}`}>
            {safetyLevel === 'clear' && 'No recognized safety conflicts from available current data.'}
            {safetyLevel === 'unavailable' && 'Safety checks unavailable — review manually before approving.'}
            {(safetyLevel === 'review' || safetyLevel === 'critical') && (alerts[0]?.message || 'Safety review recommended before approving.')}
          </div>

          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Decision</h3>
            <div className="grid grid-cols-1 gap-2">
              {([
                ['approve', 'Approve Renewal'],
                ['modify', 'Modify Prescription Instead'],
                ['decline', 'Decline Request'],
                ['more-info', 'Request More Information'],
              ] as const).map(([key, label]) =>
                key === 'modify' ? null : (
                  <label key={key} className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer ${decision === key ? 'border-teal-300 bg-teal-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <input type="radio" name="refill-decision" checked={decision === key} onChange={() => setDecision(key as RefillDecision)} className="text-teal-600 focus:ring-teal-400" />
                    <span className="font-medium text-slate-800">{label}</span>
                  </label>
                ),
              )}
            </div>
          </div>

          <div>
            <label htmlFor="refill-note" className="block text-xs font-medium text-slate-600 mb-1">Note (optional)</label>
            <textarea id="refill-note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
          </div>
        </div>

        <div className="border-t border-slate-100 px-6 py-4 flex items-center justify-end gap-2">
          <button onClick={onClose} disabled={submitting} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
          <button onClick={handleConfirm} disabled={!decision || submitting} className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50">{submitting ? 'Saving…' : 'Confirm Decision'}</button>
        </div>
      </div>
    </div>
  );
}
