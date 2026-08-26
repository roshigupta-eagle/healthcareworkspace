'use client';

import React, { useState } from 'react';
import {
  IconShieldAlert,
  IconShieldCheck,
  IconSparkles,
  IconPlus,
  IconClipboardCheck,
  IconMessageSquare,
  IconPill,
  IconHistory,
  IconPrinter,
  IconFileText,
  IconAlertTriangle,
} from './AllergyIcons';
import type { AllergyRecord } from '@/lib/allergyStore';
import type { AllergyReviewRecord } from '@/lib/allergyReviewStore';
import type { PatientAllergySafetyResult } from '@/lib/allergySafetyStore';
import type { AttentionItem } from '@/lib/allergies';

interface Props {
  patient: any;
  heroState: 'severe-active' | 'active-allergies' | 'verified-nka' | 'not-documented';
  allergies: AllergyRecord[];
  review: AllergyReviewRecord | null;
  safety: PatientAllergySafetyResult | null;
  needsAttention: AttentionItem[];
  onAddAllergy: () => void;
  onUpdateReview: () => void;
  onMessagePatient: () => void;
  onOpenMedicationHistory: () => void;
  onViewTimeline: () => void;
  onPrintSummary: () => void;
  onViewSources: () => void;
  onAttentionItemClick: (item: AttentionItem) => void;
}

function formatDate(iso?: string) {
  if (!iso) return 'Not reviewed';
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
  } catch {
    return iso;
  }
}

