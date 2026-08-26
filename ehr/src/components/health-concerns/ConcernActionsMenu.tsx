"use client";

import { useEffect, useRef, useState } from 'react';
import type { HealthConcern } from '@/types/healthConcern';
import { DotsIcon } from '@/components/doctor-notes/Icons';

export type ConcernActionHandlers = {
  onPinToggle: (concern: HealthConcern) => void;
  onResolve: (concern: HealthConcern) => void;
  onReopen: (concern: HealthConcern) => void;
  onEnteredInError: (concern: HealthConcern) => void;
  onViewTimeline: (concern: HealthConcern) => void;
  onViewChartActivity: (concern: HealthConcern) => void;
  hasChartActivity: boolean;
};

export default function ConcernActionsMenu({ concern, handlers, align = 'right' }: { concern: HealthConcern; handlers: ConcernActionHandlers; align?: 'left' | 'right' }) {
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

  const isResolved = concern.clinicalStatus === 'resolved';
  const isEnteredInError = !!concern.enteredInError;

  const items: Array<{ label: string; action: () => void; danger?: boolean }> = [
    { label: concern.pinned ? 'Unpin' : 'Pin', action: () => handlers.onPinToggle(concern) },
    { label: 'View in Timeline', action: () => handlers.onViewTimeline(concern) },
  ];
  if (handlers.hasChartActivity) items.push({ label: 'View Chart Activity', action: () => handlers.onViewChartActivity(concern) });
  if (!isResolved) items.push({ label: 'Mark Resolved', action: () => handlers.onResolve(concern) });
  if (isResolved) items.push({ label: 'Reopen', action: () => handlers.onReopen(concern) });
  if (!isEnteredInError) items.push({ label: 'Mark Entered in Error', action: () => handlers.onEnteredInError(concern), danger: true });

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
        <div role="menu" className={`absolute z-30 mt-1 w-52 rounded-lg border border-slate-200 bg-white py-1 shadow-lg ${align === 'right' ? 'right-0' : 'left-0'}`}>
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
