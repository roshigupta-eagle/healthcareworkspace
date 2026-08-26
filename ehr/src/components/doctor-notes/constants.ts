import type { DoctorNoteStatus, DoctorNoteType } from '@/types/doctorNote';

export const NOTE_TYPE_LABELS: Record<DoctorNoteType, string> = {
  progress: 'Progress Note',
  'follow-up': 'Follow-Up Note',
  phone: 'Phone Note',
  'care-plan': 'Care Plan Note',
  general: 'General Clinical Note',
};

export const NOTE_TYPE_ORDER: DoctorNoteType[] = ['progress', 'follow-up', 'phone', 'care-plan', 'general'];

/** Subtle, consistent accent per documentation category (never the sole status indicator). */
export const NOTE_TYPE_STYLES: Record<DoctorNoteType, { dot: string; chip: string; text: string }> = {
  progress: { dot: 'bg-sky-500', chip: 'bg-sky-50 border border-sky-100', text: 'text-sky-700' },
  'follow-up': { dot: 'bg-amber-500', chip: 'bg-amber-50 border border-amber-100', text: 'text-amber-800' },
  phone: { dot: 'bg-violet-500', chip: 'bg-violet-50 border border-violet-100', text: 'text-violet-700' },
  'care-plan': { dot: 'bg-teal-500', chip: 'bg-teal-50 border border-teal-100', text: 'text-teal-700' },
  general: { dot: 'bg-slate-400', chip: 'bg-slate-50 border border-slate-200', text: 'text-slate-600' },
};

export const NOTE_STATUS_LABELS: Record<DoctorNoteStatus, string> = {
  draft: 'Draft',
  'pending-signature': 'Pending Signature',
  signed: 'Signed',
  amended: 'Addended',
  corrected: 'Corrected',
  'entered-in-error': 'Entered in Error',
};

/** Critical=soft red, warning=soft amber, normal/complete=soft green, informational=soft blue. */
export const NOTE_STATUS_STYLES: Record<DoctorNoteStatus, { chip: string; icon: string }> = {
  draft: { chip: 'bg-amber-50 text-amber-800 border border-amber-100', icon: 'text-amber-600' },
  'pending-signature': { chip: 'bg-amber-50 text-amber-800 border border-amber-100', icon: 'text-amber-600' },
  signed: { chip: 'bg-emerald-50 text-emerald-700 border border-emerald-100', icon: 'text-emerald-600' },
  amended: { chip: 'bg-sky-50 text-sky-700 border border-sky-100', icon: 'text-sky-600' },
  corrected: { chip: 'bg-sky-50 text-sky-700 border border-sky-100', icon: 'text-sky-600' },
  'entered-in-error': { chip: 'bg-rose-50 text-rose-700 border border-rose-200', icon: 'text-rose-600' },
};

export function initialsOf(name?: string): string {
  if (!name) return 'NA';
  const parts = name.replace(/^Dr\.?\s+/i, '').split(' ').filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || 'NA';
}

const AVATAR_TONES = [
  'bg-indigo-50 text-indigo-700',
  'bg-sky-50 text-sky-700',
  'bg-teal-50 text-teal-700',
  'bg-violet-50 text-violet-700',
  'bg-amber-50 text-amber-800',
];

export function avatarToneOf(name?: string): string {
  if (!name) return AVATAR_TONES[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

export function formatNoteDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

export function formatNoteDateTime(iso?: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export function isOpenNote(status: DoctorNoteStatus): boolean {
  return status === 'draft' || status === 'pending-signature';
}
