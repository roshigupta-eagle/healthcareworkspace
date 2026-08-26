import { describe, it, expect } from 'vitest';
import {
  getAppointmentLifecycle,
  getLifecycleBadge,
  normalizeAppointmentStatus,
} from '../lib/appointmentLifecycle';

// Fixed "current time" used throughout: August 18, 2026, 12:00 PM.
const NOW = new Date(2026, 7, 18, 12, 0, 0);

describe('appointmentLifecycle — date correctness (critical)', () => {
  it('treats Jul 18, 2026 as PAST, never upcoming, given "today" = Aug 18, 2026', () => {
    const result = getAppointmentLifecycle({ start: '2026-07-18T10:30:00', status: 'Scheduled' }, NOW);
    expect(result.isPastDay).toBe(true);
    expect(result.isFutureDay).toBe(false);
    expect(result.lifecycle).not.toBe('upcoming');
    expect(result.lifecycle).toBe('past-unresolved');
    expect(result.needsReconciliation).toBe(true);
  });

  it('treats Jul 18, 2027 as UPCOMING given "today" = Aug 18, 2026', () => {
    const result = getAppointmentLifecycle({ start: '2027-07-18T10:30:00', status: 'Scheduled' }, NOW);
    expect(result.isFutureDay).toBe(true);
    expect(result.lifecycle).toBe('upcoming');
  });

  it('classifies a same-day future-time appointment as "today", not upcoming/past', () => {
    const result = getAppointmentLifecycle({ start: '2026-08-18T16:00:00', status: 'Scheduled' }, NOW);
    expect(result.isToday).toBe(true);
    expect(result.lifecycle).toBe('today');
    expect(result.scheduledTimePassed).toBe(false);
  });

  it('Aug 17, 2026 + Completed => Completed / Past', () => {
    const result = getAppointmentLifecycle({ start: '2026-08-17T09:00:00', end: '2026-08-17T09:30:00', status: 'Completed' }, NOW);
    expect(result.isPastDay).toBe(true);
    expect(result.lifecycle).toBe('completed');
    expect(result.needsReconciliation).toBe(false);
  });

  it('Aug 17, 2026 + Scheduled => Past / Needs Reconciliation', () => {
    const result = getAppointmentLifecycle({ start: '2026-08-17T09:00:00', end: '2026-08-17T09:30:00', status: 'Scheduled' }, NOW);
    expect(result.isPastDay).toBe(true);
    expect(result.lifecycle).toBe('past-unresolved');
    expect(result.needsReconciliation).toBe(true);
  });
});

describe('appointmentLifecycle — today handling', () => {
  it('flags scheduledTimePassed when today\'s appointment end time has already passed but status never advanced', () => {
    const result = getAppointmentLifecycle({ start: '2026-08-18T08:00:00', end: '2026-08-18T08:30:00', status: 'Scheduled' }, NOW);
    expect(result.isToday).toBe(true);
    expect(result.scheduledTimePassed).toBe(true);
    expect(result.lifecycle).toBe('today');
    const badge = getLifecycleBadge(result);
    expect(badge.label).toBe('Needs Status Update');
  });

  it('classifies checked-in / waiting / in-progress today distinctly', () => {
    expect(getAppointmentLifecycle({ start: '2026-08-18T09:00:00', status: 'Checked In' }, NOW).lifecycle).toBe('checked-in');
    expect(getAppointmentLifecycle({ start: '2026-08-18T09:00:00', status: 'Waiting' }, NOW).lifecycle).toBe('waiting');
    expect(getAppointmentLifecycle({ start: '2026-08-18T09:00:00', status: 'In Progress' }, NOW).lifecycle).toBe('in-progress');
  });

  it('computes waiting minutes and the delayed threshold', () => {
    const arrivedAt = new Date(2026, 7, 18, 11, 30, 0); // arrived 30 min before "now"
    const result = getAppointmentLifecycle({ start: '2026-08-18T12:00:00', status: 'Waiting', arrivedAt }, NOW);
    expect(result.waitingMinutes).toBe(30);
    expect(result.waitingExceedsThreshold).toBe(true);
  });
});

describe('appointmentLifecycle — terminal statuses always win', () => {
  it('cancelled stays cancelled regardless of date', () => {
    expect(getAppointmentLifecycle({ start: '2027-01-01T09:00:00', status: 'Cancelled' }, NOW).lifecycle).toBe('cancelled');
    expect(getAppointmentLifecycle({ start: '2026-01-01T09:00:00', status: 'Cancelled' }, NOW).lifecycle).toBe('cancelled');
  });

  it('no-show stays no-show regardless of date', () => {
    expect(getAppointmentLifecycle({ start: '2026-06-01T09:00:00', status: 'No Show' }, NOW).lifecycle).toBe('no-show');
  });
});

describe('normalizeAppointmentStatus', () => {
  it('normalizes common status spellings', () => {
    expect(normalizeAppointmentStatus('checked in')).toBe('checked-in');
    expect(normalizeAppointmentStatus('No-Show')).toBe('no-show');
    expect(normalizeAppointmentStatus('Fulfilled')).toBe('completed');
    expect(normalizeAppointmentStatus(undefined)).toBe('scheduled');
    expect(normalizeAppointmentStatus('')).toBe('scheduled');
  });
});

describe('appointmentLifecycle — relative labels', () => {
  it('labels today, tomorrow, and near-future dates helpfully while keeping the real date recoverable', () => {
    expect(getAppointmentLifecycle({ start: '2026-08-18T14:00:00' }, NOW).relativeLabel).toBe('Today');
    expect(getAppointmentLifecycle({ start: '2026-08-19T09:00:00' }, NOW).relativeLabel).toBe('Tomorrow');
    expect(getAppointmentLifecycle({ start: '2026-08-22T09:00:00' }, NOW).relativeLabel).toBe('In 4 days');
  });

  it('labels distant past-unresolved appointments with the explicit date, not vague wording', () => {
    const result = getAppointmentLifecycle({ start: '2026-07-18T10:30:00', status: 'Scheduled' }, NOW);
    expect(result.relativeLabel).toBe('Past appointment · Jul 18, 2026');
  });
});
