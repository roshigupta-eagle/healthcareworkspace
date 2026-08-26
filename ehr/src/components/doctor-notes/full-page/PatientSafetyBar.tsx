"use client";

import { CheckCircleIcon, AlertIcon } from '@/components/doctor-notes/Icons';

type Props = {
  allergies: string[];
  riskLevel?: string | null;
  onViewAllergies: () => void;
  onViewRisk: () => void;
};

/** Compact, real patient-safety context — never fabricates warnings that aren't backed by chart data. */
export default function PatientSafetyBar({ allergies, riskLevel, onViewAllergies, onViewRisk }: Props) {
  const hasAllergies = allergies.length > 0;
  const isHighRisk = (riskLevel || '').toLowerCase() === 'high';

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 min-h-[52px]">
      {hasAllergies ? (
        <button
          type="button"
          onClick={onViewAllergies}
          className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
        >
          <AlertIcon size={13} className="text-rose-600" />
          Allergies: {allergies.join(', ')}
        </button>
      ) : (
        <button type="button" onClick={onViewAllergies} className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">
          <CheckCircleIcon size={13} className="text-emerald-600" />
          No Known Allergies
        </button>
      )}

      {riskLevel && (
        <button
          type="button"
          onClick={onViewRisk}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
            isHighRisk ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
          }`}
        >
          {riskLevel} Clinical Risk
        </button>
      )}

      <span className="ml-auto text-[11px] font-semibold uppercase tracking-wider text-slate-400">PATIENT SAFETY CONTEXT</span>
    </div>
  );
}
