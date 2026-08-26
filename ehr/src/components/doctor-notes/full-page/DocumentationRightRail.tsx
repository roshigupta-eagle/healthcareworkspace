"use client";

import { useMemo, useState } from 'react';
import type { Patient } from '@/app/dashboard/records/mockPatients';
import type { DoctorNoteSection } from '@/types/doctorNote';
import { SparkleIcon, PinIcon, MessageIcon } from '@/components/doctor-notes/Icons';

type Props = {
  patient: Patient;
  sections: DoctorNoteSection[];
  onCreateFollowUp: () => void;
  onMessagePatient: (draftText?: string) => void;
  noteReady: boolean;
  hideAi?: boolean;
};

function documentationCheck(sections: DoctorNoteSection[]): string[] {
  const issues: string[] = [];
  const hasPlan = sections.some((s) => /plan/i.test(s.heading));
  const hasContent = sections.some((s) => s.body.trim().length > 0);
  if (!hasContent) issues.push('No clinical content has been documented yet.');
  if (!hasPlan) issues.push('No Plan section present.');
  return issues;
}

function summarizeDraft(sections: DoctorNoteSection[]): string {
  const text = sections.map((s) => s.body).join(' ').replace(/\s+/g, ' ').trim();
  if (!text) return 'Nothing has been documented yet.';
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  return sentences.slice(0, 3).join(' ');
}

function patientFriendlyDraft(sections: DoctorNoteSection[]): string {
  const text = sections.map((s) => s.body).filter(Boolean).join('\n\n');
  if (!text) return '';
  return `Summary of your visit:\n\n${text}\n\nPlease reach out with any questions.`;
}

export default function DocumentationRightRail({ patient, sections, onCreateFollowUp, onMessagePatient, noteReady, hideAi = false }: Props) {
  const [showAllContext, setShowAllContext] = useState(false);
  const [aiResult, setAiResult] = useState<{ label: string; text: string } | null>(null);
  const [aiIssues, setAiIssues] = useState<string[] | null>(null);

  const namedSections = sections.filter((s) => s.heading);
  const progress = useMemo(() => {
    if (!namedSections.length) return null;
    const completed = namedSections.filter((s) => s.body.trim().length > 0).length;
    return { completed, total: namedSections.length };
  }, [namedSections]);

  const conditions: string[] = patient?.conditions || [];
  const medications = patient?.medications || [];
  const contextItems = [
    ...conditions.map((c) => ({ label: c, tone: 'bg-teal-50 text-teal-700 border-teal-100' })),
    ...medications.map((m) => ({ label: m.name, tone: 'bg-violet-50 text-violet-700 border-violet-100' })),
  ];
  const visibleContext = showAllContext ? contextItems : contextItems.slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Patient Context</h3>
        {contextItems.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">No conditions or medications documented.</p>
        ) : (
          <>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {visibleContext.map((item) => (
                <span key={item.label} className={`px-2 py-0.5 rounded-full text-xs border ${item.tone}`}>
                  {item.label}
                </span>
              ))}
            </div>
            {contextItems.length > 5 && (
              <button type="button" onClick={() => setShowAllContext((v) => !v)} className="mt-2 text-xs font-semibold text-teal-700 hover:text-teal-800">
                {showAllContext ? 'Show Less' : 'View More'}
              </button>
            )}
          </>
        )}
      </div>

      {progress && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Documentation Progress</h3>
          <div className="mt-1.5 text-xs text-slate-500">
            {progress.completed} / {progress.total} sections completed
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-slate-100">
            <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${(progress.completed / progress.total) * 100}%` }} />
          </div>
          <ul className="mt-3 space-y-1.5">
            {namedSections.map((s) => {
              const complete = s.body.trim().length > 0;
              return (
                <li key={s.heading} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{s.heading}</span>
                  <span className={complete ? 'text-emerald-600' : 'text-amber-600'}>{complete ? '✓' : '○'}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {!hideAi && <div className="rounded-xl border border-violet-100 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900">
            <SparkleIcon size={15} className="text-violet-600" /> AI Documentation Assistant
          </h3>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded">Clinical review required</span>
        </div>
        <div className="mt-2.5 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => {
              setAiResult({ label: 'Draft Summary', text: summarizeDraft(sections) });
              setAiIssues(null);
            }}
            className="w-full text-left px-3 py-2 text-sm rounded-md bg-violet-50 text-violet-800 hover:bg-violet-100"
          >
            Summarize Draft
          </button>
          <button
            type="button"
            onClick={() => {
              setAiIssues(documentationCheck(sections));
              setAiResult(null);
            }}
            className="w-full text-left px-3 py-2 text-sm rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            Documentation Check
          </button>
          <button
            type="button"
            onClick={() => {
              setAiResult({ label: 'Patient-Friendly Draft', text: patientFriendlyDraft(sections) });
              setAiIssues(null);
            }}
            className="w-full text-left px-3 py-2 text-sm rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            Create Patient-Friendly Draft
          </button>
        </div>

        {aiIssues && (
          <div className="mt-2.5 rounded-md border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600 space-y-1">
            <div className="font-semibold text-slate-500 uppercase tracking-wide text-[10px]">AI-generated · Source: This draft</div>
            {aiIssues.length === 0 ? <div>No structural omissions detected.</div> : aiIssues.map((i) => <div key={i}>• {i}</div>)}
          </div>
        )}

        {aiResult && (
          <div className="mt-2.5 rounded-md border border-slate-100 bg-slate-50 p-3 text-sm text-slate-700 whitespace-pre-wrap">
            <div className="font-semibold text-slate-500 uppercase tracking-wide text-[10px] mb-1">AI-generated · {aiResult.label}</div>
            {aiResult.text || <span className="text-slate-400">Nothing to summarize yet.</span>}
            {aiResult.label === 'Patient-Friendly Draft' && aiResult.text && (
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => onMessagePatient(aiResult.text)} className="text-xs font-semibold text-teal-700">
                  Message Patient
                </button>
              </div>
            )}
          </div>
        )}
      </div>}

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Quick Actions</h3>
        <div className="mt-2.5 grid gap-1.5">
          <button type="button" disabled={!noteReady} onClick={onCreateFollowUp} className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            <PinIcon size={14} /> Create Follow-Up Task
          </button>
          <button type="button" onClick={() => onMessagePatient()} className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50">
            <MessageIcon size={14} /> Message Patient
          </button>
          <a href={`/dashboard/records/${patient?.id}`} className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50">
            View Care Plan
          </a>
          <a href={`/dashboard/records/${patient?.id}/medications`} className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50">
            View Medication History
          </a>
          <a href={`/dashboard/records/${patient?.id}/concerns`} className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50">
            View Health Concerns
          </a>
          <a href={`/dashboard/records/${patient?.id}/documents`} className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50">
            View Documents
          </a>
        </div>
      </div>
    </div>
  );
}
