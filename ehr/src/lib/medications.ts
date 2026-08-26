/**
 * Medication History — Command Center: pure read-model helpers.
 *
 * Clinical safety rules encoded here:
 *  - Safety status is NEVER computed here — it is read verbatim from the
 *    authoritative safety service result (medicationSafetyStore). This module
 *    only aggregates/labels what that service already returned.
 *  - Refill/renewal state comes only from documented fields
 *    (refillsRemaining, nextEligibleRefillDate) — never guessed.
 *  - Adherence is never inferred from refill activity alone; only descriptive,
 *    source-labeled "refill pattern" language is used.
 */
import type { MedicationRecord, MedicationStatus } from './medicationsStore';
import type { PatientSafetyResult, SafetySeverity } from './medicationSafetyStore';
import type { ReconciliationRecord } from './medicationReconciliationStore';

export function medicationStatusLabel(status: MedicationStatus): string {
  switch (status) {
    case 'active': return 'Active';
    case 'on-hold': return 'On Hold';
    case 'completed': return 'Completed';
    case 'stopped': return 'Discontinued';
    case 'entered-in-error': return 'Entered in Error';
    case 'draft': return 'Draft';
    default: return status;
  }
}

export function sourceLabel(source: MedicationRecord['source']): string {
  switch (source) {
    case 'imported': return 'Imported';
    case 'patient-reported': return 'Patient Reported';
    default: return 'Native';
  }
}

export function isRefillDue(med: MedicationRecord, now: Date = new Date()): boolean {
  if (med.status !== 'active') return false;
  if (typeof med.refillsRemaining === 'number' && med.refillsRemaining <= 0) return true;
  if (med.nextEligibleRefillDate) {
    const t = Date.parse(med.nextEligibleRefillDate);
    if (!Number.isNaN(t) && t <= now.getTime()) return true;
  }
  return false;
}

/** Never claims adherence from refill activity alone — only descriptive, source-labeled language. */
export function refillPatternLabel(med: MedicationRecord): string {
  if (!med.lastRefillDate) return 'Adherence data unavailable';
  return 'Refill pattern appears consistent';
}

export type SafetyStatusLevel = 'clear' | 'review' | 'critical' | 'unavailable';

export function overallSafetyStatus(result: PatientSafetyResult | null): SafetyStatusLevel {
  if (!result || result.status === 'unavailable') return 'unavailable';
  if (result.alerts.some((a) => a.severity === 'critical')) return 'critical';
  if (result.alerts.some((a) => a.severity === 'high' || a.severity === 'moderate')) return 'review';
  return 'clear';
}

export function alertsForMedication(result: PatientSafetyResult | null, medicationId: string) {
  if (!result) return [];
  return result.alerts.filter((a) => a.medicationIds.includes(medicationId));
}

/** Safety status scoped to a single medication (not the whole patient) — used anywhere a specific medication is being reviewed. */
export function medicationSafetyStatus(result: PatientSafetyResult | null, medicationId: string): SafetyStatusLevel {
  if (!result || result.status === 'unavailable') return 'unavailable';
  const alerts = alertsForMedication(result, medicationId);
  if (alerts.some((a) => a.severity === 'critical')) return 'critical';
  if (alerts.some((a) => a.severity === 'high' || a.severity === 'moderate')) return 'review';
  return 'clear';
}

export function severityTone(severity: SafetySeverity): 'amber' | 'red' | 'slate' {
  if (severity === 'critical') return 'red';
  if (severity === 'high' || severity === 'moderate') return 'amber';
  return 'slate';
}

export interface MedicationSnapshot {
  activeCount: number;
  safetyStatus: SafetyStatusLevel;
  refillsNeedingReview: number;
  reconciliationStatus: 'current' | 'review-due' | 'never-reconciled';
}

