"use client";

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { SchedulingAppointment, SchedulingSlot, SchedulingSnapshot } from '@/lib/schedulingData';
import './appointments-workspace.css';

type View = 'today' | 'week' | 'month' | 'list' | 'availability';
type Status = '' | 'booked' | 'pending' | 'proposed' | 'arrived' | 'fulfilled' | 'cancelled' | 'noshow';

type Props = { initialData: SchedulingSnapshot; includeMonth?: boolean; initialBooking?: boolean };

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></>,
    alert: <><path d="M12 3 21 19H3L12 3z" /><path d="M12 9v4M12 16h.01" /></>,
    refresh: <><path d="M20 11a8 8 0 0 0-14-5L3 9M3 4v5h5M4 13a8 8 0 0 0 14 5l3-3M21 20v-5h-5" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    left: <path d="m15 18-6-6 6-6" />,
    right: <path d="m9 18 6-6-6-6" />,
    users: <><path d="M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1" /><circle cx="9.5" cy="7" r="3" /><path d="M17 11a3 3 0 1 0 0-6M21 20v-1a4 4 0 0 0-3-3.8" /></>,
    provider: <><path d="M6 3v5a4 4 0 0 0 8 0V3M4 3h4M12 3h4M14 12v3a4 4 0 0 0 4 4h1a2 2 0 0 0 2-2v-1" /><circle cx="19" cy="12" r="2" /></>,
    location: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    list: <><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.calendar}</svg>;
}

function timestamp(value?: string) {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function startOfDay(value: Date) {
  const day = new Date(value);
  day.setHours(0, 0, 0, 0);
  return day;
}

function startOfWeek(value: Date) {
  const day = startOfDay(value);
  day.setDate(day.getDate() - ((day.getDay() + 6) % 7));
  return day;
}

function addDays(value: Date, amount: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + amount);
  return next;
}

function sameDay(value: string, day: Date, timeZone?: string) {
  if (timeZone) {
    const format = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
    return format.format(new Date(value)) === format.format(day);
  }
  const date = new Date(value);
  return date.getFullYear() === day.getFullYear() && date.getMonth() === day.getMonth() && date.getDate() === day.getDate();
}

function zoneDayKey(value: string | Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(typeof value === 'string' ? new Date(value) : value);
}

function zoneMonthKey(value: string | Date, timeZone: string) {
  return zoneDayKey(value, timeZone).slice(0, 7);
}

function displayDate(value: string | Date, timeZone: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en-US', { ...options, timeZone }).format(typeof value === 'string' ? new Date(value) : value);
}

function displayTime(value: string, timeZone: string) {
  return displayDate(value, timeZone, { hour: 'numeric', minute: '2-digit' });
}

