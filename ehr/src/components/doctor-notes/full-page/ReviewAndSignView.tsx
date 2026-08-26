"use client";

import type { DoctorNote, DoctorNoteSection } from '@/types/doctorNote';
import { NOTE_TYPE_LABELS } from '@/components/doctor-notes/constants';
import { AlertIcon, CheckCircleIcon } from '@/components/doctor-notes/Icons';

type Props = {
  patientName: string;
  type: DoctorNote['type'];
  authorName: string;
  sections: DoctorNoteSection[];
  followUpTaskId?: string | null;
  signing: boolean;
  onBackToEdit: () => void;
  onSign: () => void;
};

export default function ReviewAndSignView({ patientName, type, authorName, sections, followUpTaskId, signing, onBackToEdit, onSign }: Props) {
  const hasContent = sections.some((s) => s.body.trim().length > 0);
  const hasPlan = sections.some((s) => /plan/i.test(s.heading));
  const issues: string[] = [];
  if (!hasContent) issues.push('Add clinical content before signing.');
  if (!hasPlan) issues.push('No Plan section present.');

  return (
    <div className="mx-auto max-w-3xl py-8 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Review &amp; Sign</h2>
        <p className="mt-1 text-sm text-slate-500">Confirm the details below before finalizing this clinical note.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-xs text-slate-500">Patient</div>
          <div className="font-medium text-slate-800">{patientName}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Note Type</div>
          <div className="font-medium text-slate-800">{NOTE_TYPE_LABELS[type]}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Author</div>
          <div className="font-medium text-slate-800">{authorName}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Follow-Up</div>
          <div className="font-medium text-slate-800">{followUpTaskId ? 'Task linked' : 'None'}</div>
        </div>
      </div>

      {issues.length > 0 ? (
        <div className="space-y-2">
          {issues.map((issue) => (
            <div key={issue} className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
              <AlertIcon size={15} className="mt-0.5 text-amber-600" />
              {issue}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
          <CheckCircleIcon size={15} className="text-emerald-600" /> Documentation is ready to sign.
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Note Preview</h3>
        <div className="space-y-4">
          {sections.map((s, i) => (
            <div key={i}>
              {s.heading && <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">{s.heading}</div>}
              <p className="text-[14.5px] leading-7 text-slate-800 whitespace-pre-wrap">{s.body || '—'}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button type="button" onClick={onBackToEdit} className="px-3 py-2 text-sm font-medium rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50">
          Continue Editing
        </button>
        <button
          type="button"
          disabled={signing || !hasContent}
          onClick={onSign}
          className="px-4 py-2 text-sm font-semibold rounded-md bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {signing ? 'Signing…' : 'Sign Note'}
        </button>
      </div>
    </div>
  );
}
