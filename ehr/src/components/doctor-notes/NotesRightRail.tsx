"use client";

import { useMemo, useState } from 'react';
import type { DoctorNote } from '@/types/doctorNote';
import { noteBodyText } from '@/types/doctorNote';
import { NOTE_TYPE_LABELS } from './constants';
import { SparkleIcon, PinIcon, MessageIcon, PrinterIcon, ExportIcon, DocumentIcon } from './Icons';

type Props = {
  notes: DoctorNote[];
  selectedNote: DoctorNote | null;
  patient: any;
  onAddNewNote: () => void;
  onCreateFollowUp: (note: DoctorNote) => void;
  onMessagePatient: (draftText?: string) => void;
  onPrintSelected: (note: DoctorNote) => void;
  onExportSelected: (note: DoctorNote) => void;
};

function mostCommonType(notes: DoctorNote[]): string {
  const counts: Record<string, number> = {};
  notes.forEach((n) => {
    counts[n.type] = (counts[n.type] || 0) + 1;
  });
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return top ? NOTE_TYPE_LABELS[top[0] as keyof typeof NOTE_TYPE_LABELS] : '—';
}

/** Deterministic, on-device summarization of the SELECTED note only (never the full chart). No clinical facts invented. */
function generateNoteSummary(note: DoctorNote): string {
  const text = noteBodyText(note);
  if (!text) return 'This note has no content yet.';
  const sentences = text.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/).filter(Boolean);
  return sentences.slice(0, 3).join(' ');
}

function documentationCheck(note: DoctorNote): string[] {
  const issues: string[] = [];
  const hasPlan = note.sections.some((s) => /plan/i.test(s.heading));
  const hasFollowUp = note.sections.some((s) => /follow-?up/i.test(s.heading)) || !!note.followUpTaskId;
  if (!hasPlan) issues.push('No Plan section present.');
  if (!hasFollowUp) issues.push('No follow-up section present.');
  if (note.status === 'draft') issues.push('Unsigned draft.');
  return issues;
}

function patientFriendlyDraft(note: DoctorNote): string {
  const text = noteBodyText(note);
  if (!text) return '';
  return `Summary of your recent visit:\n\n${text}\n\nPlease reach out if you have any questions about this visit.`;
}

