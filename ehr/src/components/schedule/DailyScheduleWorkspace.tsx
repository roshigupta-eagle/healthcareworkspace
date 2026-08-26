"use client";

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  dailyScheduleRows,
  PASTELS,
  SCHEDULE_END_HOUR,
  SCHEDULE_START_HOUR,
  type FixtureEvent,
  type FixtureRow,
} from '@/scheduling/fixtures/dailyScheduleFixture';
import './daily-schedule.css';

type Density = 'comfortable' | 'compact';
type QuickFilter = 'all' | 'running' | 'delayed' | 'upcoming' | 'attention';
type TheatreStatus = 'on-time' | 'running' | 'delayed' | 'upcoming';
type Selection = { row: FixtureRow; event: FixtureEvent };

const LEFT_COL_WIDTH = 190;
const TIME_HEADER_HEIGHT = 48;
const ROW_HEIGHT = 88;
const TIMELINE_MIN_WIDTH = 920;
const TOTAL_MINUTES = (SCHEDULE_END_HOUR - SCHEDULE_START_HOUR) * 60;
const HOUR_MARKS = Array.from({ length: SCHEDULE_END_HOUR - SCHEDULE_START_HOUR + 1 }, (_, index) => SCHEDULE_START_HOUR + index);
const CLINIC_TIME_ZONE = 'America/Toronto';

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    arrowLeft: <path d="m15 18-6-6 6-6" />,
    arrowRight: <path d="m9 18 6-6-6-6" />,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
    alert: <><path d="M12 3 21 19H3L12 3z" /><path d="M12 9v4M12 16h.01" /></>,
    check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></>,
    activity: <><path d="M3 12h4l2-7 4 14 2-7h6" /></>,
    theatre: <><path d="M4 4h16v16H4z" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    filter: <><path d="M4 6h16M7 12h10M10 18h4" /></>,
    locate: <><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></>,
    users: <><path d="M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1" /><circle cx="9.5" cy="7" r="3" /><path d="M17 11a3 3 0 1 0 0-6M21 20v-1a4 4 0 0 0-3-3.8" /></>,
    shield: <><path d="M12 3 20 6v5c0 5-3.3 8.3-8 10-4.7-1.7-8-5-8-10V6l8-3z" /><path d="M9 12h6M12 9v6" /></>,
    clipboard: <><path d="M9 4h6M9 4a2 2 0 0 0-2 2v1h10V6a2 2 0 0 0-2-2M7 7H5v14h14V7h-2" /><path d="M8 12h8M8 16h5" /></>,
    chevronDown: <path d="m6 9 6 6 6-6" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.theatre}</svg>;
}

function minutesForEvent(event: FixtureEvent) {
  return { start: event.startHour * 60 + event.startMinute, end: event.endHour * 60 + event.endMinute };
}

function percentForMinutes(minutes: number) {
  return Math.min(100, Math.max(0, ((minutes - SCHEDULE_START_HOUR * 60) / TOTAL_MINUTES) * 100));
}

