"use client";

import { useState } from 'react';
import type { DoctorNote } from '@/types/doctorNote';
import type { ClinicalTask } from '@/types/clinicalTask';
import { NOTE_STATUS_LABELS, NOTE_STATUS_STYLES, NOTE_TYPE_LABELS, avatarToneOf, formatNoteDateTime, initialsOf } from './constants';
import { AlertIcon, CheckCircleIcon, ChevronRightIcon, PencilIcon, PinIcon, PrinterIcon } from './Icons';
import NoteActionsMenu, { type NoteActionHandlers } from './NoteActionsMenu';

type Props = {
  note: DoctorNote | null;
  followUpTask: ClinicalTask | null;
  actionHandlers: NoteActionHandlers;
  onOpenFollowUpTask: (note: DoctorNote) => void;
};

function SectionBlock({ heading, body }: { heading: string; body: string }) {
  const [collapsed, setCollapsed] = useState(false);
  const isLong = body.length > 600;

  return (
    <div className="border-t border-slate-100 first:border-t-0 pt-4 first:pt-0 mt-4 first:mt-0">
      {heading && (
        <button
          type="button"
          onClick={() => isLong && setCollapsed((c) => !c)}
          className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2"
        >
          {heading}
          {isLong && <ChevronRightIcon size={12} className={`transition-transform ${collapsed ? '' : 'rotate-90'}`} />}
        </button>
      )}
      {!collapsed && (
        <p className="text-[14.5px] leading-7 text-slate-800 whitespace-pre-wrap max-w-[70ch]">{body || '—'}</p>
      )}
    </div>
  );
}

export default function SelectedNoteDetail({ note, followUpTask, actionHandlers, onOpenFollowUpTask }: Props) {
  if (!note) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-10 text-center">
        <div className="text-sm text-slate-500">Select a note from the timeline to view its details.</div>
      </div>
    );
  }

  const statusStyle = NOTE_STATUS_STYLES[note.status];
  const isDraft = note.status === 'draft';

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900">{NOTE_TYPE_LABELS[note.type]}</h2>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${statusStyle.chip}`}>{NOTE_STATUS_LABELS[note.status]}</span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
            <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold ${avatarToneOf(note.author.name)}`}>{initialsOf(note.author.name)}</span>
            <span className="font-medium text-slate-700">{note.author.name}</span>
            <span>·</span>
            <span>{formatNoteDateTime(note.createdAt)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isDraft ? (
            <button type="button" onClick={() => actionHandlers.onEdit(note)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-md bg-teal-600 text-white hover:bg-teal-700 transition">
              <PencilIcon size={14} /> Continue Note
            </button>
          ) : (
            <button type="button" onClick={() => actionHandlers.onCreateFollowUp(note)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-md bg-teal-600 text-white hover:bg-teal-700 transition">
              <PinIcon size={14} /> Create Follow-Up Task
            </button>
          )}
          <button type="button" onClick={() => actionHandlers.onPrint(note)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50">
            <PrinterIcon size={14} /> Print
          </button>
          <NoteActionsMenu note={note} handlers={actionHandlers} />
        </div>
      </div>

      {note.status === 'entered-in-error' && note.enteredInError && (
        <div className="mx-5 mt-4 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3">
          <AlertIcon size={16} className="text-rose-600 mt-0.5" />
          <div className="text-sm">
            <div className="font-semibold text-rose-800">Entered in Error</div>
            <div className="text-rose-700">{note.enteredInError.reason} — {note.enteredInError.by.name}, {formatNoteDateTime(note.enteredInError.at)}</div>
          </div>
        </div>
      )}

      <div className="px-5 py-4">
        {note.sections.map((s, i) => (
          <SectionBlock key={`${note.id}-section-${i}`} heading={s.heading} body={s.body} />
        ))}
      </div>

      {note.correction && (
        <div className="mx-5 mb-4 rounded-lg border border-sky-100 bg-sky-50 px-3.5 py-3 text-sm">
          <div className="font-semibold text-sky-800">Correction on {formatNoteDateTime(note.correction.correctedAt)}</div>
          <div className="text-sky-700 mt-0.5">Reason: {note.correction.reason} — {note.correction.correctedBy.name}</div>
        </div>
      )}

      {note.addenda.length > 0 && (
        <div className="mx-5 mb-4 space-y-2.5">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Addenda</div>
          {note.addenda.map((a) => (
            <div key={a.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3.5 py-3">
              <div className="text-sm text-slate-800 whitespace-pre-wrap">{a.text}</div>
              <div className="mt-1.5 text-xs text-slate-500">{a.author.name} · {formatNoteDateTime(a.createdAt)}</div>
            </div>
          ))}
        </div>
      )}

      <div className="mx-5 mb-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-lg bg-slate-50 border border-slate-100 px-3.5 py-3">
          <div className="text-xs text-slate-500">Signature</div>
          <div className="mt-1 text-sm font-medium text-slate-800">
            {note.signer ? (
              <span className="inline-flex items-center gap-1.5"><CheckCircleIcon size={14} className="text-emerald-600" />{note.signer.name} · {formatNoteDateTime(note.signedAt)}</span>
            ) : (
              <span className="text-amber-700">Not yet signed</span>
            )}
          </div>
        </div>

        <div className="rounded-lg bg-slate-50 border border-slate-100 px-3.5 py-3">
          <div className="text-xs text-slate-500">Follow-Up</div>
          {note.followUpTaskId ? (
            <button type="button" onClick={() => onOpenFollowUpTask(note)} className="mt-1 text-sm font-medium text-teal-700 hover:text-teal-800">
              {followUpTask?.status === 'completed' ? 'Follow-Up Complete' : 'Follow-Up Open'} — view task
            </button>
          ) : (
            <div className="mt-1 text-sm text-slate-500">No follow-up task linked to this note.</div>
          )}
        </div>
      </div>

      <div className="mx-5 mb-5 flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 pt-3">
        <span>Version {note.version} · {note.history.length} history event{note.history.length === 1 ? '' : 's'}</span>
        <button type="button" onClick={() => actionHandlers.onViewHistory(note)} className="font-medium text-teal-700 hover:text-teal-800">
          View History
        </button>
      </div>
    </div>
  );
}