export default function NotesRightRail({ notes, selectedNote, patient, onAddNewNote, onCreateFollowUp, onMessagePatient, onPrintSelected, onExportSelected }: Props) {
  const [aiTab, setAiTab] = useState<'summary' | 'check' | 'patient'>('summary');
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiIssues, setAiIssues] = useState<string[] | null>(null);
  const [aiUnavailable] = useState(false);

  const stats = useMemo(
    () => ({
      total: notes.length,
      recent: notes[0] ? new Date(notes[0].createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—',
      mostCommon: mostCommonType(notes),
      drafts: notes.filter((n) => n.status === 'draft').length,
      followUps: notes.filter((n) => !!n.followUpTaskId).length,
      signed: notes.filter((n) => n.status === 'signed' || n.status === 'amended' || n.status === 'corrected').length,
    }),
    [notes],
  );

  return (
    <div className="space-y-4">
      {/* Note Summary */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
        <h3 className="text-sm font-semibold text-slate-900">Note Summary</h3>
        <div className="mt-2.5 space-y-1.5 text-sm">
          <Row label="Total Notes" value={stats.total} />
          <Row label="Recent Note" value={stats.recent} />
          <Row label="Most Common Type" value={stats.mostCommon} />
          <Row label="Drafts" value={stats.drafts} />
          <Row label="Follow-Up Items" value={stats.followUps} />
          <Row label="Signed" value={stats.signed} />
        </div>
      </div>

      {/* AI Note Assistant */}
      <div className="rounded-xl border border-violet-100 bg-white shadow-sm p-4">
        <div className="flex items-center justify-between">
          <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900">
            <SparkleIcon size={15} className="text-violet-600" /> AI Note Assistant
          </h3>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded">Clinical review required</span>
        </div>

        {aiUnavailable ? (
          <div className="mt-3 text-sm text-slate-500">AI assistance unavailable. <button type="button" className="text-teal-700 font-medium">Retry</button></div>
        ) : !selectedNote ? (
          <p className="mt-3 text-sm text-slate-500">Select a note to use AI documentation assistance.</p>
        ) : (
          <div className="mt-3 space-y-2">
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setAiTab('summary');
                  setAiResult(generateNoteSummary(selectedNote));
                  setAiIssues(null);
                }}
                className="w-full text-left px-3 py-2 text-sm rounded-md bg-violet-50 text-violet-800 hover:bg-violet-100"
              >
                Generate Note Summary
              </button>
              <button
                type="button"
                onClick={() => {
                  setAiTab('check');
                  setAiIssues(documentationCheck(selectedNote));
                  setAiResult(null);
                }}
                className="w-full text-left px-3 py-2 text-sm rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                Documentation Check
              </button>
              <button
                type="button"
                onClick={() => {
                  setAiTab('patient');
                  setAiResult(patientFriendlyDraft(selectedNote));
                  setAiIssues(null);
                }}
                className="w-full text-left px-3 py-2 text-sm rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                Create Patient Summary
              </button>
            </div>

            {aiTab === 'check' && aiIssues && (
              <div className="mt-2 rounded-md border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600 space-y-1">
                <div className="font-semibold text-slate-500 uppercase tracking-wide text-[10px]">AI-generated · Source: Selected Note</div>
                {aiIssues.length === 0 ? <div>No structural omissions detected.</div> : aiIssues.map((i) => <div key={i}>• {i}</div>)}
              </div>
            )}

            {(aiTab === 'summary' || aiTab === 'patient') && aiResult && (
              <div className="mt-2 rounded-md border border-slate-100 bg-slate-50 p-3 text-sm text-slate-700 whitespace-pre-wrap">
                <div className="font-semibold text-slate-500 uppercase tracking-wide text-[10px] mb-1">AI-generated · Source: Selected Note</div>
                {aiResult}
                {aiTab === 'patient' && (
                  <div className="mt-2 flex gap-2">
                    <button type="button" onClick={() => setAiResult(aiResult)} className="text-xs font-semibold text-teal-700">
                      Edit
                    </button>
                    <button type="button" onClick={() => onMessagePatient(aiResult)} className="text-xs font-semibold text-teal-700">
                      Message Patient
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Patient Context */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
        <h3 className="text-sm font-semibold text-slate-900">Patient Context</h3>
        <div className="mt-2.5 space-y-3 text-sm">
          <div>
            <div className="text-xs text-slate-500 mb-1">Active Conditions</div>
            <div className="flex flex-wrap gap-1.5">
              {(patient?.conditions || []).length ? (
                (patient.conditions as string[]).map((c) => (
                  <span key={c} className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-xs border border-teal-100">
                    {c}
                  </span>
                ))
              ) : (
                <span className="text-slate-400 text-xs">None documented</span>
              )}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">Current Medications</div>
            <div className="flex flex-wrap gap-1.5">
              {(patient?.medications || []).length ? (
                (patient.medications as any[]).map((m) => (
                  <span key={m.name} className="px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 text-xs border border-violet-100">
                    {m.name}
                  </span>
                ))
              ) : (
                <span className="text-slate-400 text-xs">None documented</span>
              )}
            </div>
          </div>
          {patient?.careGaps?.length ? (
            <div>
              <div className="text-xs text-slate-500 mb-1">Care Plan</div>
              <span className="px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 text-xs border border-cyan-100">{patient.careGaps.length} open item{patient.careGaps.length === 1 ? '' : 's'}</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
        <h3 className="text-sm font-semibold text-slate-900">Quick Actions</h3>
        <div className="mt-2.5 grid gap-1.5">
          <button type="button" onClick={onAddNewNote} className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-md bg-teal-600 text-white hover:bg-teal-700">
            <DocumentIcon size={14} /> Add New Note
          </button>
          <button
            type="button"
            disabled={!selectedNote}
            onClick={() => selectedNote && onCreateFollowUp(selectedNote)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <PinIcon size={14} /> Create Follow-Up Task
          </button>
          <button type="button" onClick={() => onMessagePatient()} className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50">
            <MessageIcon size={14} /> Message Patient
          </button>
          <a href={`/dashboard/records/${patient?.id}/medications`} className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50">
            View Medication History
          </a>
          <a href={`/dashboard/records/${patient?.id}`} className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50">
            View Care Plan
          </a>
          <button
            type="button"
            disabled={!selectedNote}
            onClick={() => selectedNote && onPrintSelected(selectedNote)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <PrinterIcon size={14} /> Print Selected Note
          </button>
          <button
            type="button"
            disabled={!selectedNote}
            onClick={() => selectedNote && onExportSelected(selectedNote)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <ExportIcon size={14} /> Export Selected Note
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  );
}