function formatClock(hour: number, minute: number) {
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${minute.toString().padStart(2, '0')} ${period}`;
}

function formatDuration(event: FixtureEvent) {
  const minutes = minutesForEvent(event).end - minutesForEvent(event).start;
  if (minutes >= 60) return `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ''}`;
  return `${minutes}m`;
}

function previewHref(href: string, searchParams: URLSearchParams) {
  const asUser = searchParams.get('asUser');
  if (asUser) return `${href}${href.includes('?') ? '&' : '?'}asUser=${encodeURIComponent(asUser)}`;
  if (['1', 'true'].includes(searchParams.get('noauth') || '')) return `${href}${href.includes('?') ? '&' : '?'}noauth=1&asUser=dev`;
  return href;
}

function clinicMinutes(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(now);
  const hour = Number(parts.find((part) => part.type === 'hour')?.value || 0) % 24;
  const minute = Number(parts.find((part) => part.type === 'minute')?.value || 0);
  return hour * 60 + minute;
}

function clinicDate(now: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }).format(now);
}

function currentEvent(row: FixtureRow, nowMinutes: number) {
  return row.events.find((event) => { const range = minutesForEvent(event); return nowMinutes >= range.start && nowMinutes < range.end; });
}

function nextEvent(row: FixtureRow, nowMinutes: number) {
  return row.events.filter((event) => minutesForEvent(event).start > nowMinutes).sort((left, right) => minutesForEvent(left).start - minutesForEvent(right).start)[0];
}

function theatreStatus(row: FixtureRow, nowMinutes: number): TheatreStatus {
  if (row.events.some((event) => event.delayed)) return 'delayed';
  if (currentEvent(row, nowMinutes)) return 'running';
  if (nextEvent(row, nowMinutes)) return 'upcoming';
  return 'on-time';
}

function statusLabel(status: TheatreStatus) {
  return status === 'running' ? 'Active window' : status === 'delayed' ? 'Delayed' : status === 'upcoming' ? 'Upcoming' : 'On time';
}

function eventStatus(event: FixtureEvent, nowMinutes: number) {
  if (event.delayed) return 'Delayed';
  const range = minutesForEvent(event);
  if (nowMinutes >= range.start && nowMinutes < range.end) return 'Active scheduled window';
  if (nowMinutes < range.start) return 'Upcoming';
  return 'Past scheduled window';
}

function progressForEvent(event: FixtureEvent, nowMinutes: number) {
  const range = minutesForEvent(event);
  if (nowMinutes <= range.start) return 0;
  if (nowMinutes >= range.end) return 100;
  return ((nowMinutes - range.start) / (range.end - range.start)) * 100;
}

function matchesFilter(event: FixtureEvent, rowLabel: string, query: string, quickFilter: QuickFilter, nowMinutes: number) {
  const normalized = query.trim().toLowerCase();
  const textMatches = !normalized || [rowLabel, event.title, event.provider].join(' ').toLowerCase().includes(normalized);
  if (!textMatches) return false;
  if (quickFilter === 'running') return eventStatus(event, nowMinutes) === 'Active scheduled window';
  if (quickFilter === 'delayed') return event.delayed;
  if (quickFilter === 'upcoming') return eventStatus(event, nowMinutes) === 'Upcoming';
  if (quickFilter === 'attention') return event.delayed;
  return true;
}

function StatusDot({ status }: { status: TheatreStatus }) {
  return <span className={`daily-schedule-status-dot is-${status}`} aria-hidden="true" />;
}

function PulseMetric({ label, value, detail, tone, icon, onClick }: { label: string; value: string | number; detail: string; tone: string; icon: string; onClick?: () => void }) {
  const content = <><span className={`daily-schedule-pulse-icon ${tone}`}><Icon name={icon} size={18} /></span><span><small>{label}</small><strong>{value}</strong><em>{detail}</em></span></>;
  return onClick ? <button type="button" className="daily-schedule-pulse-card" onClick={onClick}>{content}</button> : <div className="daily-schedule-pulse-card">{content}</div>;
}

function ScheduleTimeHeader({ nowMinutes, timeZone }: { nowMinutes: number; timeZone: string }) {
  const nowWithin = nowMinutes >= SCHEDULE_START_HOUR * 60 && nowMinutes <= SCHEDULE_END_HOUR * 60;
  const nowPercent = percentForMinutes(nowMinutes);
  return <div className="daily-schedule-time-header" style={{ height: TIME_HEADER_HEIGHT }}><div className="daily-schedule-theatre-header" style={{ width: LEFT_COL_WIDTH }}><span>Theatre</span><small>Cases and operating state</small></div><div className="daily-schedule-time-scale" style={{ minWidth: TIMELINE_MIN_WIDTH }}>{HOUR_MARKS.map((hour, index) => <span key={hour} style={{ left: `${(index / (HOUR_MARKS.length - 1)) * 100}%` }}>{formatClock(hour, 0)}</span>)}{nowWithin && <span className="daily-schedule-now-label" style={{ left: `${nowPercent}%` }}>NOW · {formatClock(Math.floor(nowMinutes / 60), nowMinutes % 60)} <small>{timeZone}</small></span>}</div></div>;
}

function ScheduleEvent({ row, event, nowMinutes, onSelect }: { row: FixtureRow; event: FixtureEvent; nowMinutes: number; onSelect: (row: FixtureRow, event: FixtureEvent) => void }) {
  const palette = PASTELS[event.color];
  const range = minutesForEvent(event);
  const progress = progressForEvent(event, nowMinutes);
  const left = percentForMinutes(range.start);
  const width = Math.max(3, percentForMinutes(range.end) - left);
  const status = eventStatus(event, nowMinutes);
  const style = { left: `${left}%`, top: '50%', width: `${width}%`, '--event-bg': palette.bg, '--event-border': palette.border, '--event-text': palette.text, '--scheduled-progress': `${progress}%` } as CSSProperties;
  const label = `${event.title}. ${row.label}. ${event.provider}. ${formatClock(event.startHour, event.startMinute)} to ${formatClock(event.endHour, event.endMinute)}. ${status}. Duration ${formatDuration(event)}. Open procedure details.`;
  return <button type="button" className={`daily-schedule-event is-${event.delayed ? 'delayed' : status === 'Active scheduled window' ? 'running' : 'scheduled'}`} style={style} onClick={() => onSelect(row, event)} aria-label={label} title={label}><span className="daily-schedule-event-progress" aria-hidden="true" /><span className="daily-schedule-event-copy"><strong>{event.title}</strong><small>{event.provider}</small><em><span className="daily-schedule-event-dot" />{event.delayed ? 'Delayed' : status === 'Active scheduled window' ? 'Scheduled window' : status}</em></span><span className="daily-schedule-event-time">{formatClock(event.startHour, event.startMinute)} - {formatClock(event.endHour, event.endMinute)}</span></button>;
}

function ScheduleRow({ row, nowMinutes, density, events, onSelect, onTheatre }: { row: FixtureRow; nowMinutes: number; density: Density; events: FixtureEvent[]; onSelect: (row: FixtureRow, event: FixtureEvent) => void; onTheatre: (row: FixtureRow) => void }) {
  const status = theatreStatus(row, nowMinutes);
  return <div className={`daily-schedule-row is-${density}`} style={{ minHeight: density === 'compact' ? 72 : ROW_HEIGHT }}><button type="button" className="daily-schedule-theatre-cell" style={{ width: LEFT_COL_WIDTH }} onClick={() => onTheatre(row)} aria-label={`Open ${row.label} details`}><span><StatusDot status={status} /><strong>{row.label}</strong></span><small>{row.events.length} {row.events.length === 1 ? 'case' : 'cases'} · {statusLabel(status)}</small>{row.delayed && <em>Delay duration not documented</em>}</button><div className="daily-schedule-timeline-row" style={{ minWidth: TIMELINE_MIN_WIDTH }}>{HOUR_MARKS.slice(1, -1).map((hour) => <span className="daily-schedule-grid-line" key={hour} style={{ left: `${((hour - SCHEDULE_START_HOUR) / (SCHEDULE_END_HOUR - SCHEDULE_START_HOUR)) * 100}%` }} />)}{events.map((event) => <ScheduleEvent key={event.id} row={row} event={event} nowMinutes={nowMinutes} onSelect={onSelect} />)}</div></div>;
}

function CurrentTimeMarker({ nowMinutes }: { nowMinutes: number }) {
  const within = nowMinutes >= SCHEDULE_START_HOUR * 60 && nowMinutes <= SCHEDULE_END_HOUR * 60;
  if (!within) return null;
  const left = `calc(${LEFT_COL_WIDTH}px + (100% - ${LEFT_COL_WIDTH}px) * ${percentForMinutes(nowMinutes) / 100})`;
  return <div className="daily-schedule-now-marker" style={{ left, top: TIME_HEADER_HEIGHT }} aria-hidden="true"><span /><i /></div>;
}

function DrawerShell({ title, eyebrow, onClose, children }: { title: string; eyebrow: string; onClose: () => void; children: ReactNode }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab' || !drawerRef.current) return;
      const focusable = Array.from(drawerRef.current.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea')).filter((element) => !element.hasAttribute('disabled'));
      if (!focusable.length) return;
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); previous?.focus(); };
  }, [onClose]);
  return <div className="daily-schedule-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><aside ref={drawerRef} className="daily-schedule-drawer" role="dialog" aria-modal="true" aria-labelledby="daily-schedule-drawer-title"><header><div><span className="daily-schedule-eyebrow">{eyebrow}</span><h2 id="daily-schedule-drawer-title">{title}</h2></div><button ref={closeRef} type="button" className="daily-schedule-icon-button" onClick={onClose} aria-label={`Close ${title}`}><Icon name="close" /></button></header><div className="daily-schedule-drawer-body">{children}</div></aside></div>;
}

function ProcedureDetailsDrawer({ selection, nowMinutes, onClose, onTheatre }: { selection: Selection; nowMinutes: number; onClose: () => void; onTheatre: (row: FixtureRow) => void }) {
  const { row, event } = selection;
  const status = eventStatus(event, nowMinutes);
  const range = minutesForEvent(event);
  return <DrawerShell title={event.title} eyebrow="Procedure details" onClose={onClose}><div className="daily-schedule-drawer-status"><span className={`daily-schedule-status-pill is-${event.delayed ? 'delayed' : status === 'Active scheduled window' ? 'running' : 'scheduled'}`}><span className="daily-schedule-event-dot" />{status}</span><span>Configured daily schedule</span></div><section className="daily-schedule-drawer-section"><h3>Time and location</h3><dl className="daily-schedule-detail-grid"><div><dt>Theatre</dt><dd>{row.label}</dd></div><div><dt>Scheduled time</dt><dd>{formatClock(event.startHour, event.startMinute)} - {formatClock(event.endHour, event.endMinute)}</dd></div><div><dt>Duration</dt><dd>{formatDuration(event)}</dd></div><div><dt>Scheduled start</dt><dd>{formatClock(event.startHour, event.startMinute)}</dd></div><div><dt>Scheduled end</dt><dd>{formatClock(event.endHour, event.endMinute)}</dd></div><div><dt>Projected timing</dt><dd>Not supplied</dd></div></dl>{nowMinutes >= range.start && nowMinutes < range.end && <p className="daily-schedule-info-note"><Icon name="clock" size={15} /> The scheduled window is active. Actual procedure progress is not supplied by this schedule source.</p>}</section><section className="daily-schedule-drawer-section"><h3>Provider</h3><div className="daily-schedule-drawer-fact"><Icon name="users" size={17} /><span><strong>{event.provider}</strong><small>Primary provider assignment</small></span></div><p className="daily-schedule-muted">Additional theatre team assignments are not tracked in the daily schedule source.</p></section><section className="daily-schedule-drawer-section"><h3>Case readiness</h3><div className="daily-schedule-unavailable"><Icon name="clipboard" size={16} /><span><strong>Readiness data unavailable</strong><small>Consent, assessment, labs, equipment, and check-in status are not supplied by this schedule source.</small></span></div></section><section className="daily-schedule-drawer-section"><h3>Clinical safety</h3><div className="daily-schedule-unavailable"><Icon name="shield" size={16} /><span><strong>Safety snapshot unavailable</strong><small>Patient identity, allergies, NPO, anticoagulation, blood type, and precautions are not exposed here.</small></span></div></section><div className="daily-schedule-drawer-actions"><button type="button" className="daily-schedule-secondary-button" onClick={() => onTheatre(row)}><Icon name="theatre" size={15} /> View Theatre</button><button type="button" className="daily-schedule-secondary-button" onClick={onClose}>Close</button></div></DrawerShell>;
}

function TheatreDetailsDrawer({ row, nowMinutes, onClose, onViewCase, onViewCases }: { row: FixtureRow; nowMinutes: number; onClose: () => void; onViewCase: (row: FixtureRow, event: FixtureEvent) => void; onViewCases: (row: FixtureRow) => void }) {
  const status = theatreStatus(row, nowMinutes);
  const current = currentEvent(row, nowMinutes);
  const next = nextEvent(row, nowMinutes);
  return <DrawerShell title={row.label} eyebrow="Theatre details" onClose={onClose}><div className="daily-schedule-drawer-status"><span className={`daily-schedule-status-pill is-${status}`}><StatusDot status={status} />{statusLabel(status)}</span><span>{row.events.length} {row.events.length === 1 ? 'case' : 'cases'} today</span></div><section className="daily-schedule-drawer-section"><h3>Operating-day flow</h3><dl className="daily-schedule-detail-grid"><div><dt>Current case</dt><dd>{current?.title || 'No scheduled window now'}</dd></div><div><dt>Next case</dt><dd>{next?.title || 'No next case scheduled'}</dd></div><div><dt>Delay</dt><dd>{row.delayed ? 'Documented delay' : 'No delay flag'}</dd></div><div><dt>Projected start</dt><dd>Not supplied</dd></div></dl>{row.delayed && <p className="daily-schedule-warning"><Icon name="alert" size={15} /> Delay duration and reason are not documented by the daily schedule source.</p>}</section><section className="daily-schedule-drawer-section"><h3>Theatre team</h3><div className="daily-schedule-unavailable"><Icon name="users" size={16} /><span><strong>Team data unavailable</strong><small>Surgeon, anaesthesia, circulating nurse, and scrub assignments are not supplied here.</small></span></div></section><section className="daily-schedule-drawer-section"><h3>Readiness and equipment</h3><div className="daily-schedule-unavailable"><Icon name="clipboard" size={16} /><span><strong>Operational detail unavailable</strong><small>Readiness checks, equipment, turnover, and room state are not tracked by this source.</small></span></div></section><div className="daily-schedule-drawer-actions">{current && <button type="button" className="daily-schedule-primary-button" onClick={() => onViewCase(row, current)}>Open Current Case <Icon name="arrowRight" size={15} /></button>}<button type="button" className="daily-schedule-secondary-button" onClick={() => onViewCases(row)}>View Cases <Icon name="arrowRight" size={15} /></button></div></DrawerShell>;
}

function MobileTheatreCard({ row, visibleEvents, nowMinutes, onOpen }: { row: FixtureRow; visibleEvents: FixtureEvent[]; nowMinutes: number; onOpen: () => void }) {
  const status = theatreStatus(row, nowMinutes);
  const current = visibleEvents.find((event) => { const range = minutesForEvent(event); return nowMinutes >= range.start && nowMinutes < range.end; });
  const next = visibleEvents.filter((event) => minutesForEvent(event).start > nowMinutes).sort((left, right) => minutesForEvent(left).start - minutesForEvent(right).start)[0];
  return <button type="button" className="daily-schedule-mobile-theatre" onClick={onOpen}><span className="daily-schedule-mobile-theatre-head"><span><StatusDot status={status} /><strong>{row.label}</strong></span><em>{visibleEvents.length} {visibleEvents.length === 1 ? 'case' : 'cases'} · {statusLabel(status)}</em></span><span className="daily-schedule-mobile-case"><small>Current</small><strong>{current?.title || 'No scheduled window'}</strong>{current && <span>{current.provider} · {formatClock(current.startHour, current.startMinute)} - {formatClock(current.endHour, current.endMinute)}</span>}</span><span className="daily-schedule-mobile-case"><small>Next</small><strong>{next?.title || 'No next case scheduled'}</strong>{next && <span>{next.provider} · {formatClock(next.startHour, next.startMinute)}</span>}</span></button>;
}

export default function DailyScheduleWorkspace({ timeZone = CLINIC_TIME_ZONE }: { timeZone?: string }) {
  const searchParams = useSearchParams();
  const [now, setNow] = useState(() => new Date());
  const [query, setQuery] = useState('');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [density, setDensity] = useState<Density>('comfortable');
  const [selection, setSelection] = useState<Selection | null>(null);
  const [theatre, setTheatre] = useState<FixtureRow | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const nowMinutes = clinicMinutes(now, timeZone);
  const dateLabel = clinicDate(now, timeZone);
  const totalProcedures = dailyScheduleRows.reduce((sum, row) => sum + row.events.length, 0);
  const runningEvents = dailyScheduleRows.flatMap((row) => row.events).filter((event) => eventStatus(event, nowMinutes) === 'Active scheduled window');
  const delayedRows = dailyScheduleRows.filter((row) => row.delayed);
  const delayedEvents = dailyScheduleRows.flatMap((row) => row.events).filter((event) => event.delayed);
  const upcomingEvents = dailyScheduleRows.flatMap((row) => row.events.map((event) => ({ row, event }))).filter(({ event }) => { const start = minutesForEvent(event).start; return start >= nowMinutes && start <= nowMinutes + 90; });
  const filteredRows = useMemo(() => dailyScheduleRows.map((row) => ({ row, events: row.events.filter((event) => matchesFilter(event, row.label, query, quickFilter, nowMinutes)) })).filter(({ events }) => events.length), [nowMinutes, query, quickFilter]);
  const atAGlance = `${totalProcedures} procedures today · ${runningEvents.length} active scheduled window${runningEvents.length === 1 ? '' : 's'} · ${delayedEvents.length} delay flag${delayedEvents.length === 1 ? '' : 's'} · ${upcomingEvents.length} upcoming in 90 min`;

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60 * 1000);
    return () => window.clearInterval(interval);
  }, []);

  function jumpToNow() {
    if (!timelineRef.current) return;
    const fraction = percentForMinutes(nowMinutes) / 100;
    const target = Math.max(0, fraction * timelineRef.current.scrollWidth - timelineRef.current.clientWidth * .45);
    timelineRef.current.scrollTo({ left: target, behavior: 'smooth' });
  }

  function openTheatre(row: FixtureRow) {
    setSelection(null);
    setTheatre(row);
  }

  function openEvent(row: FixtureRow, event: FixtureEvent) {
    setTheatre(null);
    setSelection({ row, event });
  }

  function viewCases(row: FixtureRow) {
    setTheatre(null);
    if (window.matchMedia('(max-width: 760px)').matches) return;
    rowRefs.current[row.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return <div className="daily-schedule-page" aria-labelledby="daily-schedule-title"><header className="daily-schedule-header"><div><span className="daily-schedule-eyebrow">Operating day preview</span><h1 id="daily-schedule-title">Daily Schedule</h1><p>Configured theatre case windows, schedule flags, and operating-day flow.</p><span className="daily-schedule-date"><Icon name="calendar" size={14} /> {dateLabel} · Clinic timezone {timeZone}</span><span className="daily-schedule-demo-badge">Demo / fixture data · live case status, readiness, and delay feeds are not connected</span></div><div className="daily-schedule-header-actions"><Link href={previewHref('/scheduling', searchParams)} className="daily-schedule-secondary-button"><Icon name="arrowLeft" size={15} /> Back to Scheduling</Link><button type="button" className="daily-schedule-secondary-button" onClick={jumpToNow}><Icon name="locate" size={15} /> Jump to Now</button></div></header><section className="daily-schedule-pulse" aria-label="Surgical day pulse"><PulseMetric label="Procedures" value={totalProcedures} detail="scheduled today" tone="is-blue" icon="theatre" onClick={() => setQuickFilter('all')} /><PulseMetric label="Scheduled windows" value={runningEvents.length} detail="time-derived active windows" tone="is-teal" icon="activity" onClick={() => setQuickFilter('running')} /><PulseMetric label="Delay flags" value={delayedEvents.length} detail={delayedRows.length ? 'review flagged cases' : 'no delay flags'} tone="is-amber" icon="clock" onClick={() => setQuickFilter('delayed')} /><PulseMetric label="Upcoming" value={upcomingEvents.length} detail="next 90 minutes" tone="is-violet" icon="calendar" onClick={() => setQuickFilter('upcoming')} /><PulseMetric label="Needs attention" value={delayedEvents.length} detail="documented schedule flags" tone="is-coral" icon="alert" onClick={() => setQuickFilter('attention')} /></section><div className="daily-schedule-at-a-glance"><span>{atAGlance}</span><small>Time-derived windows only · actual case progress and readiness are unavailable</small></div><section className="daily-schedule-controls" aria-label="Schedule filters"><label className="daily-schedule-search"><Icon name="search" size={17} /><span className="sr-only">Search procedure or provider</span><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape') setQuery(''); }} placeholder="Search procedure or provider..." /></label><div className="daily-schedule-quick-filters" role="tablist" aria-label="Schedule quick filters">{([['all', 'All'], ['running', 'Active'], ['delayed', 'Delayed'], ['upcoming', 'Upcoming'], ['attention', 'Needs attention']] as const).map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={quickFilter === value} onClick={() => setQuickFilter(value)}>{label}</button>)}</div><label className="daily-schedule-density"><span>Density</span><select value={density} onChange={(event) => setDensity(event.target.value as Density)}><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select></label></section><section className="daily-schedule-shell" aria-label="Theatre by time schedule"><div className="daily-schedule-shell-heading"><div><span className="daily-schedule-eyebrow">Timeline preview</span><h2>Today&apos;s operating flow</h2></div><span><span className="daily-schedule-now-inline" /> NOW · {formatClock(Math.floor(nowMinutes / 60), nowMinutes % 60)}</span></div><div className="daily-schedule-scroll" ref={timelineRef}><div className="daily-schedule-grid" style={{ minWidth: LEFT_COL_WIDTH + TIMELINE_MIN_WIDTH }}><ScheduleTimeHeader nowMinutes={nowMinutes} timeZone={timeZone} />{filteredRows.length ? filteredRows.map(({ row, events }) => <div key={row.id} ref={(element) => { rowRefs.current[row.id] = element; }}><ScheduleRow row={row} nowMinutes={nowMinutes} density={density} events={events} onSelect={openEvent} onTheatre={openTheatre} /></div>) : <div className="daily-schedule-empty-filter"><Icon name="filter" size={22} /><h3>No cases match these filters</h3><p>Try another search or return to All cases.</p><button type="button" className="daily-schedule-secondary-button" onClick={() => { setQuery(''); setQuickFilter('all'); }}>Clear filters</button></div>}<CurrentTimeMarker nowMinutes={nowMinutes} /></div></div><div className="daily-schedule-legend"><span><i className="is-pastel" /> Procedure colors are configured case colors</span><span><i className="is-running" /> Active scheduled window</span><span><i className="is-delayed" /> Delay flag</span><span><i className="is-now" /> Current time</span></div></section><section className="daily-schedule-mobile" aria-label="Mobile theatre schedule">{filteredRows.length ? filteredRows.map(({ row, events }) => <MobileTheatreCard key={row.id} row={row} visibleEvents={events} nowMinutes={nowMinutes} onOpen={() => openTheatre(row)} />) : <div className="daily-schedule-empty-filter"><Icon name="filter" size={22} /><h3>No cases match these filters</h3><p>Try another search or return to All cases.</p><button type="button" className="daily-schedule-secondary-button" onClick={() => { setQuery(''); setQuickFilter('all'); }}>Clear filters</button></div>}</section>{selection && <ProcedureDetailsDrawer selection={selection} nowMinutes={nowMinutes} onClose={() => setSelection(null)} onTheatre={openTheatre} />}{theatre && <TheatreDetailsDrawer row={theatre} nowMinutes={nowMinutes} onClose={() => setTheatre(null)} onViewCase={openEvent} onViewCases={viewCases} />}</div>;
}
