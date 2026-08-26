'use client';

import React, { useState } from 'react';
import {
  IconX,
  IconShieldAlert,
  IconShieldCheck,
  IconPill,
  IconHistory,
  IconUserRound,
  IconFileText,
  IconClipboardCheck,
} from './AllergyIcons';
import type { AllergyRecord } from '@/lib/allergyStore';

interface Props {
  allergy: AllergyRecord | null;
  onClose: () => void;
  onEdit: (allergy: AllergyRecord) => void;
  onResolve: (allergyId: string, reason: string) => Promise<void>;
  onRefute: (allergyId: string, reason: string) => Promise<void>;
  onEnteredInError: (allergyId: string, reason: string) => Promise<void>;
}

function formatDate(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
  } catch {
    return iso;
  }
}

export default function AllergyDetailDrawer({
  allergy,
  onClose,
  onEdit,
  onResolve,
  onRefute,
  onEnteredInError,
}: Props) {
  const [activeTab, setActiveTab] = useState<'details' | 'provenance'>('details');
  const [actionReason, setActionReason] = useState('');
  const [confirmAction, setActionConfirm] = useState<'resolve' | 'refute' | 'entered-in-error' | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!allergy) return null;

  const isSevere =
    allergy.criticality === 'high' ||
    allergy.reactions.some((r) => r.severity === 'severe');

  async function handleConfirmAction() {
    if (!allergy || !confirmAction) return;
    if (!actionReason.trim()) {
      alert('Please enter a clinical reason for this change.');
      return;
    }
    setSubmitting(true);
    try {
      if (confirmAction === 'resolve') {
        await onResolve(allergy.id, actionReason);
      } else if (confirmAction === 'refute') {
        await onRefute(allergy.id, actionReason);
      } else if (confirmAction === 'entered-in-error') {
        await onEnteredInError(allergy.id, actionReason);
      }
      setActionConfirm(null);
      setActionReason('');
      onClose();
    } catch {
      alert('Failed to update record state.');
    }
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-[620px] bg-white h-full shadow-2xl flex flex-col transition-all duration-300 transform translate-x-0">
        {/* Header */}
        <div className="p-6 border-b border-[#DDE7F0] bg-slate-50 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-800 bg-teal-100 px-2 py-0.5 rounded">
                {allergy.category?.join(', ') || 'Allergy'}
              </span>
              <span className="text-xs font-bold bg-slate-200 text-slate-800 px-2 py-0.5 rounded">
                {allergy.type === 'intolerance' ? 'Intolerance' : 'Allergy'}
              </span>
              {isSevere && (
                <span className="text-xs font-bold bg-red-100 text-red-800 border border-red-200 px-2 py-0.5 rounded flex items-center gap-1">
                  <IconShieldAlert className="w-3 h-3 text-red-600" />
                  Severe Criticality
                </span>
              )}
            </div>

            <h2 className="text-2xl font-bold text-[#121A2D] mt-2">
              {allergy.substance?.display}
            </h2>

            <div className="mt-2 flex items-center gap-3 text-xs text-gray-600">
              <span className="font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                Status: {allergy.clinicalStatus}
              </span>
              <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Verification: {allergy.verificationStatus}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-gray-200 bg-white px-6">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'details'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            Clinical Summary & Safety
          </button>
          <button
            onClick={() => setActiveTab('provenance')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'provenance'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <IconHistory className="w-3.5 h-3.5" />
            <span>Audit Trail & Provenance</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'details' ? (
            <>
              {/* Reactions Section */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                  Documented Reactions ({allergy.reactions?.length || 0})
                </h4>

                {allergy.reactions && allergy.reactions.length > 0 ? (
                  <div className="space-y-2.5">
                    {allergy.reactions.map((r, i) => (
                      <div
                        key={i}
                        className="bg-white p-3 rounded-lg border border-slate-200 flex items-start justify-between"
                      >
                        <div>
                          <div className="font-bold text-sm text-slate-900">
                            {r.manifestation}
                          </div>
                          {r.note && <div className="text-xs text-gray-600 mt-0.5">{r.note}</div>}
                          {r.onset && <div className="text-xs text-gray-400 mt-0.5">Onset: {r.onset}</div>}
                        </div>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded capitalize ${
                            r.severity === 'severe'
                              ? 'bg-red-100 text-red-800'
                              : r.severity === 'moderate'
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-teal-100 text-teal-800'
                          }`}
                        >
                          {r.severity || 'Unspecified'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 italic">
                    Reaction not documented in chart.
                  </div>
                )}
              </div>

              {/* Grid Attributes */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="bg-white p-3 rounded-xl border border-gray-200">
                  <div className="text-gray-500">Substance Code</div>
                  <div className="font-bold text-slate-800 mt-0.5">
                    {allergy.substance?.code
                      ? `${allergy.substance.code} (${allergy.substance.system || 'SNOMED CT'})`
                      : 'Not coded'}
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-gray-200">
                  <div className="text-gray-500">Onset Date</div>
                  <div className="font-bold text-slate-800 mt-0.5">
                    {formatDate(allergy.onset)}
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-gray-200">
                  <div className="text-gray-500">Last Occurrence</div>
                  <div className="font-bold text-slate-800 mt-0.5">
                    {formatDate(allergy.lastOccurrence)}
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-gray-200">
                  <div className="text-gray-500">Recorded Date</div>
                  <div className="font-bold text-slate-800 mt-0.5">
                    {formatDate(allergy.recordedAt)}
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-gray-200">
                  <div className="text-gray-500">Recorder</div>
                  <div className="font-bold text-slate-800 mt-0.5">
                    {allergy.recorder?.display || 'Clinician'}
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-gray-200">
                  <div className="text-gray-500">Source Provenance</div>
                  <div className="font-bold text-slate-800 mt-0.5">
                    {allergy.source || 'Native Documentation'}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="bg-white p-4 rounded-xl border border-gray-200">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Clinical Notes
                </h4>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">
                  {allergy.note || 'No additional notes provided.'}
                </p>
              </div>

              {/* Confirm Action Form Overlay */}
              {confirmAction && (
                <div className="bg-amber-50 border border-amber-300 p-4 rounded-xl space-y-3">
                  <div className="font-bold text-sm text-amber-950 uppercase">
                    Confirm Action: {confirmAction.replace(/-/g, ' ')}
                  </div>
                  <p className="text-xs text-amber-900">
                    This action will modify the active clinical state of this allergy record in Roshi EHR. Please provide a mandatory reason for the audit trail.
                  </p>
                  <textarea
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder="Enter clinical rationale..."
                    rows={2}
                    className="w-full text-xs p-2 border border-amber-300 rounded-lg bg-white"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleConfirmAction}
                      disabled={submitting}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-amber-800 hover:bg-amber-900 rounded-lg"
                    >
                      {submitting ? 'Saving...' : 'Submit State Change'}
                    </button>
                    <button
                      onClick={() => setActionConfirm(null)}
                      className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Provenance Tab */
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Full Record History
              </h4>
              <div className="relative border-l-2 border-slate-200 pl-4 space-y-4">
                {(allergy.history || []).map((h, i) => (
                  <div key={i} className="relative">
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-teal-600 ring-4 ring-white" />
                    <div className="text-xs font-bold text-slate-800">{h.action?.toUpperCase()}</div>
                    <div className="text-xs text-gray-500">{formatDate(h.date)} by <span className="font-semibold text-slate-700">{h.actor}</span></div>
                    {h.detail && <div className="text-xs text-gray-700 mt-1 bg-slate-50 p-2 rounded border border-slate-100">{h.detail}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-6 border-t border-[#DDE7F0] bg-slate-50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(allergy)}
              className="px-4 py-2 text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 hover:bg-teal-100 rounded-xl transition-colors"
            >
              Edit Allergy
            </button>
          </div>

          <div className="flex items-center gap-2">
            {allergy.clinicalStatus === 'active' && (
              <button
                onClick={() => setActionConfirm('resolve')}
                className="px-3 py-2 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-xl transition-colors"
              >
                Resolve
              </button>
            )}
            <button
              onClick={() => setActionConfirm('refute')}
              className="px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-200 hover:bg-slate-300 rounded-xl transition-colors"
            >
              Refute
            </button>
            <button
              onClick={() => setActionConfirm('entered-in-error')}
              className="px-3 py-2 text-xs font-semibold text-rose-800 bg-rose-100 hover:bg-rose-200 rounded-xl transition-colors"
            >
              Entered in Error
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
