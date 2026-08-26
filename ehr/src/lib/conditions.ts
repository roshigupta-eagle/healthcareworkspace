/**
 * Conditions — Command Center: pure read-model helpers.
 *
 * Clinical safety rules encoded here:
 *  - Never infers a diagnosis, severity, or status from measurements/symptoms.
 *  - "Needs review" / "attention" states come only from documented fields
 *    (lastReviewed age, explicit clinicalStatus) — never from guessing.
 *  - Care gap / task linkage to a condition uses only real shared fields
 *    (category equality, or a real CarePlan/condition-name match in
 *    relatedResources) — never fuzzy AI guessing presented as fact.
 */
import type { ConditionRecord, ClinicalStatus, VerificationStatus } from './conditionsStore';

export interface CareGapItem {
  id: string;
  title: string;
  category?: string;
  status: string;
  dueDate?: string;
}

export interface TaskItem {
  id: string;
  title: string;
  category?: string;
  status: string;
  priority?: string;
  dueDate?: string;
  assignee?: { id?: string; name?: string } | null;
  relatedResources?: { type?: string; id?: string; display?: string }[];
}

const REVIEW_STALE_DAYS = 180;

export function clinicalStatusLabel(status: ClinicalStatus): string {
  switch (status) {
    case 'active': return 'Active';
    case 'inactive': return 'Inactive';
    case 'resolved': return 'Resolved';
    case 'remission': return 'Remission';
    case 'entered-in-error': return 'Entered in Error';
    default: return status;
  }
}

export function verificationLabel(v: VerificationStatus): string {
  switch (v) {
    case 'confirmed': return 'Confirmed';
    case 'provisional': return 'Provisional';
    case 'differential': return 'Differential';
    case 'unconfirmed': return 'Unconfirmed';
    case 'refuted': return 'Refuted';
    case 'entered-in-error': return 'Entered in Error';
    default: return v;
  }
}

function daysSince(dateStr?: string, now: Date = new Date()): number | null {
  if (!dateStr) return null;
  const t = Date.parse(dateStr);
  if (Number.isNaN(t)) return null;
  return Math.round((now.getTime() - t) / (1000 * 60 * 60 * 24));
}

/** A condition "needs review" only when its own documented lastReviewed date is stale — never guessed. */
export function needsReview(condition: ConditionRecord, now: Date = new Date()): boolean {
  if (condition.clinicalStatus !== 'active') return false;
  const age = daysSince(condition.lastReviewed, now);
  return age == null || age > REVIEW_STALE_DAYS;
}

export function isOpenCareGap(status: string): boolean {
  const s = (status || '').toLowerCase();
  return s === 'overdue' || s === 'due-soon' || s === 'due soon' || s === 'recommended';
}

export function isOpenTask(status: string): boolean {
  const s = (status || '').toLowerCase();
  return s !== 'completed' && s !== 'cancelled' && s !== 'entered-in-error';
}

/** Links a care gap to a condition ONLY via real shared category equality (case-insensitive). */
export function careGapsForCondition(condition: ConditionRecord, careGaps: CareGapItem[]): CareGapItem[] {
  if (!condition.category) return [];
  const cat = condition.category.toLowerCase();
  return careGaps.filter((g) => (g.category || '').toLowerCase() === cat);
}

/** Links a task to a condition ONLY when a real relatedResources entry names the condition (e.g. a linked CarePlan). */
export function tasksForCondition(condition: ConditionRecord, tasks: TaskItem[]): TaskItem[] {
  const name = condition.name.toLowerCase();
  return tasks.filter((t) => (t.relatedResources || []).some((r) => (r.display || '').toLowerCase().includes(name)));
}

export interface ConditionSnapshot {
  active: number;
  needsReviewCount: number;
  careGapsOpen: number;
  tasksOpen: number;
}

export function computeSnapshot(conditions: ConditionRecord[], careGaps: CareGapItem[], tasks: TaskItem[], now: Date = new Date()): ConditionSnapshot {
  const active = conditions.filter((c) => c.clinicalStatus === 'active').length;
  const needsReviewCount = conditions.filter((c) => needsReview(c, now)).length;
  const careGapsOpen = careGaps.filter((g) => isOpenCareGap(g.status)).length;
  const tasksOpen = tasks.filter((t) => isOpenTask(t.status)).length;
  return { active, needsReviewCount, careGapsOpen, tasksOpen };
}

export interface AttentionItem {
  conditionId: string;
  conditionName: string;
  reason: string;
  tone: 'amber' | 'red';
}

/** Derives at most 3 actionable items — every reason traces to a real documented field, never a guess. */
export function computeNeedsAttention(conditions: ConditionRecord[], careGaps: CareGapItem[], now: Date = new Date()): AttentionItem[] {
  const items: AttentionItem[] = [];
  for (const c of conditions) {
    if (c.clinicalStatus !== 'active') continue;
    if (needsReview(c, now)) {
      const age = daysSince(c.lastReviewed, now);
      items.push({
        conditionId: c.id,
        conditionName: c.name,
        reason: age == null ? 'No review date documented' : `Review overdue — last reviewed ${age} days ago`,
        tone: 'amber',
      });
    }
    const overdueGaps = careGapsForCondition(c, careGaps).filter((g) => (g.status || '').toLowerCase() === 'overdue');
    if (overdueGaps.length > 0) {
      items.push({ conditionId: c.id, conditionName: c.name, reason: `${overdueGaps.length} overdue care gap${overdueGaps.length > 1 ? 's' : ''}`, tone: 'amber' });
    }
  }
  return items.slice(0, 3);
}

export type ConditionAction = 'view' | 'edit' | 'review' | 'create-follow-up' | 'add-to-care-plan' | 'view-timeline' | 'view-history' | 'resolve' | 'reopen' | 'mark-entered-in-error';

/** Derives valid actions from status — resolved conditions can't be "resolved" again, error records can't be edited, etc. */
export function availableConditionActions(condition: ConditionRecord): ConditionAction[] {
  const actions: ConditionAction[] = ['view', 'view-history', 'view-timeline'];
  if (condition.clinicalStatus === 'entered-in-error') return actions;
  if (condition.clinicalStatus === 'resolved') {
    return [...actions, 'reopen'];
  }
  return [...actions, 'edit', 'review', 'create-follow-up', 'add-to-care-plan', 'resolve', 'mark-entered-in-error'];
}
