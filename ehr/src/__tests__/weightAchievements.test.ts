import { describe, it, expect } from 'vitest';
import { computeAchievements } from '../lib/weightAchievements';

const M = (id: string, occurredAt: string, value = 70, extra: Partial<{ enteredInError: boolean; unit: string }> = {}) => ({
  id,
  value,
  unit: extra.unit ?? 'kg',
  occurredAt,
  enteredInError: extra.enteredInError,
});

function daily(count: number, startIso = '2026-01-01') {
  const start = Date.parse(startIso);
  return Array.from({ length: count }, (_, i) => M(`m${i}`, new Date(start + i * 86400000).toISOString()));
}

describe('computeAchievements — threshold correctness (never "25/25 In Progress")', () => {
  it('marks Dedicated Tracker completed the instant 25 valid measurements exist', () => {
    const model = computeAchievements(daily(25), null);
    const dedicated = model.list.find((a) => a.id === 'dedicated')!;
    expect(dedicated.progress).toEqual({ current: 25, target: 25 });
    expect(dedicated.status).toBe('completed');
  });

  it('marks Getting Consistent completed at exactly 7 measurements', () => {
    const model = computeAchievements(daily(7), null);
    const consistent = model.list.find((a) => a.id === 'consistent')!;
    expect(consistent.status).toBe('completed');
  });

  it('never regresses a fulfilled threshold — more than target still reads completed', () => {
    const model = computeAchievements(daily(30), null);
    const dedicated = model.list.find((a) => a.id === 'dedicated')!;
    expect(dedicated.status).toBe('completed');
    expect(dedicated.progress!.current).toBe(25); // capped at target, not overshooting the bar
  });
});

describe('computeAchievements — points are earned, not summed unconditionally', () => {
  it('only counts points from completed achievements', () => {
    const model = computeAchievements(daily(1), null); // only "First Step" (25pts) should complete
    expect(model.summary.completed).toBe(1);
    expect(model.summary.points).toBe(25);
  });

  it('reports zero points with zero completions', () => {
    const model = computeAchievements([], null);
    expect(model.summary.completed).toBe(0);
    expect(model.summary.points).toBe(0);
  });
});

describe('computeAchievements — entered-in-error exclusion', () => {
  it('excludes entered-in-error measurements from all progress calculations', () => {
    const items = [...daily(6), M('bad', '2026-02-01', 999, { enteredInError: true })];
    const model = computeAchievements(items, null);
    const consistent = model.list.find((a) => a.id === 'consistent')!;
    expect(consistent.progress!.current).toBe(6); // the flagged record must not count
    expect(consistent.status).toBe('in-progress');
  });
});

describe('computeAchievements — goal-based achievements never assume a direction', () => {
  it('Goal Achiever is not-started with no active goal (never a fake percentage)', () => {
    const model = computeAchievements(daily(3), null);
    const goalAch = model.list.find((a) => a.id === 'goal')!;
    expect(goalAch.status).toBe('not-started');
    expect(goalAch.progress).toBeUndefined();
  });

  it('Goal Achiever completes for a weight-GAIN goal once target is reached, without assuming loss is success', () => {
    const items = [M('a', '2026-01-01', 56), M('b', '2026-01-10', 62)];
    const goal = { goalType: 'weight-gain', baselineWeight: 56, targetWeight: 62 };
    const model = computeAchievements(items, goal);
    const goalAch = model.list.find((a) => a.id === 'goal')!;
    expect(goalAch.status).toBe('completed');
  });

  it('Turning the Corner requires a documented goal and uses direction-aware progress', () => {
    const items = [M('a', '2026-01-01', 98), M('b', '2026-01-10', 90)];
    const goal = { goalType: 'weight-reduction', baselineWeight: 98, targetWeight: 62 };
    const model = computeAchievements(items, goal);
    const turning = model.list.find((a) => a.id === 'turning')!;
    // (98-90)/(98-62) = 22% >= 20% threshold
    expect(turning.status).toBe('completed');
  });

  it('a maintenance goal can complete Goal Achiever without a numeric percent', () => {
    const items = [M('a', '2026-01-01', 70), M('b', '2026-01-10', 70.2)];
    const goal = { goalType: 'maintain', baselineWeight: 70 };
    const model = computeAchievements(items, goal);
    const goalAch = model.list.find((a) => a.id === 'goal')!;
    expect(goalAch.status).toBe('completed');
  });
});

describe('computeAchievements — closest to unlock', () => {
  it('never suggests a goal-based achievement as closest-to-unlock without an active goal', () => {
    const model = computeAchievements(daily(20), null); // Dedicated Tracker is 20/25 = 80%, no goal exists
    expect(model.closestToUnlock?.id).toBe('dedicated');
  });

  it('excludes already-completed achievements from closest-to-unlock', () => {
    const model = computeAchievements(daily(25), null);
    expect(model.closestToUnlock?.id).not.toBe('first');
    expect(model.closestToUnlock?.id).not.toBe('dedicated');
    expect(model.closestToUnlock?.id).not.toBe('consistent');
  });
});

describe('computeAchievements — unit normalization', () => {
  it('treats a lb-recorded measurement identically to its kg equivalent for goal math', () => {
    const items = [M('a', '2026-01-01', 220.46, { unit: 'lb' })]; // ~100kg
    const goal = { goalType: 'weight-reduction', baselineWeight: 120, targetWeight: 100 };
    const model = computeAchievements(items, goal);
    const goalAch = model.list.find((a) => a.id === 'goal')!;
    expect(goalAch.status).toBe('completed');
  });
});
