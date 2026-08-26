import { describe, expect, it } from 'vitest';
import { dailyScheduleRows } from '@/scheduling/fixtures/dailyScheduleFixture';

function range(event: { startHour: number; startMinute: number; endHour: number; endMinute: number }) {
  return { start: event.startHour * 60 + event.startMinute, end: event.endHour * 60 + event.endMinute };
}

function status(event: { delayed?: boolean; startHour: number; startMinute: number; endHour: number; endMinute: number }, nowMinutes: number) {
  if (event.delayed) return 'Delayed';
  const eventRange = range(event);
  if (nowMinutes >= eventRange.start && nowMinutes < eventRange.end) return 'Active scheduled window';
  if (nowMinutes < eventRange.start) return 'Upcoming';
  return 'Past scheduled window';
}

describe('daily schedule fixture semantics', () => {
  it('keeps the operating-day total and delay flag grounded in fixture data', () => {
    expect(dailyScheduleRows.reduce((total, row) => total + row.events.length, 0)).toBe(13);
    expect(dailyScheduleRows.flatMap((row) => row.events).filter((event) => event.delayed)).toHaveLength(1);
  });

  it('classifies individual cases without leaking theatre-level delay to every case', () => {
    const theatre = dailyScheduleRows.find((row) => row.label === 'Theatre 3');
    expect(theatre).toBeDefined();
    const cases = theatre?.events || [];
    expect(cases.filter((event) => event.delayed)).toHaveLength(1);
    expect(status(cases[0], 10 * 60)).toBe('Past scheduled window');
    expect(status(cases[1], 10 * 60)).toBe('Delayed');
    expect(status(cases[2], 10 * 60)).toBe('Upcoming');
  });
});
