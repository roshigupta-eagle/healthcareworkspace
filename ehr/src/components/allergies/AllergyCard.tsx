'use client';

import React from 'react';
import {
  IconShieldAlert,
  IconShieldCheck,
  IconPill,
  IconUtensils,
  IconLeaf,
  IconBandage,
  IconChevronRight,
  IconUserRound,
  IconClipboardCheck,
} from './AllergyIcons';
import type { AllergyRecord } from '@/lib/allergyStore';

interface Props {
  allergy: AllergyRecord;
  onSelect: (allergy: AllergyRecord) => void;
  onEdit: (allergy: AllergyRecord) => void;
  onVerify: (allergy: AllergyRecord) => void;
}

function formatDate(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
  } catch {
    return iso;
  }
}

export default function AllergyCard({ allergy, onSelect, onEdit, onVerify }: Props) {
  const isSevere =
    allergy.criticality === 'high' ||
    allergy.reactions.some((r) => r.severity === 'severe');

  const isModerate = allergy.reactions.some((r) => r.severity === 'moderate');

  const isConfirmed = allergy.verificationStatus === 'confirmed';
  const isPatientReported = (allergy.source || '').toLowerCase().includes('patient');

  // Primary category icon
  const primaryCategory = (allergy.category || ['other'])[0];
  let CategoryIcon = IconPill;
  if (primaryCategory === 'food') CategoryIcon = IconUtensils;
  else if (primaryCategory === 'environmental') CategoryIcon = IconLeaf;
  else if (primaryCategory === 'latex') CategoryIcon = IconBandage;

  const reactionsText =
    allergy.reactions.map((r) => r.manifestation).join(', ') || 'Reaction not documented';

  return (
    <div
      className={`bg-white rounded-2xl p-5 border transition-all duration-200 hover:shadow-md relative overflow-hidden ${
        isSevere
          ? 'border-red-200 border-l-4 border-l-red-600 bg-red-50/10'
          : isModerate
          ? 'border-amber-200 border-l-4 border-l-amber-500'
          : 'border-[#DDE7F0] border-l-4 border-l-teal-600'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        {/* Left main info */}
        <div className="flex items-start gap-3.5 flex-1 min-w-0">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isSevere
                ? 'bg-red-100 text-red-700'
                : isModerate
                ? 'bg-amber-100 text-amber-800'
                : 'bg-teal-100 text-teal-800'
            }`}
          >
            <CategoryIcon className="w-5 h-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                {allergy.category?.join(', ') || 'Medication'}
              </span>

              {/* Severity Badge */}
              {isSevere ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                  <IconShieldAlert className="w-3 h-3 text-red-600" />
                  Severe
                </span>
              ) : isModerate ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-200">
                  Moderate
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200">
                  Mild / Unspecified
                </span>
              )}

              {/* Verification Badge */}
              {isConfirmed ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <IconShieldCheck className="w-3 h-3 text-emerald-600" />
                  Confirmed
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-300">
                  <IconClipboardCheck className="w-3 h-3 text-amber-700" />
                  Unconfirmed
                </span>
              )}

              {isPatientReported && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-800 border border-indigo-200">
                  <IconUserRound className="w-3 h-3 text-indigo-600" />
                  Patient Reported
                </span>
              )}
            </div>

            <h4 className="text-xl font-bold text-[#121A2D] mt-1.5 truncate">
              {allergy.substance?.display}
            </h4>

            {/* Manifestations */}
            <div className="mt-2 text-sm text-gray-800 font-medium">
              <span className="text-xs text-gray-500 uppercase font-semibold mr-1.5">
                Reaction:
              </span>
              <span className={allergy.reactions.length === 0 ? 'text-gray-400 italic' : 'text-gray-900 font-semibold'}>
                {reactionsText}
              </span>
            </div>

            {/* Note if available */}
            {allergy.note && (
              <p className="mt-1.5 text-xs text-gray-600 line-clamp-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                {allergy.note}
              </p>
            )}

            {/* Metadata Footer */}
            <div className="mt-3 flex items-center gap-4 text-xs text-gray-500 flex-wrap">
              <div>
                Recorded: <span className="font-semibold text-gray-700">{formatDate(allergy.recordedAt)}</span>
              </div>
              <div>
                Last Reviewed: <span className="font-semibold text-gray-700">{formatDate(allergy.lastReviewedAt)}</span>
              </div>
              <div>
                Source: <span className="font-semibold text-gray-700">{allergy.source || 'Native Chart'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex sm:flex-col items-center sm:items-end gap-2 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
          <button
            onClick={() => onSelect(allergy)}
            className="px-3.5 py-1.5 text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 hover:bg-teal-100 rounded-xl transition-colors flex items-center gap-1"
          >
            <span>View Details</span>
            <IconChevronRight className="w-3.5 h-3.5" />
          </button>

          {!isConfirmed && (
            <button
              onClick={() => onVerify(allergy)}
              className="px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-50 border border-amber-300 hover:bg-amber-100 rounded-xl transition-colors"
            >
              Verify
            </button>
          )}

          <button
            onClick={() => onEdit(allergy)}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
          >
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}