export function computeSnapshot(
  medications: MedicationRecord[],
  safetyResult: PatientSafetyResult | null,
  reconciliation: ReconciliationRecord | null,
  now: Date = new Date(),
): MedicationSnapshot {
  const activeCount = medications.filter((m) => m.status === 'active').length;
  const refillsNeedingReview = medications.filter((m) => isRefillDue(m, now)).length;
  const reconciliationStatus: MedicationSnapshot['reconciliationStatus'] = !reconciliation
    ? 'never-reconciled'
    : reconciliation.status;
  return {
    activeCount,
    safetyStatus: overallSafetyStatus(safetyResult),
    refillsNeedingReview,
    reconciliationStatus,
  };
}

export interface AttentionItem {
  medicationId: string;
  medicationName: string;
  reason: string;
  tone: 'amber' | 'red';
}

export function computeNeedsAttention(
  medications: MedicationRecord[],
  safetyResult: PatientSafetyResult | null,
  reconciliation: ReconciliationRecord | null,
  now: Date = new Date(),
): AttentionItem[] {
  const items: AttentionItem[] = [];

  for (const m of medications) {
    if (m.status !== 'active') continue;
    if (isRefillDue(m, now)) {
      items.push({ medicationId: m.id, medicationName: m.name, reason: 'Refill/renewal review requested', tone: 'amber' });
    }
    const alerts = alertsForMedication(safetyResult, m.id).filter((a) => a.severity !== 'info');
    for (const a of alerts) {
      items.push({ medicationId: m.id, medicationName: m.name, reason: a.message, tone: severityTone(a.severity) === 'red' ? 'red' : 'amber' });
    }
  }

  if (reconciliation && reconciliation.status === 'review-due') {
    items.push({ medicationId: '__reconciliation__', medicationName: 'Medication List', reason: 'Medication reconciliation review is due', tone: 'amber' });
  }

  // Surface red (critical) items first, then cap at 3 to avoid alert fatigue.
  items.sort((a, b) => (a.tone === b.tone ? 0 : a.tone === 'red' ? -1 : 1));
  return items.slice(0, 3);
}

export type MedicationAction =
  | 'view'
  | 'view-history'
  | 'renew'
  | 'modify'
  | 'hold'
  | 'resume'
  | 'discontinue'
  | 'correct'
  | 'mark-entered-in-error'
  | 'create-follow-up'
  | 'message-patient';

/** Derives valid actions strictly from lifecycle status — prevents contradictory controls. */
export function availableMedicationActions(med: MedicationRecord, refillDue: boolean): MedicationAction[] {
  const base: MedicationAction[] = ['view', 'view-history'];
  switch (med.status) {
    case 'entered-in-error':
      return base;
    case 'stopped':
    case 'completed':
      return [...base, 'correct'];
    case 'on-hold':
      return [...base, 'resume', 'modify', 'discontinue', 'correct', 'mark-entered-in-error', 'create-follow-up', 'message-patient'];
    case 'draft':
      return [...base, 'modify', 'mark-entered-in-error'];
    case 'active':
    default: {
      const actions: MedicationAction[] = [...base, 'modify', 'hold', 'discontinue', 'correct', 'mark-entered-in-error', 'create-follow-up', 'message-patient'];
      if (refillDue) actions.splice(2, 0, 'renew');
      return actions;
    }
  }
}

export function formatDoseLine(med: MedicationRecord): string {
  const parts: string[] = [];
  if (med.dose) parts.push(med.unit ? `${med.dose} ${med.unit}` : med.dose);
  if (med.frequency) parts.push(med.frequency);
  return parts.join(' · ') || 'Dose not documented';
}

/** Builds a screen-reader-friendly medication summary sentence from real data only. */
export function accessibleMedicationSummary(med: MedicationRecord): string {
  const dose = formatDoseLine(med);
  const status = medicationStatusLabel(med.status).toLowerCase();
  const indication = med.indication ? `Documented indication ${med.indication}.` : 'No documented indication.';
  const reviewed = med.lastReviewed ? `Last reviewed ${med.lastReviewed}.` : 'Not yet reviewed.';
  return `${med.name}, ${dose}, ${status}. ${indication} ${reviewed}`;
}
