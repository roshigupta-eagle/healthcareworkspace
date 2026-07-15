import { describe, it, expect } from 'vitest';
import { isSameDay, formatDateToISO, parseISODate } from '../dateUtils';

describe('dateUtils', () => {
  it('isSameDay should detect same calendar day for ISO and Date', () => {
    const iso = '2026-07-10';
    // construct a local Date for 2026-07-10 09:30 to avoid timezone string parsing
    const dt = new Date(2026, 6, 10, 9, 30, 0);
    expect(isSameDay(iso, dt)).toBe(true);
  });

  it('formatDateToISO should produce YYYY-MM-DD', () => {
    const d = new Date(2026, 6, 10); // months are 0-based -> July
    expect(formatDateToISO(d)).toBe('2026-07-10');
  });

  it('parseISODate should parse YYYY-MM-DD to local midnight', () => {
    const parsed = parseISODate('2026-07-10');
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(6);
    expect(parsed.getDate()).toBe(10);
  });
});
