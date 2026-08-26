"use client";

import { useMemo, useState } from 'react';
import type { DoctorNote } from '@/types/doctorNote';
import { NOTE_STATUS_LABELS, NOTE_STATUS_STYLES, NOTE_TYPE_LABELS, NOTE_TYPE_STYLES, avatarToneOf, formatNoteDate, initialsOf } from './constants';
import { noteSnippet } from '@/types/doctorNote';
import { PinIcon } from './Icons';
import NoteActionsMenu, { type NoteActionHandlers } from './NoteActionsMenu';

export type QuickFilter = 'all' | 'recent' | 'drafts' | 'signed' | 'followup' | 'action';

const QUICK_FILTERS: Array<{ key: QuickFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'recent', label: 'Recent' },
  { key: 'drafts', label: 'Drafts' },
  { key: 'signed', label: 'Signed' },
  { key: 'followup', label: 'Follow-Up' },
  { key: 'action', label: 'Needs Action' },
];

function dateGroupLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOf = (dt: Date) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  const diffDays = Math.floor((+startOf(now) - +startOf(d)) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays > 1 && diffDays <= 7) return 'Earlier This Week';
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

type Props = {
  notes: DoctorNote[];
  quickFilter: QuickFilter;
  onQuickFilterChange: (f: QuickFilter) => void;
  selectedId: string | null;
  onSelect: (note: DoctorNote) => void;
  onCopyText: (note: DoctorNote) => void;
  actionHandlers: NoteActionHandlers;
  onOpenFollowUpTask: (note: DoctorNote) => void;
};

export default function NotesTimeline({ notes, quickFilter, onQuickFilterChange, selectedId, onSelect, onCopyText, actionHandlers, onOpenFollowUpTask }: Props) {
  const [visibleCount, setVisibleCount] = useState(25);

  const quickFiltered = useMemo(() => {
    switch (quickFilter) {
      case 'recent': {
        const cutoff = Date.now() - 30 * 86400000;
        return notes.filter((n) => new Date(n.createdAt).getTime() >= cutoff);
      }
      case 'drafts':
        return notes.filter((n) => n.status === 'draft');
      case 'signed':
        return notes.filter((n) => n.status === 'signed' || n.status === 'amended' || n.status === 'corrected');
      case 'followup':
        return notes.filter((n) => !!n.followUpTaskId);
      case 'action':
        return notes.filter((n) => n.status === 'draft' || n.status === 'pending-signature');
      default:
        return notes;
    }
  }, [notes, quickFilter]);

  const windowed = quickFiltered.slice(0, visibleCount);
  const hasMore = quickFiltered.length > windowed.length;

  const grouped = useMemo(() => {
    const groups = new Map<string, DoctorNote[]>();
    for (const n of windowed) {
      const label = dateGroupLabel(n.createdAt);
      const arr = groups.get(label) || [];
      arr.push(n);
      groups.set(label, arr);
    }
    return Array.from(groups.entries());
  }, [windowed]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between px-5 pt-4">
        <h2 className="text-base font-semibold text-slate-900">Notes Timeline</h2>
        <span className="text-xs text-slate-500">Showing {quickFiltered.length} of {notes.length} notes</span>
      </div>

      <div className="flex flex-wrap gap-1.5 px-5 pt-3 pb-1">
        {QUICK_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => onQuickFilterChange(f.key)}
            className={`px-2.5 py-1 text-xs font-medium rounded-full border transition ${quickFilter === f.key ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="px-5 pb-5 pt-2">
        {quickFiltered.length === 0 ? (
          <div className="rounded-lg bg-slate-50 border border-slate-100 py-10 text-center">
            <div className="text-sm font-medium text-slate-700">No notes match these filters</div>
            <button type="button" onClick={() => onQuickFilterChange('all')} className="mt-2 text-xs font-semibold text-teal-700 hover:text-teal-800">
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {grouped.map(([label, items]) => (
              <div key={label}>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">{label}</div>
                <div className="relative pl-5">
                  <div className="absolute left-[5px] top-2 bottom-2 w-px bg-slate-100" aria-hidden />
                  <div className="space-y-2.5">
                    {items.map((note) => {
                      const isSelected = note.id === selectedId;
                      const typeStyle = NOTE_TYPE_STYLES[note.type];
                      const statusStyle = NOTE_STATUS_STYLES[note.status];
                      return (
                        <div key={note.id} className="relative">
                          <span className={`absolute -left-5 top-4 h-2.5 w-2.5 rounded-full ring-4 ring-white ${typeStyle.dot}`} aria-hidden />
                          <div
                            role="button"
                            tabIndex={0}
                            aria-pressed={isSelected}
                            aria-label={`Open ${NOTE_TYPE_LABELS[note.type]} from ${note.author.name} on ${formatNoteDate(note.createdAt)}`}
                            onClick={() => onSelect(note)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onSelect(note);
                              }
                            }}
                            className={`group rounded-lg border p-3.5 cursor-pointer transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 ${
                              isSelected ? 'border-teal-300 bg-teal-50/60 shadow-sm' : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 min-w-0">
                                <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatarToneOf(note.author.name)}`}>
                                  {initialsOf(note.author.name)}
                                </span>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 text-sm">
                                    <span className="font-medium text-slate-900">{note.author.name}</span>
                                    <span className="text-slate-400">·</span>
                                    <span className="text-slate-500">{formatNoteDate(note.createdAt)}</span>
                                    {note.pinned && <PinIcon size={12} className="text-amber-500" />}
                                  </div>
                                  <div className="mt-1 flex items-center gap-1.5">
                                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${typeStyle.chip} ${typeStyle.text}`}>
                                      {NOTE_TYPE_LABELS[note.type]}
                                    </span>
                                  </div>
                                  <p className="mt-1.5 text-sm text-slate-600 line-clamp-2">{noteSnippet(note) || 'No content yet.'}</p>
                                  {note.followUpTaskId && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onOpenFollowUpTask(note);
                                      }}
                                      className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 hover:bg-amber-100"
                                    >
                                      <PinIcon size={11} /> Follow-Up
                                    </button>
                                  )}
                                </div>
                              </div>

                              <div className="flex shrink-0 flex-col items-end gap-2">
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${statusStyle.chip}`}>
                                  {NOTE_STATUS_LABELS[note.status]}
                                </span>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onSelect(note);
                                    }}
                                    className="text-xs font-medium text-teal-700 hover:text-teal-800 px-1.5 py-1"
                                  >
                                    View
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onCopyText(note);
                                    }}
                                    className="text-xs font-medium text-slate-500 hover:text-slate-700 px-1.5 py-1"
                                  >
                                    Copy
                                  </button>
                                  <NoteActionsMenu note={note} handlers={actionHandlers} />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}

            {hasMore && (
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setVisibleCount((v) => v + 25)}
                  className="text-sm font-medium text-teal-700 hover:text-teal-800 px-3 py-1.5 rounded-md border border-teal-100 hover:bg-teal-50"
                >
                  Load Earlier Notes
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
