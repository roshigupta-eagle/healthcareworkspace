/**
 * Centralized appointment lifecycle engine.
 *
 * This is the SINGLE source of truth for turning a raw appointment
 * (date/time + status) into a UI-safe lifecycle state. Every surface that
 * displays appointment status (Appointment Detail, Today's Schedule,
 * Appointments list, Patient Chart cards) must call this module instead of
 * re-implementing date/status comparisons.
 *
 * Design rules encoded here (see docs/requirements for the full spec):
 *  - Classification depends on BOTH calendar date/time AND status. Never one alone.
 *  - A past-dated appointment that is still "Scheduled"/"Confirmed" is NOT upcoming —
 *    it becomes `past-unresolved` and must surface a reconciliation warning.
 *  - Today's appointment whose time has passed but has no real status update
 *    remains lifecycle `today`, with `scheduledTimePassed: true` so the UI can show
 *    "Scheduled time passed" instead of a generic "Upcoming" label.
 *  - Terminal statuses (completed / cancelled / no-show) always win, regardless of date.
 */

export type CanonicalAppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'checked-in'
  | 'waiting'
  | 'roomed'
  | 'in-progress'
  | 'completed'
  | 'cancelled'
  | 'no-show';

export type AppointmentLifecycle =
  | 'upcoming'
  | 'today'
  | 'checked-in'
  | 'waiting'
  | 'in-progress'
  | 'completed'
  | 'cancelled'
  | 'no-show'
  | 'past-unresolved';

/** Clinic-configured IANA timezone. Display formatting is anchored to this, not browser local time. */
export const CLINIC_TIMEZONE = 'America/Toronto';

/** Wait time (minutes) after which a "waiting" state should shift from calm teal to amber. */
export const WAIT_TIME_WARNING_MINUTES = 20;

export interface AppointmentLifecycleInput {
  start: string | Date;
  end?: string | Date | null;
  status?: string | null;
  arrivedAt?: string | Date | null;
}

export interface AppointmentLifecycleResult {
  lifecycle: AppointmentLifecycle;
  canonicalStatus: CanonicalAppointmentStatus;
  start: Date;
  end: Date;
  isPastDay: boolean;
  isToday: boolean;
  isFutureDay: boolean;
  /** True only for a past-dated appointment whose status was never resolved. */
  needsReconciliation: boolean;
  /** True when today's appointment end time has already passed but status never advanced. */
  scheduledTimePassed: boolean;
  waitingMinutes: number | null;
  waitingExceedsThreshold: boolean;
  relativeLabel: string;
}