function statusLabel(status: string) {
  return status.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusClass(status: string) {
  if (status === 'arrived' || status === 'checked-in') return 'is-arrived';
  if (status === 'fulfilled') return 'is-complete';
  if (status === 'cancelled' || status === 'noshow') return 'is-coral';
  if (status === 'pending' || status === 'proposed') return 'is-pending';
  return 'is-booked';
}

function previewQuery(searchParams: URLSearchParams) {
  if (process.env.NODE_ENV === 'production') return '';
  const asUser = searchParams.get('asUser');
  if (asUser) return `asUser=${encodeURIComponent(asUser)}`;
  return ['1', 'true'].includes(searchParams.get('noauth') || '') ? 'noauth=1&asUser=dev' : '';
}

function withPreview(href: string, query: string) {
  return query ? `${href}${href.includes('?') ? '&' : '?'}${query}` : href;
}

function patientHref(appointment: SchedulingAppointment) {
  if (!appointment.patientId) return undefined;
  if (appointment.patientId.startsWith('patient-')) return `/dashboard/records/${encodeURIComponent(appointment.patientId)}`;
  return `/doctor/health-records/patient/${encodeURIComponent(appointment.patientId)}`;
}

function Metric({ label, value, detail, tone, icon, onClick }: { label: string; value: string | number; detail: string; tone: string; icon: string; onClick: () => void }) {
  return <button type="button" className="appt-metric" onClick={onClick}><span className={`appt-metric-icon ${tone}`}><Icon name={icon} /></span><span><small>{label}</small><strong>{value}</strong><em>{detail}</em></span></button>;
}

function AppointmentRow({ appointment, snapshot, onOpen }: { appointment: SchedulingAppointment; snapshot: SchedulingSnapshot; onOpen: (appointment: SchedulingAppointment) => void }) {
  return <button type="button" className="appt-row" onClick={() => onOpen(appointment)}><span className="appt-row-time">{displayTime(appointment.start, snapshot.timeZone)}<small>{displayTime(appointment.end, snapshot.timeZone)}</small></span><span className="appt-row-patient"><strong>{appointment.patientName}</strong><small>{appointment.patientMrn ? `MRN ${appointment.patientMrn}` : 'MRN not documented'}</small></span><span>{appointment.appointmentType || appointment.serviceType || 'Appointment'}</span><span className="appt-row-provider"><Icon name="provider" size={14} /> {appointment.providerName}</span><span className="appt-row-location">{appointment.locationName || 'Location not documented'}</span><span className={`appt-status ${statusClass(appointment.status)}`}>{statusLabel(appointment.status)}</span><span className="appt-row-open">Open <Icon name="right" size={14} /></span></button>;
}

function QuickView({ appointment, snapshot, preview, onClose, onRefresh, onReschedule }: { appointment: SchedulingAppointment; snapshot: SchedulingSnapshot; preview: string; onClose: () => void; onRefresh: () => Promise<void>; onReschedule: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const link = patientHref(appointment);
  const canCheckIn = ['booked', 'pending', 'proposed', 'waitlist'].includes(appointment.status);
  const canCancel = !['cancelled', 'fulfilled', 'noshow', 'entered-in-error'].includes(appointment.status);
  useEffect(() => { const previous = document.activeElement as HTMLElement | null; closeRef.current?.focus(); const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); }; document.addEventListener('keydown', onKey); return () => { document.removeEventListener('keydown', onKey); previous?.focus(); }; }, [onClose]);
  async function update(status: 'arrived' | 'cancelled') { setBusy(true); try { const response = await fetch('/api/scheduling/status', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ appointmentId: appointment.id, status }) }); if (!response.ok) throw new Error('Appointment status could not be updated.'); onClose(); await onRefresh(); } catch (error) { window.dispatchEvent(new CustomEvent('rh-appointments-error', { detail: error instanceof Error ? error.message : 'Appointment status could not be updated.' })); } finally { setBusy(false); } }
  return <div className="appt-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><aside className="appt-drawer" role="dialog" aria-modal="true" aria-labelledby="appt-quick-title"><header><div><span className="appt-eyebrow">Appointment Quick View</span><h2 id="appt-quick-title">{appointment.patientName}</h2><p>{appointment.appointmentType || appointment.serviceType || 'Appointment'} · {displayDate(appointment.start, snapshot.timeZone, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p></div><button ref={closeRef} type="button" className="appt-icon-button" onClick={onClose} aria-label="Close appointment quick view"><Icon name="close" /></button></header><div className="appt-drawer-body"><div className="appt-drawer-status"><span className={`appt-status ${statusClass(appointment.status)}`}>{statusLabel(appointment.status)}</span><span>FHIR Appointment · {appointment.id.slice(0, 8)}</span></div><dl className="appt-detail-grid"><div><dt>Start and end</dt><dd>{displayTime(appointment.start, snapshot.timeZone)} to {displayTime(appointment.end, snapshot.timeZone)}</dd></div><div><dt>Provider</dt><dd>{appointment.providerName}</dd></div><div><dt>Location</dt><dd>{appointment.locationName || 'Not documented'}</dd></div><div><dt>Room</dt><dd>{appointment.room || 'Not documented'}</dd></div><div><dt>Patient MRN</dt><dd>{appointment.patientMrn || 'Not documented'}</dd></div><div><dt>Confirmation</dt><dd>{appointment.status === 'booked' ? 'Booked' : statusLabel(appointment.status)}</dd></div></dl><section><h3>Reason for visit</h3><p>{appointment.description || 'No reason for visit is documented.'}</p></section><section><h3>Patient readiness</h3><p>{appointment.status === 'arrived' ? 'Patient is marked arrived.' : 'Readiness details are not supplied by the scheduling source.'}</p></section><div className="appt-drawer-actions">{link && <Link href={withPreview(link, preview)} className="appt-primary-button">Open Patient</Link>}{link && <Link href={withPreview(`/dashboard/appointments/${encodeURIComponent(appointment.id)}`, preview)} className="appt-secondary-button">View Appointment Detail</Link>}{canCheckIn && <button type="button" className="appt-secondary-button" disabled={busy} onClick={() => void update('arrived')}><Icon name="check" size={15} /> Check In</button>}{appointment.status === 'arrived' && appointment.patientId?.startsWith('patient-') && <Link href={withPreview(`/dashboard/encounters/new?patientId=${encodeURIComponent(appointment.patientId)}&appointmentId=${encodeURIComponent(appointment.id)}`, preview)} className="appt-secondary-button">Start Encounter</Link>}{link && <Link href={withPreview(`/dashboard/messages?patientId=${encodeURIComponent(appointment.patientId || '')}&appointmentId=${encodeURIComponent(appointment.id)}`, preview)} className="appt-secondary-button">Message Patient</Link>}{link && <Link href={withPreview(`/dashboard/tasks?patientId=${encodeURIComponent(appointment.patientId || '')}&sourceAppointment=${encodeURIComponent(appointment.id)}`, preview)} className="appt-secondary-button">Create Task</Link>}{canCancel && <button type="button" className="appt-danger-button" onClick={() => setConfirmCancel(true)}>Cancel Appointment</button>}{canCancel && <button type="button" className="appt-secondary-button" onClick={onReschedule}>Reschedule</button>}</div>{confirmCancel && <div className="appt-confirm"><strong>Cancel this appointment?</strong><p>The appointment will remain in history with a cancelled status.</p><div><button type="button" className="appt-secondary-button" onClick={() => setConfirmCancel(false)}>Keep appointment</button><button type="button" className="appt-danger-button" disabled={busy} onClick={() => void update('cancelled')}>{busy ? 'Cancelling...' : 'Confirm cancellation'}</button></div></div>}</div></aside></div>;
}

