"use client";

import type { HealthConcern } from '@/types/healthConcern';

type Props = {
  lastVisit?: string | null;
  addedSince: HealthConcern[];
  reviewedSince: HealthConcern[];
  followUpsCreatedSince: HealthConcern[];
  onViewChanges: () => void;
};

/** Summarizes only real, backend-derived changes since the previous completed visit. No clinical interpretation is invented. */
export default function SinceLastVisit({ lastVisit, addedSince, reviewedSince, followUpsCreatedSince, onViewChanges }: Props) {
  const total = addedSince.length + reviewedSince.length + followUpsCreatedSince.length;
  if (!lastVisit || total === 0) return null;

  const parts: string[] = [];
  if (addedSince.length) parts.push(`${addedSince.length} concern${addedSince.length === 1 ? '' : 's'} added`);
  if (reviewedSince.length) parts.push(`${reviewedSince.length} concern${reviewedSince.length === 1 ? '' : 's'} reviewed`);
  if (followUpsCreatedSince.length) parts.push(`${followUpsCreatedSince.length} follow-up${followUpsCreatedSince.length === 1 ? '' : 's'} created`);

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-sky-100 bg-sky-50/60 px-4 py-3">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-sky-700">Since Last Visit</div>
        <div className="mt-0.5 text-sm text-slate-700">{parts.join(' · ')}</div>
      </div>
      <button type="button" onClick={onViewChanges} className="shrink-0 px-3 py-1.5 text-xs font-semibold rounded-md border border-sky-200 bg-white text-sky-700 hover:bg-sky-50">
        View Changes
      </button>
    </div>
  );
}
