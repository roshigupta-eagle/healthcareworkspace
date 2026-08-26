'use client';

import React from 'react';
import { IconX, IconPill, IconShieldAlert, IconCheck, IconRefreshCw, IconExternalLink } from './AllergyIcons';
import type { PatientAllergySafetyResult, MedicationAllergyConflict } from '@/lib/allergySafetyStore';

interface Props {
  patient: any;
  safety: PatientAllergySafetyResult | null;
  isOpen: boolean;
  onClose: () => void;
  onRetrySafety: () => void;
  onOpenMedicationHistory: () => void;
}

export default function MedicationConflictDrawer({
  patient,
  safety,
  isOpen,
  onClose,
  onRetrySafety,
  onOpenMedicationHistory,
}: Props) {
  if (!isOpen) return null;

  const isUnavailable = !safety || safety.status === 'unavailable';
  const conflicts: MedicationAllergyConflict[] = safety?.conflicts || [];
  const activeMeds = patient.medications || [];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-[580px] bg-white h-full shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-[#DDE7F0] bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center flex-shrink-0">
              <IconPill className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#121A2D]">Medication Safety Context</h2>
              <p className="text-xs text-gray-500">
                Authoritative Rx-allergy interaction & cross-sensitivity analysis
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Safety Check Service Status */}
          {isUnavailable ? (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 space-y-3">
              <div className="font-bold text-sm flex items-center gap-2">
                <IconShieldAlert className="w-5 h-5 text-amber-700" />
                <span>Safety Check Service Unavailable</span>
              </div>
              <p className="text-xs text-amber-900">
                Automated medication-allergy conflict checking could not be completed due to service communication status. Please review prescriptions manually.
              </p>
              <button
                onClick={onRetrySafety}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-amber-800 hover:bg-amber-900 rounded-lg shadow transition-colors flex items-center gap-1.5"
              >
                <IconRefreshCw className="w-3.5 h-3.5" />
                <span>Retry Safety Check</span>
              </button>
            </div>
          ) : conflicts.length > 0 ? (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-red-800 flex items-center gap-1.5">
                <IconShieldAlert className="w-4 h-4 text-red-600" />
                Active Safety Conflicts ({conflicts.length})
              </h4>
              {conflicts.map((c) => (
                <div key={c.id} className="p-4 rounded-xl bg-red-50 border border-red-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-red-950">{c.medicationName}</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-red-600 text-white uppercase">
                      {c.severity} CONFLICT
                    </span>
                  </div>
                  <p className="text-xs text-red-900 font-medium">{c.message}</p>
                  <div className="text-[11px] text-red-700 flex items-center gap-3">
                    <span>Target Allergen: <strong className="text-red-950">{c.allergenName}</strong></span>
                    <span>Reaction: <strong className="text-red-950">{c.reaction}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                <IconCheck className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-sm text-emerald-900">No Recognized Rx Allergy Conflicts</div>
                <div className="text-emerald-800 mt-0.5">
                  No recognized allergy conflicts found in the currently available documented prescription data.
                </div>
              </div>
            </div>
          )}

          {/* Active Medications List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
              Active Prescriptions ({activeMeds.length})
            </h4>
            <div className="space-y-2">
              {activeMeds.map((m: any, idx: number) => (
                <div key={idx} className="p-3.5 rounded-xl border border-gray-200 bg-white flex items-center justify-between">
                  <div>
                    <div className="font-bold text-sm text-[#121A2D]">
                      {m.name} {m.dose ? `• ${m.dose}` : ''}
                    </div>
                    <div className="text-xs text-gray-500">{m.freq || 'Active prescription'}</div>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    ✓ Clear
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#DDE7F0] bg-slate-50 flex items-center justify-between">
          <button
            onClick={onOpenMedicationHistory}
            className="px-4 py-2.5 text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 hover:bg-teal-100 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <span>Open Medication History</span>
            <IconExternalLink className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