function BookingDrawer({ snapshot, preview, selectedSlot, reschedule, onClose, onRefresh }: { snapshot: SchedulingSnapshot; preview: string; selectedSlot?: SchedulingSlot; reschedule?: SchedulingAppointment; onClose: () => void; onRefresh: () => Promise<void> }) {
  void preview;
  const [patientId, setPatientId] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [type, setType] = useState(reschedule?.appointmentType || reschedule?.serviceType || '');
  const [provider, setProvider] = useState(reschedule?.providerId || '');
  const [location, setLocation] = useState(reschedule?.locationId || '');
  const [slotId, setSlotId] = useState(selectedSlot?.id || '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [currentTime] = useState(() => Date.now());
  const patients = snapshot.patients.filter((patient) => [patient.name, patient.mrn].filter(Boolean).join(' ').toLowerCase().includes(patientSearch.toLowerCase())).slice(0, 8);
  const types = [...new Set(snapshot.appointments.map((appointment) => appointment.appointmentType || appointment.serviceType).filter((value): value is string => Boolean(value)))];
  const slots = snapshot.slots.filter((slot) => slot.status === 'free' && timestamp(slot.start) >= currentTime && (!provider || slot.practitionerId === provider) && (!location || slot.locationId === location)).sort((left, right) => timestamp(left.start) - timestamp(right.start));
  async function submit(event: React.FormEvent) { event.preventDefault(); if (!reschedule && !patientId) { setError('Select a patient before booking.'); return; } if (!slotId) { setError('Select a slot returned by the live availability source.'); return; } setSaving(true); setError(null); try { const endpoint = reschedule ? '/api/scheduling/reschedule' : '/api/scheduling/book'; const body = reschedule ? { appointmentId: reschedule.id, newSlotId: slotId } : { slotId, patient: { id: patientId, name: snapshot.patients.find((patient) => patient.id === patientId)?.name }, appointmentType: type || undefined }; const response = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); const payload = await response.json().catch(() => ({})) as { message?: string; error?: string }; if (!response.ok) throw new Error(payload.message || payload.error || 'The scheduling source rejected this request.'); onClose(); await onRefresh(); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'The scheduling source rejected this request.'); } finally { setSaving(false); } }
  return <div className="appt-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><aside className="appt-drawer" role="dialog" aria-modal="true" aria-labelledby="appt-book-title"><header><div><span className="appt-eyebrow">{reschedule ? 'Reschedule workflow' : 'Booking workflow'}</span><h2 id="appt-book-title">{reschedule ? 'Choose a new time' : 'Book Appointment'}</h2><p>{reschedule ? `Move ${reschedule.patientName} without deleting appointment history.` : 'Use an explicitly selected patient and a live available slot.'}</p></div><button type="button" className="appt-icon-button" onClick={onClose} aria-label="Close booking workflow"><Icon name="close" /></button></header><form className="appt-booking-form" onSubmit={submit}>{!reschedule && <fieldset><legend>1. Select Patient</legend><input value={patientSearch} onChange={(event) => setPatientSearch(event.target.value)} placeholder="Search name or MRN" aria-label="Search booking patients" /><div className="appt-option-list" role="listbox" aria-label="Booking patients">{patients.map((patient) => <button type="button" role="option" aria-selected={patient.id === patientId} className={patient.id === patientId ? 'is-selected' : ''} key={patient.id} onClick={() => setPatientId(patient.id)}><strong>{patient.name}</strong><span>{patient.mrn || 'MRN not documented'}{patient.birthDate ? ` · ${patient.birthDate}` : ''}</span></button>)}{!patients.length && <p>No patients match this search.</p>}</div></fieldset>}<fieldset><legend>{reschedule ? '1' : '2'}. Visit and provider</legend><label>Visit type<select value={type} onChange={(event) => setType(event.target.value)}><option value="">Select visit type</option>{types.map((item) => <option value={item} key={item}>{item}</option>)}{!types.length && <option value="Consultation">Consultation</option>}</select></label><label>Provider<select value={provider} onChange={(event) => { setProvider(event.target.value); setSlotId(''); }}><option value="">Any provider</option>{snapshot.providers.map((item) => <option value={item.id} key={item.id}>{item.name}{item.specialty ? ` · ${item.specialty}` : ''}</option>)}</select></label><label>Location<select value={location} onChange={(event) => { setLocation(event.target.value); setSlotId(''); }}><option value="">Any location</option>{snapshot.locations.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label></fieldset><fieldset><legend>{reschedule ? '2' : '3'}. Available slot</legend>{snapshot.sources.slots.state !== 'ready' ? <p className="appt-warning">Live availability is unavailable. No booking can be safely created.</p> : slots.length === 0 ? <p className="appt-warning">No slots are currently available for these criteria. Try another provider, location, or date range.</p> : <div className="appt-slot-list">{slots.slice(0, 24).map((slot) => <button type="button" className={slot.id === slotId ? 'is-selected' : ''} key={slot.id} onClick={() => setSlotId(slot.id)}><strong>{displayDate(slot.start, snapshot.timeZone, { weekday: 'short', month: 'short', day: 'numeric' })}</strong><span>{displayTime(slot.start, snapshot.timeZone)} to {displayTime(slot.end, snapshot.timeZone)}</span><small>{slot.practitionerName}{slot.locationName ? ` · ${slot.locationName}` : ''}</small></button>)}</div>}</fieldset>{error && <p className="appt-form-error" role="alert">{error}</p>}<footer className="appt-form-actions"><button type="button" className="appt-secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="appt-primary-button" disabled={saving || !slotId || (!reschedule && !patientId)}>{saving ? 'Saving...' : reschedule ? 'Confirm Reschedule' : 'Confirm Booking'}</button></footer></form></aside></div>;
}

