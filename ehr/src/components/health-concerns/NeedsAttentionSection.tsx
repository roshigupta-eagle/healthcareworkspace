"use client";

import type { HealthConcern } from '@/types/healthConcern';
import { ATTENTION_LABELS, formatConcernDate } from './constants';
import { AlertIcon } from '@/components/doctor-notes/Icons';

type Props = {
  concerns: HealthConcern[];
  onOpenDetails: (concern: HealthConcern) => void;
};

/** Surfaces only genuine workflow-attention concerns (never fabricated urgency); capped at 3 to avoid alert fatigue. */
export default function NeedsAttentionSection({ concerns, onOpenDetails }: Props) {
  const items = concerns.filter((c) => c.attentionStatus !== 'none').slice(0, 3);
  if (!items.length) return null;

  return (
    <section aria-labelledby="needs-attention-heading">
      <h2 id="needs-attention-heading" className="text-[15px] font-semibold text-slate-900 mb-2.5">
        Needs Attention
      </h2>
      <div className="space-y-2.5">
        {items.map((c) => {
          const isCritical = c.attentionStatus === 'critical';
          return (
            <div
              key={c.id}
              className={`flex items-start justify-between gap-4 rounded-xl border p-3.5 ${isCritical ? 'border-rose-200 bg-rose-50/60' : 'border-amber-200 bg-amber-50/60'}`}
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <AlertIcon size={16} className={`mt-0.5 shrink-0 ${isCritical ? 'text-rose-600' : 'text-amber-600'}`} />
                <div className="min-w-0">
                  <div className={`text-sm font-semibold ${isCritical ? 'text-rose-800' : 'text-amber-800'}`}>{ATTENTION_LABELS[c.attentionStatus]}</div>
                  <div className="text-sm font-medium text-slate-900 mt-0.5">{c.term}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Last reviewed {formatConcernDate(c.lastReviewedAt)}
                    {c.responsibleProvider && <> · {c.responsibleProvider.name}</>}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onOpenDetails(c)}
                className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-md ${isCritical ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-white border border-amber-200 text-amber-800 hover:bg-amber-50'}`}
              >
                Review Concern
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
