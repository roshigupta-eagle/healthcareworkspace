"use client";

import { useEffect, useRef, useState } from 'react';
import type { DoctorNote } from '@/types/doctorNote';
import { DotsIcon } from './Icons';

export type NoteActionHandlers = {
  onEdit: (note: DoctorNote) => void;
  onDuplicate: (note: DoctorNote) => void;
  onPrint: (note: DoctorNote) => void;
  onExport: (note: DoctorNote) => void;
  onCreateFollowUp: (note: DoctorNote) => void;
  onAddendum: (note: DoctorNote) => void;
  onCorrection: (note: DoctorNote) => void;
  onEnteredInError: (note: DoctorNote) => void;
  onViewHistory: (note: DoctorNote) => void;
};

/** Secondary "more actions" menu. Only shows actions valid for the note's current lifecycle state. */
export default function NoteActionsMenu({ note, handlers, align = 'right' }: { note: DoctorNote; handlers: NoteActionHandlers; align?: 'left' | 'right' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  const isDraft = note.status === 'draft';
  const isFinalized = !isDraft && note.status !== 'entered-in-error';
  const isEnteredInError = note.status === 'entered-in-error';

  const items: Array<{ label: string; action: () => void; danger?: boolean }> = [];
  if (isDraft) items.push({ label: 'Continue Note', action: () => handlers.onEdit(note) });
  items.push({ label: 'Duplicate as New Draft', action: () => handlers.onDuplicate(note) });
  items.push({ label: 'Print', action: () => handlers.onPrint(note) });
  items.push({ label: 'Export', action: () => handlers.onExport(note) });
  items.push({ label: 'Create Follow-Up Task', action: () => handlers.onCreateFollowUp(note) });
  if (isFinalized) {
    items.push({ label: 'Add Addendum', action: () => handlers.onAddendum(note) });
    items.push({ label: 'Correct', action: () => handlers.onCorrection(note) });
  }
  if (!isEnteredInError) items.push({ label: 'Mark Entered in Error', action: () => handlers.onEnteredInError(note), danger: true });
  items.push({ label: 'View History', action: () => handlers.onViewHistory(note) });

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="More actions"
        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
      >
        <DotsIcon size={16} />
      </button>
      {open && (
        <div
          role="menu"
          className={`absolute z-30 mt-1 w-52 rounded-lg border border-slate-200 bg-white py-1 shadow-lg ${align === 'right' ? 'right-0' : 'left-0'}`}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                item.action();
              }}
              className={`w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50 ${item.danger ? 'text-rose-600' : 'text-slate-700'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
