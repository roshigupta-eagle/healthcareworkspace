'use client';

import React, { useEffect, useState } from 'react';
import { IconShieldAlert, IconShieldCheck, IconPlus, IconClipboardCheck } from './AllergyIcons';

interface Props {
  patient: any;
  heroState: 'severe-active' | 'active-allergies' | 'verified-nka' | 'not-documented';
  activeCount: number;
  severeCount: number;
  onAddAllergy: () => void;
  onUpdateReview: () => void;
}

export default function StickyPatientSafetyContext({
  patient,
  heroState,
  activeCount,
  severeCount,
  onAddAllergy,
  onUpdateReview,
}: Props) {
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 220);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!isSticky) return null;

  let safetyBadge = null;
  if (heroState === 'severe-active') {
    safetyBadge = (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
        <IconShieldAlert className="w-3.5 h-3.5 text-red-600" />
        {severeCount} Severe Allergy {severeCount > 1 ? 'Record' : 'Recorded'}
      </span>
    );
  } else if (heroState === 'active-allergies') {
    safetyBadge = (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-200">
        <IconShieldAlert className="w-3.5 h-3.5 text-amber-700" />
        {activeCount} Active {activeCount === 1 ? 'Allergy' : 'Allergies'}
      </span>
    );
  } else if (heroState === 'verified-nka') {
    safetyBadge = (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
        <IconShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
        No Known Allergies (Verified)
      </span>
    );
  } else {
    safetyBadge = (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-300">
        <IconShieldAlert className="w-3.5 h-3.5 text-slate-600" />
        Allergy Status Not Documented
      </span>
    );
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#DDE7F0] shadow-md transition-all duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 overflow-hidden text-sm">
          <span className="font-bold text-[#121A2D] truncate">
            {patient.name}
          </span>
          <span className="text-gray-400 font-normal">•</span>
          <span className="text-gray-600 text-xs hidden sm:inline">
            DOB: {patient.dob} ({patient.age || '40'}y)
          </span>
          <span className="text-gray-400 font-normal hidden sm:inline">•</span>
          <span className="text-gray-600 text-xs font-mono hidden md:inline">
            MRN: {patient.mrn || patient.id}
          </span>
          <span className="text-gray-400 font-normal hidden md:inline">•</span>
          <div className="flex-shrink-0">{safetyBadge}</div>
          {patient.riskScore && (
            <span className="text-xs text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 hidden lg:inline font-medium">
              {patient.riskScore} Clinical Risk
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onUpdateReview}
            className="px-2.5 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors flex items-center gap-1"
          >
            <IconClipboardCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Review</span>
          </button>
          <button
            onClick={onAddAllergy}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition-colors flex items-center gap-1"
          >
            <IconPlus className="w-3.5 h-3.5" />
            <span>Add Allergy</span>
          </button>
        </div>
      </div>
    </div>
  );
}
