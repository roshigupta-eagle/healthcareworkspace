/**
 * Allergy & Intolerance Safety Command Center: pure read-model helpers.
 *
 * Clinical safety rules encoded here:
 *  - "No Known Allergies" (NKA) is NEVER inferred from an empty allergy list.
 *    It requires an explicit, verified 'confirmed-nka' status in the review store.
 *    Otherwise, status is "ALLERGY STATUS NOT DOCUMENTED".
 *  - Safety check status is NEVER computed in React — it reads the authoritative
 *    safety service result. If that status is 'unavailable', the UI MUST report
 *    "Safety check unavailable", NEVER "Clear".
 *  - Clinical status ('active'|'inactive'|'resolved'|'entered-in-error') and
 *    Verification status ('confirmed'|'unconfirmed'|'provisional'|'refuted') are
 *    kept strictly distinct.
 */
import type { AllergyRecord, ClinicalStatus, VerificationStatus, Severity, Criticality } from './allergyStore';
import type { AllergyReviewRecord, NkaStatus } from './allergyReviewStore';
import type { PatientAllergySafetyResult } from './allergySafetyStore';

export function clinicalStatusLabel(status: ClinicalStatus): string {
  switch (status) {
    case 'active': return 'Active';
    case 'inactive': return 'Inactive';
    case 'resolved': return 'Resolved';
    case 'entered-in-error': return 'Entered in Error';
    default: return status;
  }
}

export function verificationLabel(v: VerificationStatus): string {
  switch (v) {
    case 'confirmed': return 'Confirmed';
    case 'unconfirmed': return 'Unconfirmed';
    case 'provisional': return 'Provisional';
    case 'refuted': return 'Refuted';
    case 'entered-in-error': return 'Entered in Error';
    default: return v;
  }
}

export function criticalityLabel(c?: Criticality): string {
  switch (c) {
    case 'high': return 'High Criticality';
    case 'low': return 'Low Criticality';
    case 'unable-to-assess': return 'Unable to Assess Criticality';
    default: return 'Criticality Unspecified';
  }
}

export function severityLabel(s?: Severity): string {
  switch (s) {
    case 'severe': return 'Severe';
    case 'moderate': return 'Moderate';
    case 'mild': return 'Mild';
    default: return 'Unspecified Severity';
  }
}

export type HeroSafetyState = 'severe-active' | 'active-allergies' | 'verified-nka' | 'not-documented';

/**
 * MANDATORY SAFETY RULE:
 *  - An empty allergy list with NO verified NKA statement returns 'not-documented'.
 *  - ONLY returns 'verified-nka' when review.nkaStatus === 'confirmed-nka'.
 */
export function determineHeroSafetyState(
  allergies: AllergyRecord[],
  review: AllergyReviewRecord | null,
): HeroSafetyState {
  const active = allergies.filter((a) => a.clinicalStatus === 'active');
  if (active.some((a) => a.criticality === 'high' || a.reactions.some((r) => r.severity === 'severe'))) {
    return 'severe-active';
  }
  if (active.length > 0) {
    return 'active-allergies';
  }
  if (review?.nkaStatus === 'confirmed-nka') {
    return 'verified-nka';
  }
  return 'not-documented';
}

export type OverallSafetyCheckStatus = 'clear' | 'conflict' | 'unavailable';

/**
 * MANDATORY SAFETY RULE:
 *  - If safety service status is 'unavailable' or result is null, return 'unavailable'.
 *  - NEVER return 'clear' when safety checks failed or were not completed!
 */
export function overallSafetyStatus(result: PatientAllergySafetyResult | null): OverallSafetyCheckStatus {
  if (!result || result.status === 'unavailable') return 'unavailable';
  if (result.conflicts && result.conflicts.length > 0) return 'conflict';
  return 'clear';
}

export interface AllergyCategorySummary {
  medication: AllergyRecord[];
  food: AllergyRecord[];
  environmental: AllergyRecord[];
  latex: AllergyRecord[];
  other: AllergyRecord[];
}

export function computeCategorySummary(allergies: AllergyRecord[]): AllergyCategorySummary {
  const active = allergies.filter((a) => a.clinicalStatus === 'active');
  const medication = active.filter((a) => (a.category || []).includes('medication'));
  const food = active.filter((a) => (a.category || []).includes('food'));
  const environmental = active.filter((a) => (a.category || []).includes('environmental'));
  const latex = active.filter((a) => (a.category || []).includes('latex') || a.substance.display.toLowerCase().includes('latex'));
  const other = active.filter((a) => !(a.category || []).some((c) => ['medication', 'food', 'environmental', 'latex'].includes(c)));
  return { medication, food, environmental, latex, other };
}

export interface AllergySnapshot {
  activeCount: number;
  unverifiedCount: number;
  conflictsCount: number;
  lastReviewedAt?: string;
  patientReportedCount: number;
  safetyCheckStatus: OverallSafetyCheckStatus;
  heroState: HeroSafetyState;
}

