"use client";

import React, { useState } from 'react';
import type { MedicationRecord } from '@/lib/medicationsStore';

export default function ModifyPrescriptionDrawer({
  patientId,
  medication,
  onClose,
  onSaved,
}: {
  patientId: string;
  medication: MedicationRecord;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [dose, setDose] = useState(medication.dose || '');
  const [unit, setUnit] = useState(medication.unit || '');
  const [frequency, setFrequency] = useState(medication.frequency || '');
  const [instructions, setInstructions] = useState(medication.instructions || '');
  const [reason, setReason] = useState('');
  const [step, setStep] = useState<'edit' | 'review'>('edit');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const hasChange = dose !== (medication.dose || '') || unit !== (medication.unit || '') || frequency !== (medication.frequency || '') || instructions !== (medication.instructions || '');

  async function handleConfirm() {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/patients/${encodeURIComponent(patientId)}/medications/${encodeURIComponent(medication.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'modified', detail: reason.trim() || undefined, dose, unit, frequency, instructions }),
      });
      if (!res.ok) throw new Error('The prescription change could not be saved.');
      await onSaved();
    } catch (err: any) {
      setErrorMsg(err?.message || 'We couldn\u2019t save this change. Your entries have been kept — please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-xs">
      <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Modify Prescription</h2>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {step === 'edit' ? (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-sm">
              {errorMsg && <div className="rounded-lg bg-rose-50 p-3 text-xs font-medium text-rose-800 ring-1 ring-rose-200">{errorMsg}</div>}
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="font-semibold text-slate-900">{medication.name}</div>
                <div className="text-xs text-slate-500 mt-0.5">Current: {medication.dose ? `${medication.dose}${medication.unit || ''}` : '—'} · {medication.frequency || '—'}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="mod-dose" className="block text-xs font-medium text-slate-600 mb-1">Dose</label>
                  <input id="mod-dose" value={dose} onChange={(e) => setDose(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
                </div>
                <div>
                  <label htmlFor="mod-unit" className="block text-xs font-medium text-slate-600 mb-1">Unit</label>
                  <input id="mod-unit" value={unit} onChange={(e) => setUnit(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
                </div>
              </div>
              <div>
                <label htmlFor="mod-freq" className="block text-xs font-medium text-slate-600 mb-1">Frequency</label>
                <input id="mod-freq" value={frequency} onChange={(e) => setFrequency(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
              </div>
              <div>
                <label htmlFor="mod-instructions" className="block text-xs font-medium text-slate-600 mb-1">Instructions</label>
                <textarea id="mod-instructions" value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
              </div>
              <div>
                <label htmlFor="mod-reason" className="block text-xs font-medium text-slate-600 mb-1">Reason for change</label>
                <textarea id="mod-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" placeholder="e.g. Dose titration following review" />
              </div>
            </div>
            <div className="border-t border-slate-100 px-6 py-4 flex items-center justify-end gap-2">
              <button onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
              <button disabled={!hasChange} onClick={() => setStep('review')} className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50">Review Change</button>
            </div>
          </>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-sm">
              {errorMsg && <div className="rounded-lg bg-rose-50 p-3 text-xs font-medium text-rose-800 ring-1 ring-rose-200">{errorMsg}</div>}
              <div className="rounded-xl bg-teal-50 border border-teal-100 p-3 text-teal-800 text-xs font-medium">Confirm this prescription change before saving.</div>
              <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-100 p-3">
                <div>
                  <div className="text-xs text-slate-400 mb-1">Current</div>
                  <div className="font-medium text-slate-900">{medication.dose ? `${medication.dose}${medication.unit || ''}` : '—'}</div>
                  <div className="text-slate-600">{medication.frequency || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">Proposed</div>
                  <div className="font-medium text-teal-800">{dose ? `${dose}${unit}` : '—'}</div>
                  <div className="text-teal-700">{frequency || '—'}</div>
                </div>
              </div>
              {reason.trim() && <div><div className="text-xs text-slate-400 mb-1">Reason</div><p className="text-slate-800">{reason}</p></div>}
            </div>
            <div className="border-t border-slate-100 px-6 py-4 flex items-center justify-end gap-2">
              <button onClick={() => setStep('edit')} disabled={submitting} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Back</button>
              <button onClick={handleConfirm} disabled={submitting} className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50">{submitting ? 'Saving…' : 'Confirm Change'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
