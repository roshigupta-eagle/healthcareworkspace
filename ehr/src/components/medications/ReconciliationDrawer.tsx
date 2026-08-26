"use client";

import React, { useState } from 'react';
import type { MedicationRecord } from '@/lib/medicationsStore';
import { medicationStatusLabel, sourceLabel, formatDoseLine } from '@/lib/medications';

type Decision = 'confirm' | 'not-taking' | 'discontinue' | 'keep' | null;

export default function ReconciliationDrawer({
  patientId,
  medications,
  onClose,
  onCompleted,
}: {
  patientId: string;
  medications: MedicationRecord[];
  onClose: () => void;
  onCompleted: () => Promise<void> | void;
}) {
  const active = medications.filter((m) => m.status === 'active' || m.status === 'on-hold');
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [step, setStep] = useState<'review' | 'summary'>('review');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function setDecision(id: string, d: Decision) {
    setDecisions((prev) => ({ ...prev, [id]: d }));
  }

  const confirmed = active.filter((m) => decisions[m.id] === 'confirm').length;
  const updated = active.filter((m) => decisions[m.id] === 'keep').length;
  const stopped = active.filter((m) => decisions[m.id] === 'discontinue' || decisions[m.id] === 'not-taking').length;
  const unresolved = active.filter((m) => !decisions[m.id]).length;

  async function handleComplete() {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const toDiscontinue = active.filter((m) => decisions[m.id] === 'discontinue' || decisions[m.id] === 'not-taking');
      for (const m of toDiscontinue) {
        await fetch(`/api/patients/${encodeURIComponent(patientId)}/medications/${encodeURIComponent(m.id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reconciled-stopped', status: 'stopped', stopReason: decisions[m.id] === 'not-taking' ? 'Patient reported not taking' : 'Discontinued during reconciliation' }),
        });
      }
      const res = await fetch(`/api/patients/${encodeURIComponent(patientId)}/medication-reconciliation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmed, updated, stopped, unresolved }),
      });
      if (!res.ok) throw new Error('Reconciliation could not be saved.');
      await onCompleted();
    } catch (err: any) {
      setErrorMsg(err?.message || 'We couldn\u2019t complete reconciliation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-xs">
      <div className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
        <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Reconcile Medications</h2>
            <p className="text-xs text-slate-500 mt-0.5">Review each medication and record an explicit decision.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {step === 'review' ? (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-3 text-sm">
              {errorMsg && <div className="rounded-lg bg-rose-50 p-3 text-xs font-medium text-rose-800 ring-1 ring-rose-200">{errorMsg}</div>}
              {active.length === 0 && <p className="text-slate-400 italic">No current medications to reconcile.</p>}
              {active.map((m) => (
                <div key={m.id} className="rounded-xl border border-slate-100 p-3.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <div className="font-semibold text-slate-900">{m.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{formatDoseLine(m)} · {medicationStatusLabel(m.status)} · {sourceLabel(m.source)}</div>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {([
                        ['confirm', 'Confirm Current'],
                        ['not-taking', 'Mark Not Taking'],
                        ['discontinue', 'Discontinue'],
                        ['keep', 'Keep as Documented'],
                      ] as [Decision, string][]).map(([key, label]) => (
                        <button
                          key={String(key)}
                          onClick={() => setDecision(m.id, key)}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border ${decisions[m.id] === key ? 'bg-teal-700 text-white border-teal-700' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-100 px-6 py-4 flex items-center justify-end gap-2">
              <button onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={() => setStep('summary')} className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800">Review Summary</button>
            </div>
          </>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-sm">
              {errorMsg && <div className="rounded-lg bg-rose-50 p-3 text-xs font-medium text-rose-800 ring-1 ring-rose-200">{errorMsg}</div>}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3"><div className="text-2xl font-bold text-emerald-800">{confirmed}</div><div className="text-xs text-emerald-700">Confirmed</div></div>
                <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3"><div className="text-2xl font-bold text-blue-800">{updated}</div><div className="text-xs text-blue-700">Kept as Documented</div></div>
                <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-3"><div className="text-2xl font-bold text-rose-800">{stopped}</div><div className="text-xs text-rose-700">Stopped</div></div>
                <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3"><div className="text-2xl font-bold text-amber-800">{unresolved}</div><div className="text-xs text-amber-700">Unresolved</div></div>
              </div>
              {unresolved > 0 && <p className="text-amber-700 text-xs font-medium">Unresolved items will require review before the list is marked current.</p>}
            </div>
            <div className="border-t border-slate-100 px-6 py-4 flex items-center justify-end gap-2">
              <button onClick={() => setStep('review')} disabled={submitting} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Back</button>
              <button onClick={handleComplete} disabled={submitting} className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50">{submitting ? 'Saving…' : 'Complete Reconciliation'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
