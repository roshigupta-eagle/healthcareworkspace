"use client";

import type { HealthConcern } from '@/types/healthConcern';
import type { ClinicalTask } from '@/types/clinicalTask';
import { ATTENTION_LABELS, ATTENTION_STYLES, CLINICAL_STATUS_LABELS, CLINICAL_STATUS_STYLES, formatConcernDate, isPulseTerm } from './constants';
import { PulseIcon, ActivityIcon } from './Icons';
import { PinIcon } from '@/components/doctor-notes/Icons';
import ConcernActionsMenu, { type ConcernActionHandlers } from './ConcernActionsMenu';

type Props = {
  concern: HealthConcern;
  followUpTask: ClinicalTask | null;
  updatedSinceLastVisit: boolean;
  onOpenDetails: (concern: HealthConcern) => void;
  onQuickNote: (concern: HealthConcern) => void;
  onCreateFollowUp: (concern: HealthConcern) => void;
  actionHandlers: ConcernActionHandlers;
};

export default function ConcernCard({ concern, followUpTask, updatedSinceLastVisit, onOpenDetails, onQuickNote, onCreateFollowUp, actionHandlers }: Props) {
  const clinicalStyle = CLINICAL_STATUS_STYLES[concern.clinicalStatus];
  const attention = concern.attentionStatus !== 'none' ? ATTENTION_STYLES[concern.attentionStatus] : null;
  const accent = attention ? attention.accent : clinicalStyle.accent;
  const surface = attention?.surface || '';

  const badges: Array<{ label: string; className: string }> = [{ label: CLINICAL_STATUS_LABELS[concern.clinicalStatus], className: clinicalStyle.chip }];
  if (attention) badges.push({ label: ATTENTION_LABELS[concern.attentionStatus], className: attention.chip });
  if (updatedSinceLastVisit && badges.length < 3) badges.push({ label: 'Updated Since Last Visit', className: 'bg-sky-50 text-sky-700 border border-sky-100' });

  return (
    <article
      className={`relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md ${surface}`}
      aria-label={`${concern.term}, ${CLINICAL_STATUS_LABELS[concern.clinicalStatus]}, last reviewed ${formatConcernDate(concern.lastReviewedAt)}, responsible clinician ${concern.responsibleProvider?.name || 'unassigned'}`}
    >
      <div className={`absolute inset-y-0 left-0 w-1 ${accent}`} aria-hidden />
      <div className="grid gap-4 p-4 pl-5 lg:grid-cols-[minmax(0,1.6fr)_170px_auto] lg:items-center">
        <div className="min-w-0 flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700">
            {isPulseTerm(concern.term) ? <PulseIcon size={18} /> : <ActivityIcon size={18} />}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="text-[15px] font-semibold text-slate-900">{concern.term}</h3>
              {concern.pinned && <PinIcon size={13} className="text-amber-500" />}
            </div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {badges.map((b) => (
                <span key={b.label} className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${b.className}`}>
                  {b.label}
                </span>
              ))}
            </div>
            {concern.description && <p className="mt-1.5 text-sm text-slate-600 line-clamp-2">{concern.description}</p>}
            <p className="mt-1.5 text-xs text-slate-500">
              Last reviewed <span className="font-medium text-slate-700">{formatConcernDate(concern.lastReviewedAt)}</span>
              {concern.responsibleProvider && <> · {concern.responsibleProvider.name}</>}
            </p>
          </div>
        </div>

        <div className="lg:border-l lg:border-slate-100 lg:pl-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Follow-Up</div>
          {concern.followUpTaskId ? (
            <button type="button" onClick={() => onCreateFollowUp(concern)} className="mt-1 text-sm font-medium text-teal-700 hover:text-teal-800">
              {followUpTask?.status === 'completed' ? 'Follow-Up Complete' : 'Follow-Up Open'}
            </button>
          ) : (
            <div className="mt-1 text-sm text-slate-400">None</div>
          )}
        </div>

        <div className="flex items-center justify-end gap-1.5">
          <button type="button" onClick={() => onQuickNote(concern)} className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900">
            Quick Note
          </button>
          <button type="button" onClick={() => onOpenDetails(concern)} className="px-3 py-1.5 text-xs font-semibold rounded-md border border-teal-200 text-teal-700 hover:bg-teal-50">
            View Details
          </button>
          <ConcernActionsMenu concern={concern} handlers={actionHandlers} />
        </div>
      </div>
    </article>
  );
}
