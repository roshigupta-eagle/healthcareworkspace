"use client";

import { useEffect, useState } from 'react';
import type { DoctorNoteType } from '@/types/doctorNote';
import { DOCTOR_NOTE_TEMPLATES, type DoctorNoteTemplate } from '@/lib/noteTemplates';
import { NOTE_TYPE_LABELS, NOTE_TYPE_ORDER, NOTE_TYPE_STYLES } from '@/components/doctor-notes/constants';

const PINNED_KEY = 'roshi.doctorNotes.pinnedTemplates.v1';
const RECENT_KEY = 'roshi.doctorNotes.recentTemplates.v1';

function readIds(key: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeIds(key: string, ids: string[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(ids.slice(0, 8)));
  } catch {
    // ignore storage failures
  }
}

type Props = {
  type: DoctorNoteType;
  onTypeChange: (t: DoctorNoteType) => void;
  onChoose: (template: DoctorNoteTemplate | null) => void;
};

export default function TemplateStep({ type, onTypeChange, onChoose }: Props) {
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);

  useEffect(() => {
    setPinnedIds(readIds(PINNED_KEY));
    setRecentIds(readIds(RECENT_KEY));
  }, []);

  function togglePin(id: string) {
    setPinnedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((p) => p !== id) : [id, ...prev];
      writeIds(PINNED_KEY, next);
      return next;
    });
  }

  function choose(template: DoctorNoteTemplate | null) {
    if (template) {
      const next = [template.id, ...recentIds.filter((id) => id !== template.id)];
      setRecentIds(next);
      writeIds(RECENT_KEY, next);
    }
    onChoose(template);
  }

  const pinned = pinnedIds.map((id) => DOCTOR_NOTE_TEMPLATES.find((t) => t.id === id)).filter(Boolean) as DoctorNoteTemplate[];
  const recent = recentIds.map((id) => DOCTOR_NOTE_TEMPLATES.find((t) => t.id === id)).filter(Boolean) as DoctorNoteTemplate[];

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-8">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Note Type</h2>
        <p className="mt-1 text-sm text-slate-500">Choose the documentation type. This determines the note's structure.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {NOTE_TYPE_ORDER.map((t) => {
            const style = NOTE_TYPE_STYLES[t];
            const active = type === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => onTypeChange(t)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full border transition ${active ? `${style.chip} ${style.text} ring-1 ring-inset ring-current` : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                {NOTE_TYPE_LABELS[t]}
              </button>
            );
          })}
        </div>
      </div>

      {pinned.length > 0 && <TemplateGroup title="My Favorites" templates={pinned} pinnedIds={pinnedIds} onPin={togglePin} onChoose={choose} />}
      {recent.length > 0 && <TemplateGroup title="Recently Used" templates={recent} pinnedIds={pinnedIds} onPin={togglePin} onChoose={choose} />}
      <TemplateGroup title="Organization Templates" templates={DOCTOR_NOTE_TEMPLATES.filter((t) => t.type === type)} pinnedIds={pinnedIds} onPin={togglePin} onChoose={choose} />

      <button type="button" onClick={() => choose(null)} className="w-full rounded-lg border border-dashed border-slate-300 py-3 text-sm font-medium text-slate-600 hover:border-teal-300 hover:text-teal-700">
        Start Blank
      </button>
    </div>
  );
}

function TemplateGroup({
  title,
  templates,
  pinnedIds,
  onPin,
  onChoose,
}: {
  title: string;
  templates: DoctorNoteTemplate[];
  pinnedIds: string[];
  onPin: (id: string) => void;
  onChoose: (t: DoctorNoteTemplate) => void;
}) {
  if (!templates.length) return null;
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">{title}</h3>
      <div className="space-y-1.5">
        {templates.map((t) => (
          <div key={t.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 hover:border-teal-200">
            <button type="button" onClick={() => onChoose(t)} className="flex-1 text-left text-sm font-medium text-slate-800">
              {t.label}
            </button>
            <button
              type="button"
              onClick={() => onPin(t.id)}
              aria-label={pinnedIds.includes(t.id) ? 'Unfavorite template' : 'Favorite template'}
              className={`text-xs font-medium px-2 py-1 rounded ${pinnedIds.includes(t.id) ? 'text-amber-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {pinnedIds.includes(t.id) ? '★' : '☆'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
