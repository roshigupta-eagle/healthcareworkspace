"use client";

import React, { useState } from 'react';
import type { ClinicalStatus, VerificationStatus } from '@/lib/conditionsStore';

const CATEGORIES = ['Cardiovascular', 'Diabetes Care', 'Respiratory', 'Musculoskeletal', 'Mental Health', 'Preventive Care', 'Other'];

export default function AddConditionDrawer({ patientId, onClose, onCreated }: { patientId: string; onClose: () => void; onCreated: () => Promise<void> | void }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [clinicalStatus, setClinicalStatus] = useState<ClinicalStatus>('active');
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('provisional');
  const [onsetDate, setOnsetDate] = useState('');
  const [managedBy, setManagedBy] = useState('');
  const [note, setNote] = useState('');
  const [showOptional, setShowOptional] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canSubmit = name.trim().length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/patients/${encodeURIComponent(patientId)}/conditions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          category: category || undefined,
          clinicalStatus,
          verificationStatus,
          onsetDate: onsetDate || undefined,
          managedBy: managedBy.trim() || undefined,
          note: note.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error('The condition could not be saved.');
      await onCreated();
    } catch (err: any) {
      setErrorMsg(err?.message || 'We couldn\u2019t save this condition. Your entries have been kept — please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-xs">
      <form onSubmit={handleSubmit} className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Add Condition</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-sm">
          {errorMsg && <div className="rounded-lg bg-rose-50 p-3 text-xs font-medium text-rose-800 ring-1 ring-rose-200">{errorMsg}</div>}

          <div>
            <label htmlFor="cond-name" className="block text-xs font-medium text-slate-600 mb-1">Condition name *</label>
            <input id="cond-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Hypertension" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
          </div>

          <div>
            <label htmlFor="cond-status" className="block text-xs font-medium text-slate-600 mb-1">Clinical status</label>
            <select id="cond-status" value={clinicalStatus} onChange={(e) => setClinicalStatus(e.target.value as ClinicalStatus)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="remission">Remission</option>
            </select>
          </div>

          <div>
            <label htmlFor="cond-verification" className="block text-xs font-medium text-slate-600 mb-1">Verification</label>
            <select id="cond-verification" value={verificationStatus} onChange={(e) => setVerificationStatus(e.target.value as VerificationStatus)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300">
              <option value="provisional">Provisional</option>
              <option value="confirmed">Confirmed</option>
              <option value="differential">Differential</option>
              <option value="unconfirmed">Unconfirmed</option>
            </select>
          </div>

          <div>
            <label htmlFor="cond-onset" className="block text-xs font-medium text-slate-600 mb-1">Onset date</label>
            <input id="cond-onset" type="date" value={onsetDate} onChange={(e) => setOnsetDate(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
          </div>

          <div>
            <label htmlFor="cond-owner" className="block text-xs font-medium text-slate-600 mb-1">Responsible clinician</label>
            <input id="cond-owner" value={managedBy} onChange={(e) => setManagedBy(e.target.value)} placeholder="e.g. Dr. Aris Thorne" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
          </div>

          <button type="button" onClick={() => setShowOptional((v) => !v)} className="text-xs font-semibold text-teal-700 hover:underline">
            {showOptional ? 'Hide optional fields' : 'Show optional fields (category, note)'}
          </button>

          {showOptional && (
            <div className="space-y-4 border-t border-slate-100 pt-4">
              <div>
                <label htmlFor="cond-category" className="block text-xs font-medium text-slate-600 mb-1">Category</label>
                <select id="cond-category" value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300">
                  <option value="">Not specified</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="cond-note" className="block text-xs font-medium text-slate-600 mb-1">Note</label>
                <textarea id="cond-note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 px-6 py-4 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} disabled={submitting} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
          <button type="submit" disabled={!canSubmit || submitting} className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50">{submitting ? 'Saving…' : 'Add Condition'}</button>
        </div>
      </form>
    </div>
  );
}
