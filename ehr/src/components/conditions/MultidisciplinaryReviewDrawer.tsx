"use client";

import React, { useState } from 'react';
import type { ConditionRecord } from '@/lib/conditionsStore';

interface CareTeamMember { id: string; name: string; role: string; specialty?: string }

export default function MultidisciplinaryReviewDrawer({
  conditions,
  careTeam,
  onClose,
}: {
  conditions: ConditionRecord[];
  careTeam: CareTeamMember[];
  onClose: () => void;
}) {
  const [selectedConditions, setSelectedConditions] = useState<Set<string>>(new Set());
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set());
  const [purpose, setPurpose] = useState('');
  const [step, setStep] = useState<'build' | 'summary'>('build');

  function toggle(set: Set<string>, id: string, setter: (s: Set<string>) => void) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id); else next.add(id);
    setter(next);
  }

  const canContinue = selectedConditions.size > 0 && selectedParticipants.size > 0 && purpose.trim().length > 0;
  const chosenConditions = conditions.filter((c) => selectedConditions.has(c.id));
  const chosenParticipants = careTeam.filter((m) => selectedParticipants.has(m.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-xs">
      <div className="flex h-full w-full max-w-lg flex-col bg-white shadow-2xl">
        <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Start Multidisciplinary Review</h2>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {step === 'build' ? (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-sm">
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Conditions to Review</h3>
                <div className="space-y-1.5">
                  {conditions.filter((c) => c.clinicalStatus === 'active').map((c) => (
                    <label key={c.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 cursor-pointer hover:bg-slate-50">
                      <input type="checkbox" checked={selectedConditions.has(c.id)} onChange={() => toggle(selectedConditions, c.id, setSelectedConditions)} className="rounded border-slate-300 text-teal-600 focus:ring-teal-400" />
                      <span className="font-medium text-slate-800">{c.name}</span>
                    </label>
                  ))}
                  {conditions.filter((c) => c.clinicalStatus === 'active').length === 0 && <p className="text-slate-400 italic">No active conditions available.</p>}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Care Team Participants</h3>
                <div className="space-y-1.5">
                  {careTeam.map((m) => (
                    <label key={m.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 cursor-pointer hover:bg-slate-50">
                      <input type="checkbox" checked={selectedParticipants.has(m.id)} onChange={() => toggle(selectedParticipants, m.id, setSelectedParticipants)} className="rounded border-slate-300 text-teal-600 focus:ring-teal-400" />
                      <span className="font-medium text-slate-800">{m.name}</span>
                      <span className="text-xs text-slate-400">{m.role}</span>
                    </label>
                  ))}
                  {careTeam.length === 0 && <p className="text-slate-400 italic">No care team documented for this patient.</p>}
                </div>
              </div>

              <div>
                <label htmlFor="review-purpose" className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Purpose / Agenda</label>
                <textarea id="review-purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} rows={3} placeholder="e.g. Reassess hypertension management following recent readings" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
              </div>
            </div>
            <div className="border-t border-slate-100 px-6 py-4 flex items-center justify-end gap-2">
              <button onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
              <button disabled={!canContinue} onClick={() => setStep('summary')} className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50">Continue</button>
            </div>
          </>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-sm">
              <div className="rounded-xl bg-teal-50 border border-teal-100 p-3 text-teal-800 text-xs font-medium">This summary is for care-team coordination. Share it directly with participants — this workspace does not yet send notifications automatically.</div>
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Conditions</h3>
                <p className="text-slate-800">{chosenConditions.map((c) => c.name).join(', ')}</p>
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Participants</h3>
                <p className="text-slate-800">{chosenParticipants.map((m) => m.name).join(', ')}</p>
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Purpose</h3>
                <p className="text-slate-800">{purpose}</p>
              </div>
            </div>
            <div className="border-t border-slate-100 px-6 py-4 flex items-center justify-end gap-2">
              <button onClick={() => setStep('build')} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Back</button>
              <button onClick={onClose} className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800">Done</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