function toDate(value?: string | Date | null): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function diffCalendarDays(a: Date, b: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / msPerDay);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatClinicDate(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function formatClinicTime(d: Date): string {
  let hour = d.getHours();
  const minute = d.getMinutes();
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${hour}:${pad(minute)} ${ampm}`;
}

/** Normalizes free-form scheduling status strings into a small canonical set. */
export function normalizeAppointmentStatus(raw?: string | null): CanonicalAppointmentStatus {
  const s = (raw || '').trim().toLowerCase();
  if (['completed', 'complete', 'fulfilled'].includes(s)) return 'completed';
  if (['cancelled', 'canceled'].includes(s)) return 'cancelled';
  if (['no-show', 'no show', 'noshow', 'missed'].includes(s)) return 'no-show';
  if (['checked-in', 'checked in', 'arrived'].includes(s)) return 'checked-in';
  if (['waiting'].includes(s)) return 'waiting';
  if (['roomed', 'in-room', 'in room'].includes(s)) return 'roomed';
  if (['in-progress', 'in progress', 'started', 'active', 'in progress encounter'].includes(s)) return 'in-progress';
  if (['confirmed'].includes(s)) return 'confirmed';
  // 'scheduled', 'booked', 'planned', empty, or unrecognized all default to scheduled.
  return 'scheduled';
}

function relativePastLabel(start: Date, now: Date): string {
  const days = Math.max(0, diffCalendarDays(now, start));
  if (days < 1) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return '1 week ago';
  if (days < 30) return `${Math.round(days / 7)} weeks ago`;
  if (days < 60) return '1 month ago';
  if (days < 365) return `${Math.round(days / 30)} months ago`;
  const years = Math.round(days / 365);
  return years <= 1 ? '1 year ago' : `${years} years ago`;
}

function buildRelativeLabel(opts: {
  start: Date;
  now: Date;
  isToday: boolean;
  isFutureDay: boolean;
  isPastDay: boolean;
  lifecycle: AppointmentLifecycle;
}): string {
  const { start, now, isToday, isFutureDay, isPastDay, lifecycle } = opts;
  if (isToday) return 'Today';
  if (isFutureDay) {
    const days = diffCalendarDays(start, now);
    if (days === 1) return 'Tomorrow';
    if (days <= 30) return `In ${days} days`;
    return formatClinicDate(start);
  }
  if (isPastDay) {
    if (lifecycle === 'completed') return `Completed ${relativePastLabel(start, now)}`;
    return `Past appointment · ${formatClinicDate(start)}`;
  }
  return formatClinicDate(start);
}

/**
 * Compute the authoritative lifecycle state for an appointment.
 * `now` defaults to the real current time, and is only overridden in tests.
 */
export function getAppointmentLifecycle(
  input: AppointmentLifecycleInput,
  now: Date = new Date(),
): AppointmentLifecycleResult {
  const start = toDate(input.start) ?? now;
  const end = toDate(input.end ?? null) ?? new Date(start.getTime() + 30 * 60000);
  const canonicalStatus = normalizeAppointmentStatus(input.status);

  const dayDelta = diffCalendarDays(start, now);
  const isPastDay = dayDelta < 0;
  const isToday = dayDelta === 0;
  const isFutureDay = dayDelta > 0;

  const scheduledTimePassed = now.getTime() > end.getTime();

  let waitingMinutes: number | null = null;
  const arrivedAt = toDate(input.arrivedAt);
  if (arrivedAt && (canonicalStatus === 'checked-in' || canonicalStatus === 'waiting' || canonicalStatus === 'roomed')) {
    waitingMinutes = Math.max(0, Math.round((now.getTime() - arrivedAt.getTime()) / 60000));
  }
  const waitingExceedsThreshold = waitingMinutes !== null && waitingMinutes >= WAIT_TIME_WARNING_MINUTES;

  let lifecycle: AppointmentLifecycle;
  let needsReconciliation = false;

  if (canonicalStatus === 'completed') {
    lifecycle = 'completed';
  } else if (canonicalStatus === 'cancelled') {
    lifecycle = 'cancelled';
  } else if (canonicalStatus === 'no-show') {
    lifecycle = 'no-show';
  } else if (isFutureDay) {
    // Future date always wins over interim statuses like "confirmed".
    lifecycle = 'upcoming';
  } else if (isToday) {
    if (canonicalStatus === 'in-progress') lifecycle = 'in-progress';
    else if (canonicalStatus === 'waiting') lifecycle = 'waiting';
    else if (canonicalStatus === 'checked-in' || canonicalStatus === 'roomed') lifecycle = 'checked-in';
    else lifecycle = 'today';
  } else {
    // Past calendar day and still scheduled/confirmed/checked-in/waiting/in-progress:
    // the appointment was never resolved and needs human reconciliation.
    lifecycle = 'past-unresolved';
    needsReconciliation = true;
  }

  const relativeLabel = buildRelativeLabel({ start, now, isToday, isFutureDay, isPastDay, lifecycle });

  return {
    lifecycle,
    canonicalStatus,
    start,
    end,
    isPastDay,
    isToday,
    isFutureDay,
    needsReconciliation,
    scheduledTimePassed,
    waitingMinutes,
    waitingExceedsThreshold,
    relativeLabel,
  };
}

export interface LifecycleBadgeMeta {
  label: string;
  tone: 'teal' | 'green' | 'amber' | 'red' | 'neutral';
}

/** Compact, human-facing badge label + semantic tone for a lifecycle state. */
export function getLifecycleBadge(result: AppointmentLifecycleResult): LifecycleBadgeMeta {
  switch (result.lifecycle) {
    case 'upcoming':
      return { label: 'Upcoming', tone: 'teal' };
    case 'today':
      return result.scheduledTimePassed
        ? { label: 'Needs Status Update', tone: 'amber' }
        : { label: 'Today', tone: 'teal' };
    case 'checked-in':
      return { label: 'Checked In', tone: 'green' };
    case 'waiting':
      return { label: result.waitingExceedsThreshold ? 'Waiting · Delayed' : 'Waiting', tone: result.waitingExceedsThreshold ? 'amber' : 'teal' };
    case 'in-progress':
      return { label: 'In Progress', tone: 'teal' };
    case 'completed':
      return { label: 'Completed', tone: 'green' };
    case 'cancelled':
      return { label: 'Cancelled', tone: 'neutral' };
    case 'no-show':
      return { label: 'No Show', tone: 'amber' };
    case 'past-unresolved':
      return { label: 'Needs Reconciliation', tone: 'amber' };
    default:
      return { label: 'Scheduled', tone: 'neutral' };
  }
}
