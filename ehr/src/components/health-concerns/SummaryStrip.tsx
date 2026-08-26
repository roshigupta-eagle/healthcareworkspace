"use client";

import type { HealthConcern } from '@/types/healthConcern';
import { PulseIcon } from './Icons';
import { AlertIcon, CheckCircleIcon, ClockIcon } from '@/components/doctor-notes/Icons';

export type SummaryFilter = 'all' | 'active' | 'needs-review' | 'monitoring' | 'resolved';

type Props = {
  concerns: HealthConcern[];
  active: SummaryFilter;
  onSelect: (filter: SummaryFilter) => void;
};

export default function ConcernSummaryStrip({ concerns, active, onSelect }: Props) {
  const activeCount = concerns.filter((c) => c.clinicalStatus === 'active').length;
  const needsReviewCount = concerns.filter((c) => c.attentionStatus === 'needs-review' || c.attentionStatus === 'follow-up-due').length;
  const monitoringCount = concerns.filter((c) => c.clinicalStatus === 'monitoring').length;
  const resolvedCount = concerns.filter((c) => c.clinicalStatus === 'resolved').length;

  const cards: Array<{ key: SummaryFilter; label: string; value: number; icon: React.ReactNode; tone: string; iconTone: string }> = [
    { key: 'active', label: 'Active', value: activeCount, icon: <PulseIcon size={17} />, tone: 'bg-sky-50/70 border-sky-100', iconTone: 'bg-sky-100 text-sky-700' },
    { key: 'needs-review', label: 'Needs Review', value: needsReviewCount, icon: <AlertIcon size={17} />, tone: needsReviewCount > 0 ? 'bg-amber-50/70 border-amber-100' : 'bg-slate-50 border-slate-200', iconTone: needsReviewCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500' },
    { key: 'monitoring', label: 'Monitoring', value: monitoringCount, icon: <ClockIcon size={17} />, tone: 'bg-teal-50/70 border-teal-100', iconTone: 'bg-teal-100 text-teal-700' },
    { key: 'resolved', label: 'Resolved', value: resolvedCount, icon: <CheckCircleIcon size={17} />, tone: 'bg-emerald-50/70 border-emerald-100', iconTone: 'bg-emerald-100 text-emerald-700' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => {
        const isActive = active === c.key;
        return (
          <button
            key={c.key}
            type="button"
            onClick={() => onSelect(isActive ? 'all' : c.key)}
            aria-pressed={isActive}
            className={`text-left rounded-xl border ${c.tone} px-4 py-3 transition hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 ${isActive ? 'ring-2 ring-teal-300 shadow-sm' : ''}`}
          >
            <div className="flex items-center gap-2.5">
              <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${c.iconTone}`}>{c.icon}</span>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{c.label}</div>
                <div className="text-xl font-bold text-slate-900 leading-tight">{c.value}</div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
