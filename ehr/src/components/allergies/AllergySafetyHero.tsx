'use client';

import React from 'react';
import { IconShieldCheck, IconShieldAlert, IconClipboardCheck, IconPlus, IconAlertTriangle } from './AllergyIcons';
import type { AllergyRecord } from '@/lib/allergyStore';
import type { AllergyReviewRecord } from '@/lib/allergyReviewStore';

interface Props {
  heroState: 'severe-active' | 'active-allergies' | 'verified-nka' | 'not-documented';
  allergies: AllergyRecord[];
  review: AllergyReviewRecord | null;
  onReviewClick: () => void;
  onAddClick: () => void;
  onSelectAllergy?: (allergy: AllergyRecord) => void;
}

function formatDate(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
  } catch {
    return iso;
  }
}

export default function AllergySafetyHero({
  heroState,
  allergies,
  review,
  onReviewClick,
  onAddClick,
  onSelectAllergy,
}: Props) {
  const activeAllergies = allergies.filter((a) => a.clinicalStatus === 'active');
  const severeAllergies = activeAllergies.filter(
    (a) => a.criticality === 'high' || a.reactions.some((r) => r.severity === 'severe')
  );

  const lastReviewedDate = review?.lastReviewedAt
    ? formatDate(review.lastReviewedAt)
    : activeAllergies[0]?.lastReviewedAt
    ? formatDate(activeAllergies[0].lastReviewedAt)
    : 'Not reviewed';

  const reviewerName = review?.reviewedBy || activeAllergies[0]?.recorder?.display || 'Clinician';
  const reviewSource = review?.source || 'Patient chart review / clinical documentation';

  if (heroState === 'severe-active' && severeAllergies.length > 0) {
    const primarySevere = severeAllergies[0];
    const reactions = primarySevere.reactions.map((r) => r.manifestation).join(', ') || 'Severe reaction';

    return (
      <div className="bg-[#FEF2F2] rounded-2xl p-6 border border-[#FECACA] border-l-4 border-l-red-600 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center text-red-700 flex-shrink-0">
              <IconShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-red-600 text-white">
                  CRITICAL ALLERGY ALERT
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-200 text-red-900">
                  {primarySevere.substance?.display} — SEVERE
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white border border-red-200 text-red-800">
                  {primarySevere.clinicalStatus === 'active' ? 'Active' : primarySevere.clinicalStatus} • {primarySevere.verificationStatus}
                </span>
              </div>

              <h2 className="text-2xl font-bold text-red-950 mt-2">
                {primarySevere.substance?.display || 'Severe Allergen'}
              </h2>
              <p className="mt-1 text-sm text-red-900 font-medium">
                Documented Severe Reaction: <span className="font-bold underline">{reactions}</span>
              </p>
              <p className="mt-2 text-xs text-red-800">
                {primarySevere.note || 'Immediate medical risk upon exposure. Exercise extreme caution before prescribing or administering related compounds.'}
              </p>

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs bg-white/70 backdrop-blur-sm p-3 rounded-xl border border-red-200/80 text-red-950">
                <div>
                  <div className="text-red-700 font-medium">Category</div>
                  <div className="font-bold capitalize">{primarySevere.category?.join(', ') || 'Medication'}</div>
                </div>
                <div>
                  <div className="text-red-700 font-medium">Last Reviewed</div>
                  <div className="font-bold">{lastReviewedDate}</div>
                </div>
                <div>
                  <div className="text-red-700 font-medium">Verified By</div>
                  <div className="font-bold">{reviewerName}</div>
                </div>
                <div>
                  <div className="text-red-700 font-medium">Total Active</div>
                  <div className="font-bold">{activeAllergies.length} active ({severeAllergies.length} severe)</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 w-full md:w-auto flex-shrink-0">
            {onSelectAllergy && (
              <button
                onClick={() => onSelectAllergy(primarySevere)}
                className="px-4 py-2.5 text-xs font-bold text-white bg-red-700 hover:bg-red-800 rounded-xl shadow transition-colors text-center"
              >
                View Allergy Details
              </button>
            )}
            <button
              onClick={onReviewClick}
              className="px-4 py-2.5 text-xs font-bold text-red-900 bg-white border border-red-300 hover:bg-red-50 rounded-xl transition-colors text-center"
            >
              Update Allergy Review
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (heroState === 'active-allergies') {
    return (
      <div className="bg-[#EFF6FF] rounded-2xl p-6 border border-[#BFDBFE] border-l-4 border-l-blue-600 shadow-sm">
        <div className="flex flex-col md:flex-row items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 flex-shrink-0">
              <IconShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-700 text-white">
                  ALLERGY SAFETY ACTIVE
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-200 text-blue-900">
                  {activeAllergies.length} Active {activeAllergies.length === 1 ? 'Record' : 'Records'}
                </span>
              </div>

              <h2 className="text-2xl font-bold text-blue-950 mt-2">
                Active Allergies & Intolerances
              </h2>
              <p className="mt-1 text-sm text-blue-900">
                {activeAllergies.map((a) => a.substance?.display).join(', ')} currently documented in chart.
              </p>

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs bg-white/80 p-3 rounded-xl border border-blue-200 text-blue-950">
                <div>
                  <div className="text-blue-700 font-medium">Last Reviewed</div>
                  <div className="font-bold">{lastReviewedDate}</div>
                </div>
                <div>
                  <div className="text-blue-700 font-medium">Verified By</div>
                  <div className="font-bold">{reviewerName}</div>
                </div>
                <div>
                  <div className="text-blue-700 font-medium">Source</div>
                  <div className="font-bold truncate">{reviewSource}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 w-full md:w-auto flex-shrink-0">
            <button
              onClick={onReviewClick}
              className="px-4 py-2.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow transition-colors text-center"
            >
              Review Allergies
            </button>
            <button
              onClick={onAddClick}
              className="px-4 py-2.5 text-xs font-semibold text-blue-900 bg-white border border-blue-300 hover:bg-blue-50 rounded-xl transition-colors text-center"
            >
              + Add Allergy
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (heroState === 'verified-nka') {
    return (
      <div className="bg-[#F0FDF4] rounded-2xl p-6 border border-[#BBF7D0] border-l-4 border-l-emerald-600 shadow-sm">
        <div className="flex flex-col md:flex-row items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 flex-shrink-0">
              <IconShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-700 text-white">
                  CONFIRMED NEGATIVE
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-200 text-emerald-900">
                  Verified Status
                </span>
              </div>

              <h2 className="text-2xl font-bold text-emerald-950 mt-2">
                No Known Allergies
              </h2>
              <p className="mt-1 text-sm text-emerald-900">
                No drug, food, environmental, or latex allergies are currently documented as active for this patient.
              </p>

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs bg-white/80 p-3 rounded-xl border border-emerald-200 text-emerald-950">
                <div>
                  <div className="text-emerald-700 font-medium">Last Reviewed</div>
                  <div className="font-bold">{lastReviewedDate}</div>
                </div>
                <div>
                  <div className="text-emerald-700 font-medium">Verified By</div>
                  <div className="font-bold">{reviewerName}</div>
                </div>
                <div>
                  <div className="text-emerald-700 font-medium">Source Provenance</div>
                  <div className="font-bold truncate">{reviewSource}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 w-full md:w-auto flex-shrink-0">
            <button
              onClick={onReviewClick}
              className="px-4 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow transition-colors text-center flex items-center justify-center gap-1.5"
            >
              <IconClipboardCheck className="w-4 h-4" />
              <span>Update Allergy Review</span>
            </button>
            <button
              onClick={onAddClick}
              className="px-4 py-2.5 text-xs font-semibold text-emerald-900 bg-white border border-emerald-300 hover:bg-emerald-50 rounded-xl transition-colors text-center flex items-center justify-center gap-1.5"
            >
              <IconPlus className="w-4 h-4" />
              <span>Add Allergy</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Fallback: heroState === 'not-documented'
  return (
    <div className="bg-[#FFFBEB] rounded-2xl p-6 border border-[#FDE68A] border-l-4 border-l-amber-500 shadow-sm">
      <div className="flex flex-col md:flex-row items-start justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800 flex-shrink-0">
            <IconAlertTriangle className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-600 text-white">
                DOCUMENTATION REQUIRED
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-200 text-amber-950">
                Unconfirmed State
              </span>
            </div>

            <h2 className="text-2xl font-bold text-amber-950 mt-2">
              Allergy Status Not Documented
            </h2>
            <p className="mt-1 text-sm text-amber-900">
              No active allergy records or verified negative allergy confirmation (No Known Allergies) have been documented in this chart.
            </p>

            <div className="mt-4 p-3 rounded-xl bg-white/80 border border-amber-200 text-xs text-amber-950">
              <span className="font-bold">Mandatory Safety Protocol:</span> Perform patient allergy reconciliation before administering or prescribing medications, orders, or procedures.
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 w-full md:w-auto flex-shrink-0">
          <button
            onClick={onReviewClick}
            className="px-4 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow transition-colors text-center"
          >
            Complete Review
          </button>
          <button
            onClick={onAddClick}
            className="px-4 py-2.5 text-xs font-semibold text-amber-900 bg-white border border-amber-300 hover:bg-amber-50 rounded-xl transition-colors text-center"
          >
            + Add Allergy
          </button>
        </div>
      </div>
    </div>
  );
}