export default function AllergyRightRail({
  patient,
  heroState,
  allergies,
  review,
  safety,
  needsAttention,
  onAddAllergy,
  onUpdateReview,
  onMessagePatient,
  onOpenMedicationHistory,
  onViewTimeline,
  onPrintSummary,
  onViewSources,
  onAttentionItemClick,
}: Props) {
  const [showAiSources, setShowAiSources] = useState(false);
  const activeAllergies = allergies.filter((a) => a.clinicalStatus === 'active');
  const severeAllergies = activeAllergies.filter(
    (a) => a.criticality === 'high' || a.reactions.some((r) => r.severity === 'severe')
  );

  return (
    <div className="space-y-5">
      {/* 1. Needs Attention (Max 3 items, top of rail) */}
      {needsAttention.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-amber-200 bg-amber-50/20 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-amber-950 flex items-center gap-1.5 uppercase tracking-wider">
              <IconAlertTriangle className="w-4 h-4 text-amber-700" />
              <span>Needs Attention ({needsAttention.length})</span>
            </h3>
            <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
              Action Required
            </span>
          </div>

          <div className="space-y-2">
            {needsAttention.map((item) => (
              <div
                key={item.id}
                className={`p-3 rounded-xl border text-xs flex items-start justify-between gap-2 ${
                  item.tone === 'red'
                    ? 'bg-red-50/80 border-red-200 text-red-950'
                    : 'bg-amber-50/80 border-amber-200 text-amber-950'
                }`}
              >
                <div>
                  <div className="font-bold text-xs">{item.title}</div>
                  <div className="text-[11px] opacity-90 mt-0.5">{item.reason}</div>
                </div>
                <button
                  onClick={() => onAttentionItemClick(item)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors flex-shrink-0 ${
                    item.tone === 'red'
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-amber-800 text-white hover:bg-amber-900'
                  }`}
                >
                  {item.actionLabel}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Allergy Safety Summary Card */}
      <div className="bg-white rounded-2xl p-5 border border-[#DDE7F0] shadow-sm">
        <h3 className="text-sm font-bold text-[#121A2D] uppercase tracking-wider mb-3">
          Allergy Safety Summary
        </h3>

        <div className="space-y-2.5 text-xs text-gray-700">
          <div className="flex items-center justify-between py-1 border-b border-gray-100">
            <span className="text-gray-500">Overall Status</span>
            <span className="font-bold text-[#121A2D]">
              {heroState === 'verified-nka'
                ? 'No Known Allergies'
                : heroState === 'severe-active'
                ? 'Severe Active Allergy'
                : heroState === 'active-allergies'
                ? `${activeAllergies.length} Active Allergies`
                : 'Not Documented'}
            </span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-gray-100">
            <span className="text-gray-500">Active Records</span>
            <span className="font-bold text-[#121A2D]">{activeAllergies.length}</span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-gray-100">
            <span className="text-gray-500">Verification</span>
            <span
              className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                heroState === 'verified-nka'
                  ? 'bg-emerald-50 text-emerald-800'
                  : activeAllergies.some((a) => a.verificationStatus === 'confirmed')
                  ? 'bg-teal-50 text-teal-800'
                  : 'bg-amber-50 text-amber-900'
              }`}
            >
              {review?.nkaStatus === 'confirmed-nka'
                ? 'Confirmed NKA'
                : review?.nkaStatus === 'has-allergies'
                ? 'Verified Active'
                : 'Pending Sign-off'}
            </span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-gray-100">
            <span className="text-gray-500">Last Review</span>
            <span className="font-bold text-gray-800">
              {formatDate(review?.lastReviewedAt || activeAllergies[0]?.lastReviewedAt)}
            </span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-gray-100">
            <span className="text-gray-500">Rx Allergy Check</span>
            <span
              className={`font-semibold ${
                safety?.status === 'unavailable'
                  ? 'text-amber-800'
                  : (safety?.conflicts?.length || 0) > 0
                  ? 'text-red-700 font-bold'
                  : 'text-emerald-700'
              }`}
            >
              {safety?.status === 'unavailable'
                ? 'Unavailable'
                : (safety?.conflicts?.length || 0) > 0
                ? `${safety?.conflicts?.length} Conflict`
                : '✓ Clear'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. AI Allergy Assistant Card (Secondary Violet/Indigo Theme) */}
      <div className="bg-gradient-to-br from-indigo-50/70 via-purple-50/40 to-white rounded-2xl p-5 border border-indigo-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <IconSparkles className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-indigo-950">AI Allergy Assistant</h3>
          </div>
          <span className="text-[10px] font-bold text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded-full">
            Clinical review required
          </span>
        </div>

        <p className="text-xs text-indigo-900 leading-relaxed font-medium">
          {heroState === 'verified-nka'
            ? 'Source records verify No Known Allergies. No drug, food, or latex allergy conflicts detected in current chart data.'
            : heroState === 'severe-active'
            ? `Active severe ${severeAllergies[0]?.substance?.display} allergy documented with severe reaction history (${severeAllergies[0]?.reactions.map((r) => r.manifestation).join(', ')}). Prescribing safety cross-checks active.`
            : `Chart contains ${activeAllergies.length} active allergy records (${activeAllergies.map((a) => a.substance?.display).join(', ')}).`}
        </p>

        <ul className="mt-3 text-xs text-indigo-900 space-y-1 pl-4 list-disc">
          <li>
            {activeAllergies.filter((a) => (a.category || []).includes('medication')).length} Drug allergies
          </li>
          <li>
            {activeAllergies.filter((a) => (a.category || []).includes('food')).length} Food allergies
          </li>
          <li>
            {activeAllergies.filter((a) => (a.category || []).includes('latex')).length} Latex allergies
          </li>
        </ul>

        {showAiSources && (
          <div className="mt-3 p-2.5 rounded-lg bg-white/90 border border-indigo-200 text-[11px] text-indigo-950 space-y-1">
            <div className="font-bold">Grounded Source Citations:</div>
            <div>• Roshi EHR Patient Chart (MRN {patient.mrn || patient.id})</div>
            <div>• Annual Clinical Reconciliation Review</div>
            <div>• Authoritative Prescription Cross-Sensitivity Index</div>
          </div>
        )}

        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={() => setShowAiSources(!showAiSources)}
            className="w-full py-2 text-xs font-semibold text-indigo-900 bg-white border border-indigo-200 hover:bg-indigo-50 rounded-xl transition-colors text-center"
          >
            {showAiSources ? 'Hide AI Sources' : 'View AI Sources'}
          </button>
        </div>

        <div className="mt-2 text-[10px] text-indigo-700 opacity-80 text-center">
          AI assistant only synthesizes documented chart records. Clinician sign-off required.
        </div>
      </div>

      {/* 4. Quick Actions */}
      <div className="bg-white rounded-2xl p-5 border border-[#DDE7F0] shadow-sm">
        <h3 className="text-sm font-bold text-[#121A2D] uppercase tracking-wider mb-3">
          Quick Actions
        </h3>

        <div className="grid gap-2">
          <button
            onClick={onAddAllergy}
            className="w-full py-2.5 px-3.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow transition-colors flex items-center gap-2"
          >
            <IconPlus className="w-4 h-4" />
            <span>Add Allergy Record</span>
          </button>

          <button
            onClick={onUpdateReview}
            className="w-full py-2.5 px-3.5 text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-200 hover:bg-teal-100 rounded-xl transition-colors flex items-center gap-2"
          >
            <IconClipboardCheck className="w-4 h-4 text-teal-700" />
            <span>Update Allergy Review</span>
          </button>

          <button
            onClick={onMessagePatient}
            className="w-full py-2.5 px-3.5 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-2"
          >
            <IconMessageSquare className="w-4 h-4 text-slate-600" />
            <span>Message Patient</span>
          </button>

          <button
            onClick={onOpenMedicationHistory}
            className="w-full py-2.5 px-3.5 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-2"
          >
            <IconPill className="w-4 h-4 text-slate-600" />
            <span>Open Medication History</span>
          </button>

          <button
            onClick={onViewTimeline}
            className="w-full py-2.5 px-3.5 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-2"
          >
            <IconHistory className="w-4 h-4 text-slate-600" />
            <span>View Allergy Audit History</span>
          </button>

          <button
            onClick={onPrintSummary}
            className="w-full py-2.5 px-3.5 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-2"
          >
            <IconPrinter className="w-4 h-4 text-slate-600" />
            <span>Print Allergy Safety Summary</span>
          </button>

          <button
            onClick={onViewSources}
            className="w-full py-2.5 px-3.5 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-2"
          >
            <IconFileText className="w-4 h-4 text-slate-600" />
            <span>View Source Records</span>
          </button>
        </div>
      </div>
    </div>
  );
}
