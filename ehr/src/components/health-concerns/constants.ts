import type { ConcernActor, ConcernAttentionStatus, ConcernClinicalStatus } from '@/types/healthConcern';

export const CLINICAL_STATUS_LABELS: Record<ConcernClinicalStatus, string> = {
  active: 'Active',
  monitoring: 'Monitoring',
  resolved: 'Resolved',
};

/** Clinical status styling: calm teal/blue (active), calm teal (monitoring), calm green (resolved). */
export const CLINICAL_STATUS_STYLES: Record<ConcernClinicalStatus, { chip: string; accent: string }> = {
  active: { chip: 'bg-sky-50 text-sky-700 border border-sky-100', accent: 'bg-sky-500' },
  monitoring: { chip: 'bg-teal-50 text-teal-700 border border-teal-100', accent: 'bg-teal-500' },
  resolved: { chip: 'bg-emerald-50 text-emerald-700 border border-emerald-100', accent: 'bg-emerald-500' },
};

export const ATTENTION_LABELS: Record<ConcernAttentionStatus, string> = {
  none: '',
  'needs-review': 'Needs Review',
  'follow-up-due': 'Follow-Up Due',
  critical: 'Critical',
};

/** Attention overrides the card's accent when present: soft amber (needs review/follow-up) or soft red (critical). */
export const ATTENTION_STYLES: Record<Exclude<ConcernAttentionStatus, 'none'>, { chip: string; accent: string; surface: string }> = {
  'needs-review': { chip: 'bg-amber-50 text-amber-800 border border-amber-100', accent: 'bg-amber-500', surface: '' },
  'follow-up-due': { chip: 'bg-amber-50 text-amber-800 border border-amber-100', accent: 'bg-amber-500', surface: '' },
  critical: { chip: 'bg-rose-50 text-rose-700 border border-rose-200', accent: 'bg-rose-600', surface: 'bg-rose-50/40' },
};

export function initialsOf(name?: string): string {
  if (!name) return 'NA';
  const parts = name.replace(/^Dr\.?\s+/i, '').split(' ').filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || 'NA';
}

export function formatConcernDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

export function formatConcernDateTime(iso?: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export function actorLabel(actor?: ConcernActor | null): string {
  return actor?.name || '—';
}

export function isPulseTerm(term: string): boolean {
  return /blood pressure|heart|cardiac|pulse/i.test(term);
}
