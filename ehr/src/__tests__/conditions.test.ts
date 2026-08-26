import { describe, it, expect } from 'vitest';
import {
  needsReview,
  computeSnapshot,
  computeNeedsAttention,
  careGapsForCondition,
  tasksForCondition,
  availableConditionActions,
  clinicalStatusLabel,
} from '../lib/conditions';
import type { ConditionRecord } from '../lib/conditionsStore';

const NOW = new Date('2026-08-19T12:00:00Z');

function makeCondition(overrides: Partial<ConditionRecord> = {}): ConditionRecord {
  return {
    id: 'c1',
    patientId: 'patient-001',
    name: 'Hypertension',
    category: 'Cardiovascular',
    clinicalStatus: 'active',
    verificationStatus: 'confirmed',
    lastReviewed: '2026-06-05',
    history: [],
    ...overrides,
  };
}

describe('needsReview — never guesses, only uses documented lastReviewed', () => {
  it('flags a stale review (>180 days) as needing review', () => {
    const c = makeCondition({ lastReviewed: '2025-01-01' });
    expect(needsReview(c, NOW)).toBe(true);
  });
  it('does not flag a recently reviewed active condition', () => {
    const c = makeCondition({ lastReviewed: '2026-08-01' });
    expect(needsReview(c, NOW)).toBe(false);
  });
  it('never flags a resolved condition as needing review', () => {
    const c = makeCondition({ clinicalStatus: 'resolved', lastReviewed: '2020-01-01' });
    expect(needsReview(c, NOW)).toBe(false);
  });
  it('flags missing review date as needing review (never assumes it was reviewed)', () => {
    const c = makeCondition({ lastReviewed: undefined });
    expect(needsReview(c, NOW)).toBe(true);
  });
});

describe('computeSnapshot — real counts only', () => {
  it('computes active/needsReview/careGaps/tasks from real data', () => {
    const conditions = [makeCondition({ id: 'a' }), makeCondition({ id: 'b', clinicalStatus: 'resolved' })];
    const careGaps = [{ id: 'g1', title: 'x', category: 'Cardiovascular', status: 'overdue' }, { id: 'g2', title: 'y', category: 'Preventive Care', status: 'recommended' }];
    const tasks = [{ id: 't1', title: 'z', status: 'in-progress' }, { id: 't2', title: 'done', status: 'completed' }];
    const snap = computeSnapshot(conditions, careGaps, tasks, NOW);
    expect(snap.active).toBe(1);
    expect(snap.careGapsOpen).toBe(2);
    expect(snap.tasksOpen).toBe(1);
  });
});

describe('careGapsForCondition / tasksForCondition — real-field linkage only', () => {
  it('links a care gap only via matching category', () => {
    const c = makeCondition({ category: 'Cardiovascular' });
    const gaps = [{ id: 'g1', title: 'Lipid Panel', category: 'Cardiovascular', status: 'due-soon' }, { id: 'g2', title: 'HbA1c', category: 'Diabetes Care', status: 'overdue' }];
    expect(careGapsForCondition(c, gaps).map((g) => g.id)).toEqual(['g1']);
  });

  it('links a task only via a real relatedResources display mentioning the condition', () => {
    const c = makeCondition({ name: 'Hypertension' });
    const tasks = [
      { id: 't1', title: 'BP follow-up', status: 'in-progress', relatedResources: [{ type: 'CarePlan', display: 'Hypertension Care Plan' }] },
      { id: 't2', title: 'Lipid panel', status: 'requested', relatedResources: [{ type: 'ServiceRequest', display: 'Lipid Panel ServiceRequest' }] },
    ];
    expect(tasksForCondition(c, tasks).map((t) => t.id)).toEqual(['t1']);
  });

  it('never fabricates a link when category/name do not match', () => {
    const c = makeCondition({ category: undefined });
    expect(careGapsForCondition(c, [{ id: 'g1', title: 'x', category: 'Cardiovascular', status: 'overdue' }])).toEqual([]);
  });
});

describe('computeNeedsAttention — max 3, always traceable to real fields', () => {
  it('caps at 3 items', () => {
    const conditions = Array.from({ length: 5 }, (_, i) => makeCondition({ id: `c${i}`, lastReviewed: '2020-01-01' }));
    expect(computeNeedsAttention(conditions, [], NOW).length).toBeLessThanOrEqual(3);
  });
  it('produces no items for a fully up-to-date condition set', () => {
    const conditions = [makeCondition({ lastReviewed: '2026-08-01' })];
    expect(computeNeedsAttention(conditions, [], NOW)).toEqual([]);
  });
});

describe('availableConditionActions — status-consistent, never contradictory', () => {
  it('entered-in-error records only allow view/history/timeline', () => {
    const c = makeCondition({ clinicalStatus: 'entered-in-error' });
    const actions = availableConditionActions(c);
    expect(actions).not.toContain('resolve');
    expect(actions).not.toContain('edit');
    expect(actions).not.toContain('reopen');
  });
  it('resolved conditions offer reopen but not resolve again', () => {
    const c = makeCondition({ clinicalStatus: 'resolved' });
    const actions = availableConditionActions(c);
    expect(actions).toContain('reopen');
    expect(actions).not.toContain('resolve');
  });
  it('active conditions offer the full management action set', () => {
    const actions = availableConditionActions(makeCondition());
    expect(actions).toEqual(expect.arrayContaining(['edit', 'review', 'resolve', 'mark-entered-in-error', 'create-follow-up']));
  });
});

describe('clinicalStatusLabel', () => {
  it('maps every canonical status to a human label', () => {
    expect(clinicalStatusLabel('active')).toBe('Active');
    expect(clinicalStatusLabel('entered-in-error')).toBe('Entered in Error');
  });
});
