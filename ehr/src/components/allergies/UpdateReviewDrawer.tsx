'use client';

import React, { useState } from 'react';
import { IconX, IconClipboardCheck, IconShieldCheck, IconCheck } from './AllergyIcons';
import type { AllergyReviewRecord, NkaStatus } from '@/lib/allergyReviewStore';
import type { AllergyRecord } from '@/lib/allergyStore';

interface Props {
  patientId: string;
  currentReview: AllergyReviewRecord | null;
  allergies: AllergyRecord[];
  isOpen: boolean;
  onClose: () => void;
  onReviewRecorded: (review: AllergyReviewRecord) => void;
}

export default function UpdateReviewDrawer({
  patientId,
  currentReview,
  allergies,
  isOpen,
  onClose,
  onReviewRecorded,
}: Props) {
  const activeAllergies = allergies.filter((a) => a.clinicalStatus === 'active');

  const [nkaStatus, setNkaStatus] = useState<NkaStatus>(
    activeAllergies.length > 0
      ? 'has-allergies'
      : currentReview?.nkaStatus === 'confirmed-nka'
      ? 'confirmed-nka'
      : 'not-documented'
  );

  const [patientReportedStatus, setPatientReportedStatus] = useState<string>(
    activeAllergies.length > 0
      ? `Active ${activeAllergies.map((a) => a.substance?.display).join(', ')} confirmed with patient`
      : 'Patient denies known medication, food, latex, or environmental allergies.'
  );

  const [note, setNote] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/patients/${encodeURIComponent(patientId)}/allergy-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nkaStatus,
          patientReportedStatus,
          note,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to record allergy review');
      }

      const data = await res.json();
      if (data.item) {
        onReviewRecorded(data.item);
        onClose();
      }
    } catch (err) {
      setErrorMsg('Failed to persist allergy review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-[580px] bg-white h-full shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-[#DDE7F0] bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center flex-shrink-0">
              <IconClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#121A2D]">Update Allergy Assessment</h2>
              <p className="text-xs text-gray-500">
                Perform patient allergy reconciliation and update verified chart status
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium">
              {errorMsg}
            </div>
          )}

          {/* Current Chart Context Box */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-1.5">
            <div className="font-bold text-slate-800 uppercase tracking-wider">
              Current Active Chart Records ({activeAllergies.length})
            </div>
            {activeAllergies.length > 0 ? (
              <ul className="list-disc pl-4 space-y-1 text-slate-700 font-medium">
                {activeAllergies.map((a) => (
                  <li key={a.id}>
                    {a.substance?.display} ({a.category?.join(', ') || 'Medication'}) —{' '}
                    {a.reactions.map((r) => r.manifestation).join(', ') || 'No reaction notes'}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-gray-500 italic">No active allergy records currently exist in chart.</div>
            )}
          </div>

          {/* Question 1: NKA Confirmation */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Verified Chart Status Outcome
            </label>
            <div className="space-y-2">
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  nkaStatus === 'confirmed-nka'
                    ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="nkaStatus"
                  value="confirmed-nka"
                  checked={nkaStatus === 'confirmed-nka'}
                  onChange={() => setNkaStatus('confirmed-nka')}
                  className="mt-0.5 text-teal-600 focus:ring-teal-500"
                />
                <div>
                  <div className="text-sm font-bold text-emerald-950 flex items-center gap-1.5">
                    <IconShieldCheck className="w-4 h-4 text-emerald-600" />
                    Confirmed No Known Allergies (NKA)
                  </div>
                  <div className="text-xs text-emerald-800 mt-0.5">
                    Verified negative allergy status: Patient explicitly denies known drug, food, environmental, or latex allergies.
                  </div>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  nkaStatus === 'has-allergies'
                    ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="nkaStatus"
                  value="has-allergies"
                  checked={nkaStatus === 'has-allergies'}
                  onChange={() => setNkaStatus('has-allergies')}
                  className="mt-0.5 text-teal-600 focus:ring-teal-500"
                />
                <div>
                  <div className="text-sm font-bold text-blue-950">
                    Active Allergies Documented & Verified
                  </div>
                  <div className="text-xs text-blue-800 mt-0.5">
                    Chart contains documented active allergy records that remain valid and active.
                  </div>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  nkaStatus === 'not-documented'
                    ? 'border-amber-500 bg-amber-50/50 ring-1 ring-amber-500'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="nkaStatus"
                  value="not-documented"
                  checked={nkaStatus === 'not-documented'}
                  onChange={() => setNkaStatus('not-documented')}
                  className="mt-0.5 text-teal-600 focus:ring-teal-500"
                />
                <div>
                  <div className="text-sm font-bold text-amber-950">
                    Allergy Status Not Documented / Incomplete
                  </div>
                  <div className="text-xs text-amber-900 mt-0.5">
                    Reconciliation could not be completed or patient is unable to communicate.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Question 2: Patient Reported Summary */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
              Patient-Reported Statement
            </label>
            <textarea
              value={patientReportedStatus}
              onChange={(e) => setPatientReportedStatus(e.target.value)}
              rows={2}
              placeholder="Record exact patient statements regarding medication, food, or latex sensitivities..."
              className="w-full text-sm p-3 border border-gray-300 rounded-xl"
            />
          </div>

          {/* Question 3: Reconciliation Notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
              Reconciliation Notes & Verification Context
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Optional clinical notes for audit history (e.g. Verified with patient at annual checkup)..."
              className="w-full text-sm p-3 border border-gray-300 rounded-xl"
            />
          </div>

          {/* Summary Preview */}
          <div className="p-4 rounded-xl bg-teal-50/80 border border-teal-200 text-xs space-y-1">
            <div className="font-bold text-teal-950">Review Pre-save Confirmation:</div>
            <div className="text-teal-900">
              Outcome: <span className="font-bold">{nkaStatus.toUpperCase()}</span>
            </div>
            <div className="text-teal-900">
              Reviewer: <span className="font-bold">Clinician Sign-off</span>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="pt-4 border-t border-gray-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow transition-colors flex items-center gap-1.5"
            >
              <IconCheck className="w-4 h-4" />
              <span>{submitting ? 'Recording Review...' : 'Complete Review & Sign-off'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