export default function AppointmentsWorkspace({ initialData, includeMonth = false, initialBooking = false }: Props) {
  const searchParams = useSearchParams();
  const preview = previewQuery(searchParams);
  const [snapshot, setSnapshot] = useState(initialData);
  const [view, setView] = useState<View>('today');
  const [cursor, setCursor] = useState(() => new Date());
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [provider, setProvider] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState<Status>('');
  const [refreshing, setRefreshing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<SchedulingAppointment | null>(null);
  const [bookingOpen, setBookingOpen] = useState(initialBooking);
  const [selectedSlot, setSelectedSlot] = useState<SchedulingSlot | undefined>();
  const [reschedule, setReschedule] = useState<SchedulingAppointment | undefined>();
  const [currentTime] = useState(() => Date.now());

  async function refresh() { setRefreshing(true); setError(null); try { const response = await fetch(`/api/scheduling/workspace?${preview}`, { cache: 'no-store' }); if (!response.ok) throw new Error('Appointments could not be refreshed.'); setSnapshot(await response.json() as SchedulingSnapshot); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Appointments could not be refreshed.'); } finally { setRefreshing(false); } }
  useEffect(() => { const controller = new AbortController(); setSearching(Boolean(deferredSearch)); fetch(`/api/scheduling/workspace?q=${encodeURIComponent(deferredSearch)}&${preview}`, { cache: 'no-store', signal: controller.signal }).then(async (response) => { if (!response.ok) throw new Error('Appointment search could not be completed.'); return response.json() as Promise<SchedulingSnapshot>; }).then((next) => { setSnapshot(next); setSearching(false); }).catch((requestError: unknown) => { if ((requestError as { name?: string }).name !== 'AbortError') { setError(requestError instanceof Error ? requestError.message : 'Appointment search could not be completed.'); setSearching(false); } }); return () => controller.abort(); }, [deferredSearch, preview]);
  useEffect(() => { const handler = (event: Event) => setError((event as CustomEvent<string>).detail); window.addEventListener('rh-appointments-error', handler); return () => window.removeEventListener('rh-appointments-error', handler); }, []);
  useEffect(() => {
    const handler = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button') : null;
      const label = target?.textContent || '';
      if (!target || (!label.includes('Find Slot') && !label.includes('Find an available slot') && !label.includes('Book Appointment'))) return;
      event.preventDefault();
      event.stopPropagation();
      const href = label.includes('Find Slot') || label.includes('Find an available slot') ? withPreview('/scheduling', preview) : withPreview('/dashboard/appointments/book', preview);
      window.location.assign(href);
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [preview]);

  const filtered = useMemo(() => snapshot.appointments.filter((appointment) => (!provider || appointment.providerId === provider) && (!location || appointment.locationId === location) && (!status || appointment.status === status)).sort((left, right) => timestamp(left.start) - timestamp(right.start)), [location, provider, snapshot.appointments, status]);
  const today = new Date(currentTime);
  const weekStart = startOfWeek(cursor);
  const todayAppointments = filtered.filter((appointment) => sameDay(appointment.start, today, snapshot.timeZone));
  const weekStartKey = zoneDayKey(weekStart, snapshot.timeZone);
  const weekEndKey = zoneDayKey(addDays(weekStart, 6), snapshot.timeZone);
  const thisWeek = filtered.filter((appointment) => { const key = zoneDayKey(appointment.start, snapshot.timeZone); return key >= weekStartKey && key <= weekEndKey; });
  const rangeAppointments = view === 'today' ? filtered.filter((appointment) => sameDay(appointment.start, cursor, snapshot.timeZone)) : view === 'week' ? thisWeek : view === 'month' ? filtered.filter((appointment) => zoneMonthKey(appointment.start, snapshot.timeZone) === zoneMonthKey(cursor, snapshot.timeZone)) : filtered;
  const freeSlots = snapshot.slots.filter((slot) => slot.status === 'free' && timestamp(slot.start) >= currentTime);
  const unconfirmed = filtered.filter((appointment) => appointment.status === 'pending' || appointment.status === 'proposed');
  const viewDate = view === 'today' ? displayDate(cursor, snapshot.timeZone, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : view === 'month' ? displayDate(cursor, snapshot.timeZone, { month: 'long', year: 'numeric' }) : `${displayDate(weekStart, snapshot.timeZone, { month: 'short', day: 'numeric' })} to ${displayDate(addDays(weekStart, 6), snapshot.timeZone, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  function clearFilters() { setSearch(''); setProvider(''); setLocation(''); setStatus(''); }
  function changePeriod(direction: number) { setCursor((current) => view === 'month' ? new Date(current.getFullYear(), current.getMonth() + direction, 1) : addDays(current, view === 'week' ? direction * 7 : direction)); }
  function openBooking(slot?: SchedulingSlot) { setSelectedSlot(slot); setReschedule(undefined); setBookingOpen(true); }
  function openReschedule() { if (selected) { setReschedule(selected); setSelected(null); setSelectedSlot(undefined); setBookingOpen(true); } }
  const statusOptions: Status[] = ['', 'booked', 'pending', 'proposed', 'arrived', 'fulfilled', 'cancelled', 'noshow'];
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const monthGridStart = addDays(monthStart, -monthStart.getDay());
  const monthDays = Array.from({ length: 42 }, (_, index) => addDays(monthGridStart, index));

  return <main className="appt-page" aria-labelledby="appt-page-title"><header className="appt-header"><div><span className="appt-eyebrow">Clinical scheduling</span><h1 id="appt-page-title">Appointments</h1><p>Manage today's appointments, provider schedules, patient flow, and clinical booking.</p><span className="appt-context">{displayDate(today, snapshot.timeZone, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })} · Maple Health · {snapshot.providers.length ? 'All Providers' : 'Provider directory unavailable'}</span></div><div className="appt-header-actions"><button type="button" className="appt-secondary-button" onClick={() => openBooking()}><Icon name="search" size={15} /> Find Slot</button><button type="button" className="appt-primary-button" onClick={() => openBooking()}><Icon name="plus" size={15} /> Book Appointment</button><button type="button" className="appt-icon-button" onClick={() => void refresh()} disabled={refreshing} aria-label="Refresh appointments"><Icon name="refresh" /></button></div></header>{error && <div className="appt-error" role="alert">{error}<button type="button" onClick={() => setError(null)} aria-label="Dismiss error"><Icon name="close" size={14} /></button></div>}<section className="appt-pulse" aria-label="Appointment Pulse"><Metric label="Today" value={todayAppointments.length} detail="appointments" tone="is-blue" icon="calendar" onClick={() => { setView('today'); setCursor(new Date()); }} /><Metric label="This Week" value={thisWeek.length} detail="appointments" tone="is-teal" icon="calendar" onClick={() => setView('week')} /><Metric label="Available Slots" value={snapshot.sources.slots.state === 'ready' ? freeSlots.length : '-'} detail={snapshot.sources.slots.state === 'ready' ? 'open slots' : 'availability unavailable'} tone="is-green" icon="check" onClick={() => setView('availability')} /><Metric label="Unconfirmed" value={unconfirmed.length} detail="require review" tone="is-amber" icon="alert" onClick={() => { setStatus('pending'); setView('list'); }} /></section><section className="appt-toolbar" aria-label="Appointment filters"><div className="appt-search"><Icon name="search" /><input value={search} onChange={(event) => { setSearch(event.target.value); setSearching(true); }} placeholder="Search patients, appointments, or providers..." aria-label="Search patients, appointments, or providers" /><span aria-live="polite">{searching ? 'Searching...' : `${filtered.length} shown`}</span></div><div className="appt-filters"><select aria-label="Provider filter" value={provider} onChange={(event) => setProvider(event.target.value)}><option value="">All providers</option>{snapshot.providers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select aria-label="Location filter" value={location} onChange={(event) => setLocation(event.target.value)}><option value="">All locations</option>{snapshot.locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select aria-label="Status filter" value={status} onChange={(event) => setStatus(event.target.value as Status)}>{statusOptions.map((item) => <option key={item || 'all'} value={item}>{item ? statusLabel(item) : 'All statuses'}</option>)}</select>{(provider || location || status || search) && <button type="button" className="appt-clear-button" onClick={clearFilters}>Clear All</button>}</div></section><section className="appt-navigation" aria-label="Appointment views"><div className="appt-view-tabs" role="tablist" aria-label="Appointment view selection">{(['today', 'week', ...(includeMonth ? ['month' as const] : []), 'list', 'availability'] as View[]).map((item) => <button type="button" role="tab" aria-selected={view === item} key={item} onClick={() => setView(item)}>{item === 'today' ? 'Day' : item[0].toUpperCase() + item.slice(1)}</button>)}</div><div className="appt-date-nav"><button type="button" className="appt-icon-button" onClick={() => changePeriod(-1)} aria-label="Previous period"><Icon name="left" /></button><button type="button" className="appt-today-button" onClick={() => setCursor(new Date())}>Today</button><span>{viewDate}</span><button type="button" className="appt-icon-button" onClick={() => changePeriod(1)} aria-label="Next period"><Icon name="right" /></button></div><span className="appt-source"><i />{snapshot.sources.appointments.state === 'ready' ? 'Live Appointment source' : 'Appointment source unavailable'}</span></section>{view === 'today' && <section className="appt-day-layout"><div className="appt-schedule-surface"><div className="appt-section-heading"><div><span className="appt-eyebrow">Today&apos;s clinic flow</span><h2>{viewDate}</h2></div><span>{rangeAppointments.length} scheduled</span></div>{rangeAppointments.length ? <div className="appt-day-list"><div className="appt-now"><span>NOW</span><time>{displayTime(new Date().toISOString(), snapshot.timeZone)}</time></div>{rangeAppointments.map((appointment) => <AppointmentRow key={appointment.id} appointment={appointment} snapshot={snapshot} onOpen={setSelected} />)}</div> : <div className="appt-empty"><Icon name="calendar" size={26} /><h3>No appointments scheduled for this day</h3><p>The live Appointment source returned no visits for this date.</p><button type="button" className="appt-secondary-button" onClick={() => openBooking()}>Find an available slot</button></div>}</div><aside className="appt-rail"><div className="appt-section-heading"><div><span className="appt-eyebrow">Operations</span><h2>Today at a glance</h2></div></div><div className="appt-rail-row"><span>Scheduled</span><strong>{todayAppointments.length}</strong></div><div className="appt-rail-row"><span>Unconfirmed</span><strong>{unconfirmed.length}</strong></div><div className="appt-rail-row"><span>Open slots</span><strong>{snapshot.sources.slots.state === 'ready' ? freeSlots.length : '-'}</strong></div><div className="appt-rail-note"><Icon name="clock" size={15} />Waiting status is not supplied by the current scheduling source.</div>{todayAppointments[0] && <div className="appt-next"><span className="appt-eyebrow">Next scheduled</span><strong>{todayAppointments[0].patientName}</strong><span>{displayTime(todayAppointments[0].start, snapshot.timeZone)} · {todayAppointments[0].appointmentType || 'Appointment'}</span><button type="button" onClick={() => setSelected(todayAppointments[0])}>Open appointment</button></div>}</aside></section>}{view === 'week' && <section className="appt-calendar-surface"><div className="appt-section-heading"><div><span className="appt-eyebrow">Week planning</span><h2>{viewDate}</h2></div><span>{thisWeek.length} appointments</span></div><div className="appt-week-grid">{weekDays.map((day) => { const appointments = thisWeek.filter((appointment) => sameDay(appointment.start, day, snapshot.timeZone)); return <div className={`appt-week-day ${sameDay(day.toISOString(), today, snapshot.timeZone) ? 'is-today' : ''}`} key={day.toISOString()}><button type="button" className="appt-week-day-header" onClick={() => { setCursor(day); setView('today'); }}><span>{displayDate(day, snapshot.timeZone, { weekday: 'short' }).toUpperCase()}</span><strong>{day.getDate()}</strong><small>{appointments.length} appointment{appointments.length === 1 ? '' : 's'}</small></button><div className="appt-week-items">{appointments.length ? appointments.map((appointment) => <AppointmentRow key={appointment.id} appointment={appointment} snapshot={snapshot} onOpen={setSelected} />) : <button type="button" className="appt-empty-day" onClick={() => { setCursor(day); setView('today'); }}>No appointments<span>Open day</span></button>}</div></div>; })}</div></section>}{view === 'month' && <section className="appt-calendar-surface"><div className="appt-section-heading"><div><span className="appt-eyebrow">Month planning</span><h2>{viewDate}</h2></div><span>{rangeAppointments.length} appointments</span></div><div className="appt-month-grid" role="grid" aria-label={viewDate}>{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span className="appt-month-label" key={day}>{day}</span>)}{monthDays.map((day) => { const appointments = rangeAppointments.filter((appointment) => sameDay(appointment.start, day, snapshot.timeZone)); const inMonth = day.getMonth() === cursor.getMonth(); return <button type="button" role="gridcell" key={day.toISOString()} className={`appt-month-day ${inMonth ? '' : 'is-muted'} ${sameDay(day.toISOString(), today, snapshot.timeZone) ? 'is-today' : ''}`} onClick={() => { setCursor(day); setView('today'); }} aria-label={`${displayDate(day, snapshot.timeZone, { month: 'long', day: 'numeric', year: 'numeric' })}, ${appointments.length} appointments`}><strong>{day.getDate()}</strong>{appointments.length ? <><small>{appointments.length} appointment{appointments.length === 1 ? '' : 's'}</small>{appointments.slice(0, 2).map((appointment) => <span className={`appt-month-preview ${statusClass(appointment.status)}`} key={appointment.id}>{displayTime(appointment.start, snapshot.timeZone)} · {appointment.patientName}</span>)}{appointments.length > 2 && <span className="appt-month-more">+{appointments.length - 2} more</span>}</> : <small className="appt-month-empty">Open day</small>}</button>; })}</div><div className="appt-legend"><span><i className="is-booked" />Booked / scheduled</span><span><i className="is-pending" />Needs confirmation</span><span><i className="is-arrived" />Arrived</span><span><i className="is-complete" />Fulfilled</span></div></section>}{view === 'list' && <section className="appt-list-surface"><div className="appt-section-heading"><div><span className="appt-eyebrow">Appointment worklist</span><h2>Appointments</h2></div><span>{rangeAppointments.length} shown</span></div><div className="appt-list-header"><span>Time</span><span>Patient</span><span>Visit</span><span>Provider</span><span>Location</span><span>Status</span><span /></div>{rangeAppointments.length ? rangeAppointments.map((appointment) => <AppointmentRow key={appointment.id} appointment={appointment} snapshot={snapshot} onOpen={setSelected} />) : <div className="appt-empty"><Icon name="calendar" size={26} /><h3>No appointments match these filters</h3><button type="button" className="appt-secondary-button" onClick={clearFilters}>Clear filters</button></div>}</section>}{view === 'availability' && <section className="appt-list-surface"><div className="appt-section-heading"><div><span className="appt-eyebrow">Live availability</span><h2>Open Slots</h2></div><span>{snapshot.sources.slots.state === 'ready' ? `${freeSlots.length} returned` : 'Unavailable'}</span></div>{snapshot.sources.slots.state !== 'ready' ? <div className="appt-empty"><Icon name="clock" size={26} /><h3>Live availability temporarily unavailable</h3><p>Existing appointments remain available. Retry to request current slots again.</p><button type="button" className="appt-secondary-button" onClick={() => void refresh()}>Retry availability</button></div> : freeSlots.length ? <div className="appt-slot-grid">{freeSlots.slice(0, 40).map((slot) => <div className="appt-slot-card" key={slot.id}><div><strong>{displayDate(slot.start, snapshot.timeZone, { weekday: 'short', month: 'short', day: 'numeric' })}</strong><span>{displayTime(slot.start, snapshot.timeZone)} to {displayTime(slot.end, snapshot.timeZone)}</span><small>{slot.practitionerName}{slot.locationName ? ` · ${slot.locationName}` : ''}</small></div><button type="button" className="appt-secondary-button" onClick={() => openBooking(slot)}>Book</button></div>)}</div> : <div className="appt-empty"><Icon name="clock" size={26} /><h3>No slots are currently available</h3><p>Try a different provider, location, or date range.</p><button type="button" className="appt-secondary-button" onClick={() => openBooking()}>Find another slot</button></div>}</section>}{selected && <QuickView appointment={selected} snapshot={snapshot} preview={preview} onClose={() => setSelected(null)} onRefresh={refresh} onReschedule={openReschedule} />}{bookingOpen && <BookingDrawer snapshot={snapshot} preview={preview} selectedSlot={selectedSlot} reschedule={reschedule} onClose={() => { setBookingOpen(false); setReschedule(undefined); setSelectedSlot(undefined); }} onRefresh={refresh} />}</main>;
}
