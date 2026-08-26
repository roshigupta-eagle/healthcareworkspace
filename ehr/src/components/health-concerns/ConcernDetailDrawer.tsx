"use client";

import type { HealthConcern } from '@/types/healthConcern';
import type { ClinicalTask } from '@/types/clinicalTask';
import type { DoctorNote } from '@/types/doctorNote';
import Drawer from '@/components/doctor-notes/Drawer';
import { CLINICAL_STATUS_LABELS, CLINICAL_STATUS_STYLES, ATTENTION_LABELS, ATTENTION_STYLES, formatConcernDate, formatConcernDateTime } from './constants';
import ConcernActionsMenu, { type ConcernActionHandlers } from './ConcernActionsMenu';

type Props = {
  concern: HealthConcern;
  patient: any;
  followUpTask: ClinicalTask | null;
  relatedNotes: DoctorNote[];
  onClose: () => void;
  onQuickNote: (concern: HealthConcern) => void;
  onCreateFollowUp: (concern: HealthConcern) => void;
  actionHandlers: ConcernActionHandlers;
};

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-slate-800">{value}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-slate-100 pt-5 first:border-0 first:pt-0 mt-5 first:mt-0">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">{title}</h3>
      {children}
    </section>
  );
}

export default function ConcernDetailDrawer({ concern, patient, followUpTask, relatedNotes, onClose, onQuickNote, onCreateFollowUp, actionHandlers }: Props) {
  const clinicalStyle = CLINICAL_STATUS_STYLES[concern.clinicalStatus];
  const attention = concern.attentionStatus !== 'none' ? ATTENTION_STYLES[concern.attentionStatus] : null;
  const careTeamMember = (patient?.careTeam || []).find((m: any) => m.name === concern.responsibleProvider?.name);

  return (
    <Drawer
      title={concern.term}
      subtitle={`${CLINICAL_STATUS_LABELS[concern.clinicalStatus]} · Last reviewed ${formatConcernDate(concern.lastReviewedAt)}`}
      onClose={onClose}
      width="lg"
      footer={
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button type="button" onClick={() => onQuickNote(concern)} className="px-3 py-2 text-sm font-medium rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50">
              Quick Note
            </button>
            <button type="button" onClick={() => onCreateFollowUp(concern)} className="px-3 py-2 text-sm font-semibold rounded-md bg-teal-600 text-white hover:bg-teal-700">
              Create Follow-Up
            </button>
          </div>
          <ConcernActionsMenu concern={concern} handlers={actionHandlers} align="left" />
        </div>
      }
    >
      <div className="flex flex-wrap gap-1.5 mb-1">
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${clinicalStyle.chip}`}>{CLINICAL_STATUS_LABELS[concern.clinicalStatus]}</span>
        {attention && <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${attention.chip}`}>{ATTENTION_LABELS[concern.attentionStatus]}</span>}
        {concern.enteredInError && <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">Entered in Error</span>}
      </div>

      <Section title="Overview">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
          <Field label="Category" value={concern.category} />
          <Field label="Verification" value={concern.verification} />
          <Field label="Severity" value={concern.severity} />
          <Field label="Onset" value={concern.onset ? formatConcernDate(concern.onset) : null} />
          <Field label="Recorded Date" value={formatConcernDate(concern.recordedDate)} />
          <Field label="Last Reviewed" value={formatConcernDate(concern.lastReviewedAt)} />
          <Field label="Responsible Provider" value={concern.responsibleProvider?.name} />
          <Field label="Source" value={concern.source} />
        </dl>
        {concern.description && <p className="mt-3 text-sm leading-6 text-slate-600">{concern.description}</p>}
      </Section>

      <Section title="Current Context">
        <ul className="space-y-1.5 text-sm text-slate-600">
          {concern.clinicalStatus === 'active' && <li>• Documented as an active clinical concern.</li>}
          {concern.clinicalStatus === 'monitoring' && <li>• Ongoing monitoring is in progress.</li>}
          {!!concern.followUpTaskId && <li>• A follow-up task is open for this concern.</li>}
          {concern.updatedAt !== concern.createdAt && <li>• Recently updated on {formatConcernDateTime(concern.updatedAt)}.</li>}
        </ul>
      </Section>

      <Section title="Documentation">
        {relatedNotes.length === 0 ? (
          <p className="text-sm text-slate-500">No Doctor Notes are linked to this concern yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {relatedNotes.map((n) => (
              <li key={n.id} className="text-sm text-slate-700">
                {n.type} · {formatConcernDate(n.createdAt)} · {n.author.name}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-2.5 flex gap-3">
          <button type="button" onClick={() => onQuickNote(concern)} className="text-xs font-semibold text-teal-700 hover:text-teal-800">
            Add Quick Note
          </button>
          <a href={`/dashboard/records/${patient?.id}/doctor-notes`} className="text-xs font-semibold text-teal-700 hover:text-teal-800">
            View Related Notes
          </a>
        </div>
      </Section>

      <Section title="Follow-Up">
        {followUpTask ? (
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
            <div className="font-semibold text-slate-900">{followUpTask.title}</div>
            <div className="mt-1 text-xs text-slate-500">
              Due {followUpTask.dueDate ? formatConcernDate(followUpTask.dueDate) : '—'} · {followUpTask.assignee?.name || 'Unassigned'} ·{' '}
              <span className={followUpTask.status === 'completed' ? 'text-emerald-700 font-medium' : 'text-amber-700 font-medium'}>{followUpTask.status === 'completed' ? 'Completed' : 'Open'}</span>
            </div>
            <button type="button" onClick={() => onCreateFollowUp(concern)} className="mt-2 text-xs font-semibold text-teal-700 hover:text-teal-800">
              Open Task
            </button>
          </div>
        ) : (
          <div>
            <p className="text-sm text-slate-500 mb-2">No follow-up task exists for this concern.</p>
            <button type="button" onClick={() => onCreateFollowUp(concern)} className="text-xs font-semibold text-teal-700 hover:text-teal-800">
              Create Follow-Up
            </button>
          </div>
        )}
      </Section>

      {Array.isArray(patient?.careGaps) && patient.careGaps.length > 0 && (
        <Section title="Care Plan">
          <div className="rounded-lg border border-cyan-100 bg-cyan-50/60 p-3 text-sm">
            <div className="font-semibold text-cyan-800">{patient.careGaps.length} open care plan item{patient.careGaps.length === 1 ? '' : 's'}</div>
            <a href={`/dashboard/records/${patient?.id}`} className="mt-1.5 inline-block text-xs font-semibold text-cyan-700 hover:text-cyan-800">
              View Care Plan
            </a>
          </div>
        </Section>
      )}

      {concern.responsibleProvider && (
        <Section title="Care Team">
          <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
            <div>
              <div className="font-medium text-slate-800">{concern.responsibleProvider.name}</div>
              <div className="text-xs text-slate-500">{careTeamMember?.role || 'Responsible clinician'}</div>
            </div>
          </div>
        </Section>
      )}

      <Section title="Concern History">
        <ol className="space-y-2.5">
          {concern.history.slice().reverse().map((h) => (
            <li key={h.id} className="flex items-start justify-between gap-3 text-sm">
              <div>
                <div className="font-medium text-slate-800 capitalize">{h.action}</div>
                {h.details && <div className="text-xs text-slate-500">{h.details}</div>}
              </div>
              <div className="shrink-0 text-right text-xs text-slate-400">
                <div>{h.actor.name}</div>
                <div>{formatConcernDateTime(h.timestamp)}</div>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <div className="mt-5 flex gap-3 border-t border-slate-100 pt-4">
        <a href={`/dashboard/records/${patient?.id}/timeline?q=${encodeURIComponent(concern.term)}`} className="text-xs font-semibold text-teal-700 hover:text-teal-800">
          View in Timeline
        </a>
        {Array.isArray(patient?.chartActivity) && patient.chartActivity.length > 0 && (
          <a href={`/dashboard/records/${patient?.id}/activity`} className="text-xs font-semibold text-teal-700 hover:text-teal-800">
            View Chart Activity
          </a>
        )}
      </div>
    </Drawer>
  );
}
