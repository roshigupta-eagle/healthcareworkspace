"use client";

import type { DoctorNoteSection } from '@/types/doctorNote';

type Props = {
  sections: DoctorNoteSection[];
  onBackToEdit: () => void;
  onReviewAndSign: () => void;
};

/** Read-only rendering of the note exactly as it will appear after signing/printing. */
export default function PreviewView({ sections, onBackToEdit, onReviewAndSign }: Props) {
  return (
    <div className="mx-auto max-w-2xl py-8 space-y-6">
      <h2 className="text-xl font-semibold text-slate-900">Preview</h2>
      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
        {sections.map((s, i) => (
          <div key={i}>
            {s.heading && <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1.5">{s.heading}</div>}
            <p className="text-[14.5px] leading-7 text-slate-800 whitespace-pre-wrap max-w-[70ch]">{s.body || '—'}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <button type="button" onClick={onBackToEdit} className="px-3 py-2 text-sm font-medium rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50">
          Back to Edit
        </button>
        <button type="button" onClick={onReviewAndSign} className="px-4 py-2 text-sm font-semibold rounded-md bg-teal-600 text-white hover:bg-teal-700">
          Review &amp; Sign
        </button>
      </div>
    </div>
  );
}