export function computeSnapshot(
  allergies: AllergyRecord[],
  review: AllergyReviewRecord | null,
  safety: PatientAllergySafetyResult | null,
): AllergySnapshot {
  const active = allergies.filter((a) => a.clinicalStatus === 'active');
  const activeCount = active.length;
  const unverifiedCount = active.filter((a) => a.verificationStatus !== 'confirmed').length;
  const conflictsCount = safety?.status === 'completed' ? (safety.conflicts || []).length : 0;
  const patientReportedCount = active.filter((a) => (a.source || '').toLowerCase().includes('patient')).length;
  const safetyCheckStatus = overallSafetyStatus(safety);
  const heroState = determineHeroSafetyState(allergies, review);
  const lastReviewedAt = review?.lastReviewedAt || (allergies[0]?.lastReviewedAt);

  return {
    activeCount,
    unverifiedCount,
    conflictsCount,
    lastReviewedAt,
    patientReportedCount,
    safetyCheckStatus,
    heroState,
  };
}

export interface AttentionItem {
  id: string;
  title: string;
  reason: string;
  tone: 'red' | 'amber';
  actionLabel: string;
}

export function computeNeedsAttention(
  allergies: AllergyRecord[],
  review: AllergyReviewRecord | null,
  safety: PatientAllergySafetyResult | null,
): AttentionItem[] {
  const items: AttentionItem[] = [];

  // Severe allergies
  const severe = allergies.filter((a) => a.clinicalStatus === 'active' && (a.criticality === 'high' || a.reactions.some((r) => r.severity === 'severe')));
  for (const a of severe) {
    const rx = a.reactions.map((r) => r.manifestation).join(', ') || 'Severe reaction';
    items.push({ id: a.id, title: a.substance.display, reason: `Severe reaction: ${rx}`, tone: 'red', actionLabel: 'Review Allergy' });
  }

  // Medication conflicts
  if (safety?.status === 'completed' && safety.conflicts) {
    for (const c of safety.conflicts) {
      items.push({ id: `conflict-${c.id}`, title: c.medicationName, reason: `Potential conflict with ${c.allergenName} (${c.reaction})`, tone: 'red', actionLabel: 'Review Conflict' });
    }
  }

  // Safety service failure warning
  if (!safety || safety.status === 'unavailable') {
    items.push({ id: 'safety-unavailable', title: 'Medication Safety Checks', reason: 'Automated allergy conflict checking unavailable', tone: 'amber', actionLabel: 'Retry Safety Check' });
  }

  // Unverified patient reports
  const unverifiedReports = allergies.filter((a) => a.clinicalStatus === 'active' && a.verificationStatus !== 'confirmed' && (a.source || '').toLowerCase().includes('patient'));
  for (const a of unverifiedReports) {
    items.push({ id: `unverified-${a.id}`, title: a.substance.display, reason: 'Patient-reported allergy pending clinician verification', tone: 'amber', actionLabel: 'Verify Allergy' });
  }

  // Un-documented status warning
  if (!review || review.nkaStatus === 'not-documented') {
    items.push({ id: 'review-due', title: 'Allergy Status', reason: 'Allergy status is not documented — assessment required', tone: 'amber', actionLabel: 'Complete Review' });
  }

  items.sort((a, b) => (a.tone === b.tone ? 0 : a.tone === 'red' ? -1 : 1));
  return items.slice(0, 3);
}

export type AllergyAction =
  | 'view'
  | 'view-history'
  | 'edit'
  | 'review'
  | 'resolve'
  | 'refute'
  | 'reopen'
  | 'correct'
  | 'mark-entered-in-error';

export function availableAllergyActions(allergy: AllergyRecord): AllergyAction[] {
  const base: AllergyAction[] = ['view', 'view-history'];
  switch (allergy.clinicalStatus) {
    case 'entered-in-error':
      return base;
    case 'resolved':
      return [...base, 'reopen', 'correct'];
    case 'inactive':
      return [...base, 'reopen', 'correct', 'mark-entered-in-error'];
    case 'active':
    default:
      return [...base, 'edit', 'review', 'resolve', 'refute', 'correct', 'mark-entered-in-error'];
  }
}

export function accessibleAllergySummary(allergy: AllergyRecord): string {
  const name = allergy.substance.display;
  const status = clinicalStatusLabel(allergy.clinicalStatus).toLowerCase();
  const verification = verificationLabel(allergy.verificationStatus).toLowerCase();
  const rxList = allergy.reactions.map((r) => `${r.manifestation}${r.severity ? ` (${r.severity})` : ''}`).join(', ') || 'No reaction documented';
  const lastRev = allergy.lastReviewedAt ? `Last reviewed ${allergy.lastReviewedAt}.` : 'Not yet reviewed.';
  return `${name} allergy, ${status} and ${verification}. Reaction: ${rxList}. ${lastRev}`;
}
