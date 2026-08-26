"use client";

import type { DoctorNote } from '@/types/doctorNote';
import { DocumentIcon, ClockIcon, PinIcon, AlertIcon } from './Icons';

type Props = {
  notes: DoctorNote[];
  activeCard: string | null;
  onSelectCard: (card: string | null) => void;
};

/** Four compact, semantically-colored metric cards summarizing the documentation workspace. */
export default function NotesSummaryStrip({ notes, activeCard, onSelectCard }: Props) {
  const total = notes.length;
  const recent = notes[0] ? notes[0].createdAt : null;
  const followUpCount = notes.filter((n) => !!n.followUpTaskId).length;
  const needsAction = notes.filter((n) => n.status === 'draft' || n.status === 'pending-signature').length;

  const cards: Array<{
    key: string;
    label: string;
    value: string;
    sub?: string;
    icon: React.ReactNode;
    tone: string;
    iconTone: string;
  }> = [
    {
      key: 'total',
      label: 'Total Notes',
      value: String(total),
      sub: 'All documentation',
      icon: <DocumentIcon size={18} />,
      tone: 'bg-sky-50/70 border-sky-100',
      iconTone: 'bg-sky-100 text-sky-700',
    },
    {
      key: 'recent',
      label: 'Recent Notes',
      value: recent ? new Date(recent).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—',
      sub: 'Most recent entry',
      icon: <ClockIcon size={18} />,
      tone: 'bg-teal-50/70 border-teal-100',
      iconTone: 'bg-teal-100 text-teal-700',
    },
    {
      key: 'followup',
      label: 'Follow-Up Items',
      value: String(followUpCount),
      sub: followUpCount === 1 ? '1 note with a task' : `${followUpCount} notes with tasks`,
      icon: <PinIcon size={18} />,
      tone: 'bg-amber-50/70 border-amber-100',
      iconTone: 'bg-amber-100 text-amber-800',
    },
    {
      key: 'action',
      label: 'Needs Action',
      value: String(needsAction),
      sub: needsAction > 0 ? 'Drafts awaiting signature' : 'Nothing pending',
      icon: <AlertIcon size={18} />,
      tone: needsAction > 0 ? 'bg-rose-50/70 border-rose-100' : 'bg-slate-50 border-slate-200',
      iconTone: needsAction > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => {
        const isActive = activeCard === c.key;
        return (
          <button
            key={c.key}
            type="button"
            onClick={() => onSelectCard(isActive ? null : c.key)}
            aria-pressed={isActive}
            className={`text-left rounded-xl border ${c.tone} px-4 py-3 transition hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 ${isActive ? 'ring-2 ring-teal-300 shadow-sm' : ''}`}
          >
            <div className="flex items-center gap-2.5">
              <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${c.iconTone}`}>{c.icon}</span>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{c.label}</div>
                <div className="text-xl font-bold text-slate-900 leading-tight">{c.value}</div>
              </div>
            </div>
            {c.sub && <div className="mt-1.5 text-[11px] text-slate-500 truncate">{c.sub}</div>}
          </button>
        );
      })}
    </div>
  );
}
