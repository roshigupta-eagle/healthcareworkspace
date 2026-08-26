'use client';

import React from 'react';
import {
  IconShieldAlert,
  IconShieldCheck,
  IconClipboardCheck,
  IconPill,
  IconUserRound,
  IconHistory,
} from './AllergyIcons';
import type { AllergySnapshot as AllergySnapshotType } from '@/lib/allergies';

interface Props {
  snapshot: AllergySnapshotType;
  severeCount: number;
  onFilterClick?: (filter: string) => void;
  onRetrySafety?: () => void;
}

function formatDate(iso?: string) {
  if (!iso) return 'Not reviewed';
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
  } catch {
    return iso;
  }
}

export default function AllergySnapshot({ snapshot, severeCount, onFilterClick, onRetrySafety }: Props) {
  const isSevere = severeCount > 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
      {/* 1. Active Allergies */}
      <button
        onClick={() => onFilterClick?.('active')}
        className={`bg-white rounded-2xl p-4 border text-left transition-all duration-150 hover:shadow-md ${
          isSevere
            ? 'border-red-200 hover:border-red-300'
            : snapshot.activeCount > 0
            ? 'border-blue-200 hover:border-blue-300'
            : 'border-[#DDE7F0]'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Active Allergies
          </span>
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              isSevere
                ? 'bg-red-100 text-red-700'
                : snapshot.activeCount > 0
                ? 'bg-blue-100 text-blue-700'
                : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            {isSevere ? (
              <IconShieldAlert className="w-4 h-4" />
            ) : (
              <IconShieldCheck className="w-4 h-4" />
            )}
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span
            className={`text-2xl font-bold ${
              isSevere
                ? 'text-red-700'
                : snapshot.activeCount > 0
                ? 'text-blue-900'
                : 'text-emerald-700'
            }`}
          >
            {snapshot.activeCount}
          </span>
          {isSevere && (
            <span className="text-xs font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
              {severeCount} Severe
            </span>
          )}
        </div>
        <div className="mt-1 text-xs text-gray-500 truncate">
          {snapshot.activeCount === 0
            ? snapshot.heroState === 'verified-nka'
              ? 'Verified NKA'
              : 'None documented'
            : `${snapshot.activeCount} documented in chart`}
        </div>
      </button>

      {/* 2. Needs Verification */}
      <button
        onClick={() => onFilterClick?.('unverified')}
        className={`bg-white rounded-2xl p-4 border text-left transition-all duration-150 hover:shadow-md ${
          snapshot.unverifiedCount > 0
            ? 'border-amber-200 hover:border-amber-300 bg-amber-50/20'
            : 'border-[#DDE7F0]'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Needs Verification
          </span>
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              snapshot.unverifiedCount > 0
                ? 'bg-amber-100 text-amber-800'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            <IconClipboardCheck className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span
            className={`text-2xl font-bold ${
              snapshot.unverifiedCount > 0 ? 'text-amber-800' : 'text-slate-800'
            }`}
          >
            {snapshot.unverifiedCount}
          </span>
          {snapshot.unverifiedCount > 0 && (
            <span className="text-xs font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
              Action Due
            </span>
          )}
        </div>
        <div className="mt-1 text-xs text-gray-500 truncate">
          {snapshot.unverifiedCount === 0 ? 'All records verified' : 'Pending clinician sign-off'}
        </div>
      </button>

      {/* 3. Medication Conflicts */}
      <div
        className={`bg-white rounded-2xl p-4 border text-left ${
          snapshot.safetyCheckStatus === 'unavailable'
            ? 'border-amber-300 bg-amber-50/30'
            : snapshot.conflictsCount > 0
            ? 'border-red-200 bg-red-50/20'
            : 'border-emerald-200'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Med Safety Check
          </span>
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              snapshot.safetyCheckStatus === 'unavailable'
                ? 'bg-amber-100 text-amber-800'
                : snapshot.conflictsCount > 0
                ? 'bg-red-100 text-red-700'
                : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            <IconPill className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          {snapshot.safetyCheckStatus === 'unavailable' ? (
            <span className="text-sm font-bold text-amber-900">Unavailable</span>
          ) : (
            <span
              className={`text-2xl font-bold ${
                snapshot.conflictsCount > 0 ? 'text-red-700' : 'text-emerald-700'
              }`}
            >
              {snapshot.conflictsCount}
            </span>
          )}
          {snapshot.conflictsCount === 0 && snapshot.safetyCheckStatus === 'clear' && (
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded">
              Clear
            </span>
          )}
        </div>
        <div className="mt-1 text-xs text-gray-500 truncate">
          {snapshot.safetyCheckStatus === 'unavailable' ? (
            <button
              onClick={onRetrySafety}
              className="text-amber-800 font-medium underline hover:text-amber-950"
            >
              Service offline — Retry Check
            </button>
          ) : snapshot.conflictsCount > 0 ? (
            <span className="text-red-700 font-semibold">Rx allergy interaction</span>
          ) : (
            'No Rx conflicts detected'
          )}
        </div>
      </div>

      {/* 4. Last Reviewed */}
      <button
        onClick={() => onFilterClick?.('review')}
        className="bg-white rounded-2xl p-4 border border-[#DDE7F0] text-left transition-all duration-150 hover:shadow-md hover:border-cyan-300"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Last Reviewed
          </span>
          <div className="w-7 h-7 rounded-lg bg-cyan-100 text-cyan-800 flex items-center justify-center">
            <IconHistory className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 text-base font-bold text-[#121A2D] truncate">
          {formatDate(snapshot.lastReviewedAt)}
        </div>
        <div className="mt-1 text-xs text-gray-500 truncate">Annual chart review</div>
      </button>

      {/* 5. Patient-Reported Items */}
      <button
        onClick={() => onFilterClick?.('patient-reported')}
        className="bg-white rounded-2xl p-4 border border-[#DDE7F0] text-left transition-all duration-150 hover:shadow-md hover:border-indigo-300 col-span-2 sm:col-span-1"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Patient Reported
          </span>
          <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center">
            <IconUserRound className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-indigo-900">
            {snapshot.patientReportedCount}
          </span>
          <span className="text-xs text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded font-medium">
            Self-Report
          </span>
        </div>
        <div className="mt-1 text-xs text-gray-500 truncate">
          {snapshot.patientReportedCount > 0 ? 'Reconciliation required' : 'No self-reports'}
        </div>
      </button>
    </div>
  );
}
