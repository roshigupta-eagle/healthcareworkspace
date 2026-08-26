import { describe, it, expect } from 'vitest';
import {
  computeFluctuation,
  computeRange,
  computeMostActiveDay,
  computeWeekdayAverages,
  computeMonthlyAverages,
  computeTrend,
  computeComparison,
  splitComparisonWindows,
} from '../lib/weightInsights';

const M = (id: string, value: number, occurredAt: string, unit = 'kg') => ({ id, value, unit, occurredAt });

describe('computeFluctuation', () => {
  it('returns null with fewer than 2 measurements', () => {
    expect(computeFluctuation([M('a', 70, '2026-01-01')])).toBeNull();
  });
  it('computes standard deviation across normalized kg values', () => {
    const items = [M('a', 60, '2026-01-01'), M('b', 70, '2026-01-02'), M('c', 80, '2026-01-03')];
    expect(computeFluctuation(items)).toBeGreaterThan(0);
  });
  it('excludes entered-in-error records', () => {
    const items = [M('a', 60, '2026-01-01'), { ...M('b', 9999, '2026-01-02'), enteredInError: true }, M('c', 61, '2026-01-03')];
    const result = computeFluctuation(items);
    expect(result).toBeLessThan(5);
  });
});

describe('computeRange', () => {
  it('returns the true lowest/highest normalized to kg', () => {
    const items = [M('a', 98, '2026-01-01'), M('b', 12, '2026-01-02'), M('c', 60, '2026-01-03')];
    const range = computeRange(items)!;
    expect(range.lowestKg).toBe(12);
    expect(range.highestKg).toBe(98);
    expect(range.difference).toBe(86);
  });
  it('normalizes mixed units before comparing', () => {
    const items = [M('a', 70, '2026-01-01', 'kg'), M('b', 220.46, '2026-01-02', 'lb')]; // ~100kg
    const range = computeRange(items)!;
    expect(range.highestKg).toBeCloseTo(100, 0);
  });
});

describe('computeMostActiveDay', () => {
  it('finds the weekday with the most measurements', () => {
    // 7 days apart always shares the same weekday
    const items = [M('a', 70, '2026-01-07'), M('b', 71, '2026-01-14'), M('c', 72, '2026-01-01')];
    const result = computeMostActiveDay(items)!;
    expect(result.days[0]).toBe(new Date('2026-01-07').getDay());
    expect(result.count).toBe(2);
  });
  it('returns null with no data', () => {
    expect(computeMostActiveDay([])).toBeNull();
  });
});

describe('computeWeekdayAverages', () => {
  it('marks weekdays with no data as null average, not zero', () => {
    const items = [M('a', 70, '2026-01-07')]; // Wednesday only
    const averages = computeWeekdayAverages(items);
    const sunday = averages.find((a) => a.weekdayIndex === 0)!;
    expect(sunday.average).toBeNull();
    expect(sunday.count).toBe(0);
  });
});

describe('computeMonthlyAverages', () => {
  it('buckets measurements by calendar month in chronological order', () => {
    const items = [M('a', 70, '2026-02-01T09:00:00'), M('b', 72, '2026-01-01T09:00:00'), M('c', 74, '2026-01-15T09:00:00')];
    const months = computeMonthlyAverages(items);
    expect(months.length).toBe(2);
    expect(months[0].monthKey).toBe('2026-01');
    expect(months[0].count).toBe(2);
  });
});

describe('computeTrend', () => {
  it('reports insufficient-data with fewer than 2 measurements', () => {
    expect(computeTrend([M('a', 70, '2026-01-01')]).direction).toBe('insufficient-data');
  });
  it('detects decreasing trend without labeling it good or bad', () => {
    const items = [M('a', 98, '2026-01-01'), M('b', 56, '2026-02-01')];
    const trend = computeTrend(items);
    expect(trend.direction).toBe('decreasing');
    expect(trend.weeklyRate).toBeLessThan(0);
  });
});

describe('computeComparison / splitComparisonWindows', () => {
  it('splits a full history into current and previous equal-length windows', () => {
    const now = new Date('2026-08-18T12:00:00Z');
    const items = [
      M('a', 70, '2026-08-01T00:00:00Z'), // within last 30 days (Jul 19 - Aug 18)
      M('b', 72, '2026-06-25T00:00:00Z'), // within previous 30 days (Jun 19 - Jul 19)
    ];
    const { currentItems, previousItems } = splitComparisonWindows(items, 30, now);
    expect(currentItems.map((i) => i.id)).toEqual(['a']);
    expect(previousItems.map((i) => i.id)).toEqual(['b']);
  });

  it('computes a period comparison without asserting good/bad', () => {
    const current = [M('a', 60, '2026-08-01'), M('b', 62, '2026-08-05')];
    const previous = [M('c', 70, '2026-06-01'), M('d', 72, '2026-06-05')];
    const cmp = computeComparison(current, previous);
    expect(cmp.current.average).toBe(61);
    expect(cmp.previous.average).toBe(71);
  });
});
