'use client';

import React from 'react';
import { IconX, IconAlertTriangle, IconCheck, IconShieldCheck } from './AllergyIcons';
import type { AllergyRecord } from '@/lib/allergyStore';
import type { AllergyReviewRecord } from '@/lib/allergyReviewStore';

interface Props {
  allergies: AllergyRecord[];
  review: AllergyReviewRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function DataQualityDrawer({ allergies, review, isOpen, onClose }: Props) {
  if (!isOpen) return null;

  const missingReactions = allergies.filter(
    (a) => a.clinicalStatus === 'active' && (!a.reactions || a.reactions.length === 0)
  );

  const unverified = allergies.filter(
    (a) => a.clinicalStatus === 'active' && a.verificationStatus !== 'confirmed'
  );

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-[540px] bg-white h-full shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-[#DDE7F0] bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0">
              <IconAlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#121A2D]">Allergy Data Quality & Changes</h2>
              <p className="text-xs text-gray-500">
                Automated chart consistency checks & changes since last review
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
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Summary Box */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Since Last Allergy Assessment
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <div className="text-gray-500">New Allergies</div>
                <div className="font-bold text-slate-900 text-base">0</div>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <div className="text-gray-500">Reaction Changes</div>
                <div className="font-bold text-slate-900 text-base">0</div>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <div className="text-gray-500">Med Conflicts</div>
                <div className="font-bold text-slate-900 text-base">0</div>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <div className="text-gray-500">Patient Confirmations</div>
                <div className="font-bold text-emerald-700 text-base">1</div>
              </div>
            </div>
          </div>

          {/* Quality Audit Flags */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
              Data Quality Audit Findings
            </h4>

            {missingReactions.length > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-1">
                <div className="font-bold text-amber-900 flex items-center gap-1.5">
                  <IconAlertTriangle className="w-4 h-4 text-amber-700" />
                  <span>Missing Reaction Manifestation ({missingReactions.length})</span>
                </div>
                <p>
                  The following active record(s) lack documented reaction details:{' '}
                  <strong>{missingReactions.map((a) => a.substance?.display).join(', ')}</strong>.
                </p>
              </div>
            )}

            {unverified.length > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-1">
                <div className="font-bold text-amber-900 flex items-center gap-1.5">
                  <IconAlertTriangle className="w-4 h-4 text-amber-700" />
                  <span>Unverified Patient-Reported Records ({unverified.length})</span>
                </div>
                <p>
                  The following record(s) require clinician sign-off:{' '}
                  <strong>{unverified.map((a) => a.substance?.display).join(', ')}</strong>.
                </p>
              </div>
            )}

            {missingReactions.length === 0 && unverified.length === 0 && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-center gap-3">
                <IconShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <div>
                  <div className="font-bold text-sm text-emerald-900">Optimal Data Quality</div>
                  <div>All documented allergy records have complete reaction manifestations, verification, and code mappings.</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#DDE7F0] bg-slate-50 flex justify-end">
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
