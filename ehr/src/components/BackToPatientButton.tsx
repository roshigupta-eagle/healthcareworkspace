"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  patientId: string | number | undefined | null;
  label?: string;
  className?: string;
};

export default function BackToPatientButton({ patientId, label = 'Back to Patient', className = '' }: Props) {
  const router = useRouter();
  const [navigating, setNavigating] = useState(false);

  const handle = (e?: React.MouseEvent) => {
    e?.preventDefault();
    if (!patientId) return;
    setNavigating(true);
    // small delay to allow the micro-animation to show
    setTimeout(() => {
      router.push(`/dashboard/records/${patientId}`);
    }, 140);
  };

  return (
    <>
      <button
        onClick={handle}
        onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !navigating) handle(); }}
        aria-label={`Back to patient ${patientId}`}
        className={`inline-flex items-center gap-2 bg-white border border-[#DDE7F0] text-teal-700 px-3 py-2 rounded-md shadow-sm hover:shadow-md transform hover:-translate-y-0.5 transition-all duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 ${className}`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M15 6L9 12L15 18" stroke="#0f766e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-sm font-medium">{label}</span>
      </button>

      {/* overlay for a subtle transition */}
      <div aria-hidden className={`fixed inset-0 bg-white z-50 pointer-events-none transition-opacity duration-200 ${navigating ? 'opacity-100' : 'opacity-0'}`} />
    </>
  );
}
