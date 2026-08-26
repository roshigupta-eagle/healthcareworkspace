import { describe, it, expect } from 'vitest';
import { toKg, inferGoalDirection, computeGoalProgress, detectOutlierIds, isIncludedInAnalytics } from '../lib/weightMath';

describe('toKg', () => {
  it('converts pounds to kilograms', () => {
    expect(toKg(220.46, 'lb')).toBeCloseTo(100, 0);
  });
  it('passes kilograms through unchanged', () => {
    expect(toKg(70, 'kg')).toBe(70);
  });
});

describe('inferGoalDirection', () => {
  it('respects an explicit goalType', () => {
    expect(inferGoalDirection({ goalType: 'weight-gain' })).toBe('gain');
    expect(inferGoalDirection({ goalType: 'maintain' })).toBe('maintenance');
  });
  it('keeps a bare baseline/target pair neutral without a documented type', () => {
    expect(inferGoalDirection({ baselineWeight: 98, targetWeight: 62 })).toBe('unknown');
    expect(inferGoalDirection({ baselineWeight: 56, targetWeight: 62 })).toBe('unknown');
    expect(inferGoalDirection({ baselineWeight: 62, targetWeight: 62.1 })).toBe('unknown');
  });
  it('returns unknown with no goal', () => {
    expect(inferGoalDirection(null)).toBe('unknown');
  });
});

describe('computeGoalProgress', () => {
  it('computes reduction progress without assuming loss is universally good', () => {
    const goal = { goalType: 'weight-reduction', baselineWeight: 98, targetWeight: 62 };
    const result = computeGoalProgress(goal, 80);
    expect(result.direction).toBe('reduction');
    expect(result.percent).toBe(50);
  });
  it('computes gain progress correctly (does not invert formula)', () => {
    const goal = { goalType: 'weight-gain', baselineWeight: 56, targetWeight: 62 };
    const result = computeGoalProgress(goal, 59);
    expect(result.direction).toBe('gain');
    expect(result.percent).toBe(50);
  });
  it('never reports a fake 100% for an out-of-direction goal', () => {
    // Current (56) is below baseline (98) which is itself below... wait: baseline 98, target 62 = reduction goal.
    // Current weight far past the target in the same direction should clamp at 100, not overshoot.
    const goal = { goalType: 'weight-reduction', baselineWeight: 98, targetWeight: 62 };
    const result = computeGoalProgress(goal, 40);
    expect(result.percent).toBe(100);
  });
  it('returns null percent for maintenance goals instead of a fabricated number', () => {
    const goal = { goalType: 'maintain', baselineWeight: 70 };
    const result = computeGoalProgress(goal, 70.5);
    expect(result.percent).toBeNull();
    expect(result.label).toMatch(/Maintaining/);
  });
  it('handles missing data without throwing', () => {
    expect(computeGoalProgress(null, null).percent).toBeNull();
    expect(computeGoalProgress({}, 70).percent).toBeNull();
  });

  it('does not calculate progress for a target with no documented direction', () => {
    const result = computeGoalProgress({ baselineWeight: 98, targetWeight: 62 }, 80);
    expect(result.direction).toBe('unknown');
    expect(result.percent).toBeNull();
  });
});

describe('analytics inclusion policy', () => {
  it('excludes preliminary and unsupported-unit measurements from analytics', () => {
    expect(isIncludedInAnalytics({ id: 'preliminary', value: 70, unit: 'kg', occurredAt: '2026-01-01', status: 'preliminary' })).toBe(false);
    expect(isIncludedInAnalytics({ id: 'unsupported', value: 70000, unit: 'grams', occurredAt: '2026-01-01', status: 'final' })).toBe(false);
    expect(isIncludedInAnalytics({ id: 'final', value: 70, unit: 'kg', occurredAt: '2026-01-01', status: 'final' })).toBe(true);
  });
});

describe('detectOutlierIds', () => {
  it('flags a value that deviates sharply from its neighbors', () => {
    const measurements = [
      { id: 'a', value: 98, unit: 'kg', occurredAt: '2026-08-01T09:00:00Z' },
      { id: 'b', value: 96, unit: 'kg', occurredAt: '2026-08-05T09:00:00Z' },
      { id: 'c', value: 12, unit: 'kg', occurredAt: '2026-08-10T09:00:00Z' },
      { id: 'd', value: 95, unit: 'kg', occurredAt: '2026-08-15T09:00:00Z' },
    ];
    const flagged = detectOutlierIds(measurements);
    expect(flagged.has('c')).toBe(true);
    expect(flagged.has('a')).toBe(false);
  });

  it('does not flag anything with too few measurements', () => {
    const measurements = [
      { id: 'a', value: 98, unit: 'kg', occurredAt: '2026-08-01T09:00:00Z' },
      { id: 'b', value: 12, unit: 'kg', occurredAt: '2026-08-05T09:00:00Z' },
    ];
    expect(detectOutlierIds(measurements).size).toBe(0);
  });

  it('correctly normalizes mixed units before comparing', () => {
    const measurements = [
      { id: 'a', value: 70, unit: 'kg', occurredAt: '2026-08-01T09:00:00Z' },
      { id: 'b', value: 154, unit: 'lb', occurredAt: '2026-08-05T09:00:00Z' }, // ~70kg
      { id: 'c', value: 71, unit: 'kg', occurredAt: '2026-08-10T09:00:00Z' },
    ];
    expect(detectOutlierIds(measurements).size).toBe(0);
  });
});
