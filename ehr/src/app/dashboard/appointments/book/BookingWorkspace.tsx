"use client";

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDeferredValue, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import type { BookingDraft } from '@/lib/bookingDraftStore';
import type { SchedulingAppointment, SchedulingLocation, SchedulingPatient, SchedulingProvider, SchedulingSlot, SchedulingSnapshot } from '@/lib/schedulingData';
import './booking-workspace.css';

type Props = { initialData: SchedulingSnapshot; initialDraft?: BookingDraft | null };
type BookingSuccess = { appointmentId: string; slot: SchedulingSlot; patient: SchedulingPatient; appointmentType: string };
type ApiError = { error?: string; message?: string; code?: string; existing?: { id: string; start: string; end: string; appointmentType?: string } };

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    arrowLeft: <path d="m15 18-6-6 6-6" />,
    arrowRight: <path d="m9 18 6-6-6-6" />,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
    user: <><circle cx="12" cy="8" r="3" /><path d="M5 21a7 7 0 0 1 14 0" /></>,
    provider: <><path d="M6 3v5a4 4 0 0 0 8 0V3M4 3h4M12 3h4M14 12v3a4 4 0 0 0 4 4h1a2 2 0 0 0 2-2v-1" /><circle cx="19" cy="12" r="2" /></>,
    location: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></>,
    alert: <><path d="M12 3 21 19H3L12 3z" /><path d="M12 9v4M12 16h.01" /></>,
    save: <><path d="M5 3h12l2 2v16H5z" /><path d="M8 3v6h8V3M8 16h8" /></>,
    note: <><path d="M5 3h14v18H5z" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    refresh: <><path d="M20 11a8 8 0 0 0-14-5L3 9M3 4v5h5M4 13a8 8 0 0 0 14 5l3-3M21 20v-5h-5" /></>,
    chevronDown: <path d="m6 9 6 6 6-6" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.calendar}</svg>;
}

function previewQuery(searchParams: URLSearchParams) {
  const query = new URLSearchParams();
  const asUser = searchParams.get('asUser');
  if (asUser) query.set('asUser', asUser);
  else if (['1', 'true'].includes(searchParams.get('noauth') || '')) query.set('noauth', '1');
  return query;
}

function withPreview(href: string, searchParams: URLSearchParams) {
  const query = previewQuery(searchParams).toString();
  return query ? `${href}${href.includes('?') ? '&' : '?'}${query}` : href;
}

function patientChartHref(patientId: string) {
  return patientId.startsWith('patient-') ? `/dashboard/records/${encodeURIComponent(patientId)}` : `/doctor/health-records/patient/${encodeURIComponent(patientId)}`;
}

function zoneDateKey(value: string | Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(typeof value === 'string' ? new Date(value) : value);
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year || 2026, (month || 1) - 1, day || 1, 12);
}

function shiftDateKey(value: string, amount: number, timeZone: string) {
  const date = parseDateKey(value);
  date.setDate(date.getDate() + amount);
  return zoneDateKey(date, timeZone);
}

function formatDate(value: string | Date, timeZone: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en-US', { ...options, timeZone }).format(typeof value === 'string' ? new Date(value) : value);
}

function formatTime(value: string, timeZone: string) {
  return formatDate(value, timeZone, { hour: 'numeric', minute: '2-digit' });
}

function durationMinutes(slot?: SchedulingSlot) {
  if (!slot) return null;
  const duration = (Date.parse(slot.end) - Date.parse(slot.start)) / 60000;
  return Number.isFinite(duration) && duration > 0 ? duration : null;
}

function durationLabel(slot?: SchedulingSlot) {
  const minutes = durationMinutes(slot);
  return minutes ? `${minutes} min` : 'Duration not documented';
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('') || '?';
}

function activeAppointment(appointment: SchedulingAppointment) {
  return ['proposed', 'pending', 'booked', 'arrived', 'checked-in', 'waitlist'].includes(appointment.status);
}

function matchesServiceType(slot: SchedulingSlot, appointmentType: string) {
  return !appointmentType || !slot.serviceType || slot.serviceType.toLowerCase() === appointmentType.toLowerCase();
}

function slotStatusLabel(status: string) {
  return status === 'busy-unavailable' ? 'Unavailable' : status === 'busy-tentative' ? 'Tentative' : status === 'entered-in-error' ? 'Unavailable' : 'Booked';
}

function PatientSearch({ selectedPatient, query, results, onQuery, onSelect, onClear }: { selectedPatient: SchedulingPatient | null; query: string; results: SchedulingPatient[]; onQuery: (value: string) => void; onSelect: (patient: SchedulingPatient) => void; onClear: () => void }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const safeActiveIndex = Math.min(activeIndex, Math.max(0, results.length - 1));
  if (selectedPatient) return <div className="booking-patient-card"><div className="booking-patient-avatar">{initials(selectedPatient.name)}</div><div className="booking-patient-identity"><span className="booking-card-kicker">Selected patient</span><strong>{selectedPatient.name}</strong><span>DOB {selectedPatient.birthDate ? selectedPatient.birthDate : 'Not documented'}{selectedPatient.mrn ? ` · MRN ${selectedPatient.mrn}` : ''}</span><span className="booking-patient-status">Active record · allergies not supplied by scheduling directory</span></div><button type="button" className="booking-link-button" onClick={() => { onClear(); inputRef.current?.focus(); }}>Change Patient</button></div>;
  return <div className="booking-patient-search"><label htmlFor="booking-patient-input">Patient <span aria-hidden="true">*</span></label><div className="booking-search-input"><Icon name="search" size={17} /><input ref={inputRef} id="booking-patient-input" value={query} onChange={(event) => onQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'ArrowDown') { event.preventDefault(); setActiveIndex((current) => Math.min(current + 1, Math.max(0, results.length - 1))); } if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex((current) => Math.max(0, current - 1)); } if (event.key === 'Enter' && results[safeActiveIndex]) { event.preventDefault(); onSelect(results[safeActiveIndex]); } if (event.key === 'Escape') { onQuery(''); } }} placeholder="Search by name, MRN, phone..." autoComplete="off" aria-autocomplete="list" aria-controls="booking-patient-results" /></div>{query.length >= 2 && <div id="booking-patient-results" className="booking-search-results" role="listbox" aria-label="Patient search results">{results.length ? results.map((patient, index) => <button type="button" role="option" aria-selected={index === safeActiveIndex} className={index === safeActiveIndex ? 'is-active' : ''} key={patient.id} onMouseEnter={() => setActiveIndex(index)} onClick={() => onSelect(patient)}><span className="booking-result-avatar">{initials(patient.name)}</span><span><strong>{patient.name}</strong><small>DOB {patient.birthDate || 'Not documented'} · MRN {patient.mrn || 'Not documented'}</small></span><span className="booking-result-select">Select</span></button>) : <div className="booking-search-empty">No patient found.<button type="button" className="booking-link-button" onClick={() => onQuery('')}>Clear Search</button></div>}</div>}{query.length > 0 && query.length < 2 && <p className="booking-field-hint">Enter at least 2 characters to search the scheduling directory.</p>}</div>;
}

function Progress({ patient, visit, slot, review }: { patient: boolean; visit: boolean; slot: boolean; review: boolean }) {
  const steps = [['Patient', patient], ['Visit', visit], ['Time', slot], ['Review', review]] as const;
  return <ol className="booking-progress" aria-label="Booking progress">{steps.map(([label, complete], index) => <li className={complete ? 'is-complete' : index === steps.findIndex(([, done]) => !done) ? 'is-current' : ''} key={label}><span>{complete ? <Icon name="check" size={14} /> : index + 1}</span>{label}{index < steps.length - 1 && <b aria-hidden="true">→</b>}</li>)}</ol>;
}

function SlotCard({ slot, snapshot, selected, availableOnly, onSelect }: { slot: SchedulingSlot; snapshot: SchedulingSnapshot; selected: boolean; availableOnly: boolean; onSelect: () => void }) {
  const available = slot.status === 'free';
  void availableOnly;
  const disabled = !available;
  return <button type="button" className={`booking-slot-card ${selected ? 'is-selected' : ''} ${!available ? 'is-unavailable' : ''}`} disabled={disabled} onClick={onSelect} aria-pressed={selected} aria-label={`${formatTime(slot.start, snapshot.timeZone)} to ${formatTime(slot.end, snapshot.timeZone)}. ${slot.practitionerName}. ${slot.locationName || 'Location not documented'}. ${available ? selected ? 'Selected appointment time.' : 'Available. Select appointment time.' : `${slotStatusLabel(slot.status)}.`}`}><span className="booking-slot-time">{selected && <Icon name="check" size={14} />}{formatTime(slot.start, snapshot.timeZone)}</span><span className="booking-slot-duration">{durationLabel(slot)}</span><strong>{slot.practitionerName}</strong><small>{slot.locationName || 'Location not documented'}</small><span className={`booking-slot-state ${available ? 'is-available' : 'is-muted'}`}>{selected ? 'Selected' : available ? 'Select' : slotStatusLabel(slot.status)}</span></button>;
}

function SectionHeading({ kicker, title, detail }: { kicker: string; title: string; detail?: string }) {
  return <div className="booking-section-heading"><div><span className="booking-section-kicker">{kicker}</span><h2>{title}</h2></div>{detail && <span>{detail}</span>}</div>;
}

export default function BookingWorkspace({ initialData, initialDraft = null }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preview = previewQuery(searchParams);
  const previewKey = preview.toString();
  const timeZone = initialData.timeZone;
  const initialDate = initialDraft?.date || zoneDateKey(new Date(), timeZone);
  const [snapshot] = useState(initialData);
  const [rangeStart, setRangeStart] = useState(initialDate);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [patient, setPatient] = useState<SchedulingPatient | null>(null);
  const [patientQuery, setPatientQuery] = useState('');
  const [patientResults, setPatientResults] = useState<SchedulingPatient[]>([]);
  const [patientSearching] = useState(false);
  const [appointmentType, setAppointmentType] = useState(initialDraft?.appointmentType || '');
  const [providerId, setProviderId] = useState(initialDraft?.providerId || '');
  const [locationId, setLocationId] = useState(initialDraft?.locationId || '');
  const [selectedSlotId, setSelectedSlotId] = useState(initialDraft?.slotId || '');
  const [reason, setReason] = useState(initialDraft?.reason || '');
  const [notes, setNotes] = useState(initialDraft?.notes || '');
  const [availableOnly, setAvailableOnly] = useState(true);
  const [notesOpen, setNotesOpen] = useState(Boolean(initialDraft?.notes));
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState(initialDraft?.updatedAt || '');
  const [error, setError] = useState<string | null>(initialData.sources.slots.state === 'unavailable' ? `We couldn't load live availability. ${initialData.sources.slots.error || 'Try again later.'}` : null);
  const [duplicate, setDuplicate] = useState<ApiError['existing']>();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [booking, setBooking] = useState(false);
  const [openChartAfter, setOpenChartAfter] = useState(false);
  const [success, setSuccess] = useState<BookingSuccess | null>(null);
  const deferredPatientQuery = useDeferredValue(patientQuery);
  const bookingKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (initialDraft?.patientId) {
      fetch(`/api/scheduling/patients?patientId=${encodeURIComponent(initialDraft.patientId)}&${previewKey}`, { cache: 'no-store' }).then(async (response) => response.ok ? response.json() as Promise<{ data?: SchedulingPatient[] }> : { data: [] }).then((payload) => { if (payload.data?.[0]) setPatient(payload.data[0]); }).catch(() => undefined);
    }
  }, [initialDraft?.patientId, previewKey]);

  useEffect(() => {
    const query = deferredPatientQuery.trim();
    if (query.length < 2 || patient) return;
    const controller = new AbortController();
    fetch(`/api/scheduling/patients?query=${encodeURIComponent(query)}&limit=8&${previewKey}`, { cache: 'no-store', signal: controller.signal }).then(async (response) => { if (!response.ok) throw new Error('Patient search could not be completed.'); return response.json() as Promise<{ data?: SchedulingPatient[] }>; }).then((payload) => setPatientResults(payload.data || [])).catch((requestError: unknown) => { if ((requestError as { name?: string }).name !== 'AbortError') setError(requestError instanceof Error ? requestError.message : 'Patient search could not be completed.'); });
    return () => controller.abort();
  }, [deferredPatientQuery, patient, previewKey]);

  const providers = useMemo<SchedulingProvider[]>(() => snapshot.providers, [snapshot.providers]);
  const locations = useMemo<SchedulingLocation[]>(() => snapshot.locations, [snapshot.locations]);
  const appointmentTypes = useMemo(() => [...new Set([...snapshot.slots.map((slot) => slot.serviceType), ...snapshot.appointments.map((appointment) => appointment.appointmentType || appointment.serviceType)].filter((value): value is string => Boolean(value)))], [snapshot.appointments, snapshot.slots]);
  const visibleTypes = appointmentTypes.length ? appointmentTypes : ['Consultation'];
  const dates = useMemo(() => Array.from({ length: 7 }, (_, index) => shiftDateKey(rangeStart, index, timeZone)), [rangeStart, timeZone]);
  const matchingSlots = useMemo(() => snapshot.slots.filter((slot) => (!providerId || slot.practitionerId === providerId) && (!locationId || slot.locationId === locationId) && matchesServiceType(slot, appointmentType)).sort((left, right) => Date.parse(left.start) - Date.parse(right.start)), [appointmentType, locationId, providerId, snapshot.slots]);
  const slotsForDate = useMemo(() => matchingSlots.filter((slot) => zoneDateKey(slot.start, timeZone) === selectedDate), [matchingSlots, selectedDate, timeZone]);
  const bookableSlots = slotsForDate.filter((slot) => slot.status === 'free');
  const selectedSlot = matchingSlots.find((slot) => slot.id === selectedSlotId);
  const selectedSlotStillVisible = Boolean(selectedSlot && zoneDateKey(selectedSlot.start, timeZone) === selectedDate && (selectedSlot.status === 'free' || !availableOnly));
  const groupedSlots = useMemo(() => {
    const groups: Record<string, SchedulingSlot[]> = { Morning: [], Afternoon: [], Evening: [] };
    slotsForDate.forEach((slot) => { const hour = Number(formatDate(slot.start, timeZone, { hour: 'numeric', hour12: false })); const group = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening'; if (availableOnly && slot.status !== 'free') return; groups[group].push(slot); });
    return groups;
  }, [availableOnly, slotsForDate, timeZone]);
  const dateCounts = useMemo(() => Object.fromEntries(dates.map((date) => [date, matchingSlots.filter((slot) => zoneDateKey(slot.start, timeZone) === date && slot.status === 'free').length])), [dates, matchingSlots, timeZone]);
  const duplicateAppointments = useMemo(() => patient ? snapshot.appointments.filter((appointment) => appointment.patientId === patient.id && activeAppointment(appointment) && zoneDateKey(appointment.start, timeZone) === selectedDate && (!appointmentType || (appointment.appointmentType || appointment.serviceType || '').toLowerCase() === appointmentType.toLowerCase())) : [], [appointmentType, patient, selectedDate, snapshot.appointments, timeZone]);
  const upcomingAppointments = useMemo(() => patient ? snapshot.appointments.filter((appointment) => appointment.patientId === patient.id && activeAppointment(appointment)).sort((left, right) => Date.parse(left.start) - Date.parse(right.start)).slice(0, 2) : [], [patient, snapshot.appointments]);
  const providerName = selectedSlot?.practitionerName || providers.find((provider) => provider.id === providerId)?.name || 'All Providers';
  const locationName = selectedSlot?.locationName || locations.find((location) => location.id === locationId)?.name || 'Location selected by slot';
  const requiredComplete = Boolean(patient && appointmentType && selectedSlot && selectedSlot.status === 'free');
  const dateLabel = formatDate(`${selectedDate}T12:00:00`, timeZone, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  function selectPatient(next: SchedulingPatient) { setPatient(next); setPatientQuery(''); setPatientResults([]); setError(null); }
  function clearPatient() { setPatient(null); setPatientQuery(''); setSelectedSlotId(''); }
  function changeDate(next: string) { setSelectedDate(next); if (!dates.includes(next)) setRangeStart(next); setSelectedSlotId(''); }
  function changeProvider(next: string) { setProviderId(next); setSelectedSlotId(''); }
  function changeLocation(next: string) { setLocationId(next); setSelectedSlotId(''); }
  function nextAvailable() { const next = matchingSlots.find((slot) => slot.status === 'free'); if (!next) return; const nextDate = zoneDateKey(next.start, timeZone); setSelectedDate(nextDate); setRangeStart(nextDate); setSelectedSlotId(next.id); }

  async function saveDraft() {
    setSavingDraft(true); setError(null);
    try {
      const response = await fetch(`/api/scheduling/draft?${previewKey}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ patientId: patient?.id, appointmentType, providerId, locationId, date: selectedDate, slotId: selectedSlotId, reason, notes }) });
      const payload = await response.json() as { data?: BookingDraft; error?: string };
      if (!response.ok || !payload.data) throw new Error(payload.error || 'Booking draft could not be saved.');
      setDraftSavedAt(payload.data.updatedAt);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Booking draft could not be saved.'); } finally { setSavingDraft(false); }
  }

  async function discardDraft() {
    setSavingDraft(true); setError(null);
    try { const response = await fetch(`/api/scheduling/draft?${previewKey}`, { method: 'DELETE' }); if (!response.ok) throw new Error('Booking draft could not be discarded.'); setDraftSavedAt(''); setPatient(null); setPatientQuery(''); setAppointmentType(''); setProviderId(''); setLocationId(''); setSelectedSlotId(''); setReason(''); setNotes(''); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Booking draft could not be discarded.'); } finally { setSavingDraft(false); }
  }

  function requestBooking(openChart: boolean) {
    setOpenChartAfter(openChart); setError(null); setDuplicate(undefined);
    if (!patient) { setError('Select a patient before booking.'); return; }
    if (!appointmentType) { setError('Select an appointment type before booking.'); return; }
    if (!selectedSlot || selectedSlot.status !== 'free') { setError('Select a live available time before booking.'); return; }
    if (duplicateAppointments.length) { setDuplicate({ id: duplicateAppointments[0].id, start: duplicateAppointments[0].start, end: duplicateAppointments[0].end, appointmentType: duplicateAppointments[0].appointmentType || duplicateAppointments[0].serviceType }); }
    setConfirmOpen(true);
  }

  async function confirmBooking(event?: FormEvent) {
    event?.preventDefault();
    if (!patient || !selectedSlot || selectedSlot.status !== 'free') return;
    setBooking(true); setError(null);
    try {
      const idempotencyKey = bookingKeyRef.current || (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `booking-${selectedSlot.id}-${patient.id}`);
      bookingKeyRef.current = idempotencyKey;
      const response = await fetch(`/api/scheduling/book${previewKey ? `?${previewKey}` : ''}`, { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ slotId: selectedSlot.id, patient: { id: patient.id, name: patient.name }, appointmentType, providerId: selectedSlot.practitionerId, locationId: selectedSlot.locationId, slotStart: selectedSlot.start, slotEnd: selectedSlot.end, reason, notes, allowDuplicate: Boolean(duplicate) }) });
      const payload = await response.json() as { success?: boolean; appointment?: { id?: string }; message?: string; error?: string; code?: string; existing?: ApiError['existing'] };
      if (response.status === 409 && payload.code === 'DUPLICATE_APPOINTMENT') { setDuplicate(payload.existing); setConfirmOpen(true); return; }
      if (!response.ok || !payload.appointment?.id) throw new Error(payload.message || payload.error || 'Appointment was not booked. Your selections have been preserved.');
      setSuccess({ appointmentId: payload.appointment.id, slot: selectedSlot, patient, appointmentType });
      setConfirmOpen(false); bookingKeyRef.current = null;
      void fetch(`/api/scheduling/draft?${previewKey}`, { method: 'DELETE' });
      if (openChartAfter) router.push(withPreview(patientChartHref(patient.id), searchParams));
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Appointment was not booked. Your selections have been preserved.'); } finally { setBooking(false); }
  }

  if (success) return <main className="booking-page" aria-labelledby="booking-success-title"><header className="booking-header"><div><span className="booking-eyebrow">Clinical scheduling</span><h1>Book Appointment</h1></div><Link href={withPreview('/scheduling', searchParams)} className="booking-secondary-button"><Icon name="arrowLeft" size={15} /> Back to Scheduling</Link></header><section className="booking-success" role="status"><span className="booking-success-icon"><Icon name="check" size={30} /></span><span className="booking-eyebrow">Backend confirmed</span><h2 id="booking-success-title">Appointment Booked</h2><p>{success.patient.name} · {success.appointmentType}</p><div className="booking-success-summary"><div><span>Date</span><strong>{formatDate(success.slot.start, timeZone, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</strong></div><div><span>Time</span><strong>{formatTime(success.slot.start, timeZone)} to {formatTime(success.slot.end, timeZone)}</strong></div><div><span>Provider</span><strong>{success.slot.practitionerName}</strong></div><div><span>Location</span><strong>{success.slot.locationName || 'Location not documented'}</strong></div></div><div className="booking-success-actions"><Link href={withPreview(`/dashboard/appointments/${encodeURIComponent(success.appointmentId)}`, searchParams)} className="booking-primary-button">Open Appointment <Icon name="arrowRight" size={15} /></Link><Link href={withPreview(patientChartHref(success.patient.id), searchParams)} className="booking-secondary-button">Open Patient Chart</Link><Link href={withPreview('/scheduling', searchParams)} className="booking-secondary-button">Return to Scheduling</Link><Link href={withPreview('/communication/messages?new=1', searchParams)} className="booking-secondary-button">Message Patient</Link></div></section></main>;

  return <main className="booking-page" aria-labelledby="booking-title"><header className="booking-header"><div><span className="booking-eyebrow">Clinical scheduling</span><h1 id="booking-title">Book Appointment</h1><p>Select a patient, appointment type, provider and available time.</p><Progress patient={Boolean(patient)} visit={Boolean(appointmentType)} slot={Boolean(selectedSlotStillVisible)} review={confirmOpen} /></div><Link href={withPreview('/scheduling', searchParams)} className="booking-secondary-button"><Icon name="arrowLeft" size={15} /> Back to Scheduling</Link></header>{error && <div className="booking-alert" role="alert"><Icon name="alert" size={16} /><span>{error}</span><button type="button" aria-label="Dismiss booking error" onClick={() => setError(null)}><Icon name="close" size={14} /></button></div>}<div className="booking-layout"><section className="booking-availability-column"><div className="booking-panel booking-date-panel"><SectionHeading kicker="1 · Find a time" title="Availability" detail={`${bookableSlots.length} available ${bookableSlots.length === 1 ? 'time' : 'times'}`} /><div className="booking-date-strip" aria-label="Choose booking date">{dates.map((date) => { const day = parseDateKey(date); const today = date === zoneDateKey(new Date(), timeZone); return <button type="button" className={selectedDate === date ? 'is-selected' : ''} key={date} onClick={() => changeDate(date)} aria-pressed={selectedDate === date}><span>{formatDate(day, timeZone, { weekday: 'short' }).toUpperCase()}</span><strong>{formatDate(day, timeZone, { day: 'numeric' })}</strong><small>{today ? 'Today' : `${dateCounts[date] || 0} slots`}</small></button>; })}</div><div className="booking-date-controls"><button type="button" className="booking-control-button" onClick={() => { const next = shiftDateKey(rangeStart, -7, timeZone); setRangeStart(next); setSelectedDate(next); setSelectedSlotId(''); }}><Icon name="arrowLeft" size={15} /> Previous</button><label className="booking-date-picker"><Icon name="calendar" size={15} /><span>Choose date</span><input type="date" value={selectedDate} onChange={(event) => changeDate(event.target.value)} aria-label="Choose booking date" /></label><button type="button" className="booking-control-button" onClick={() => { const next = shiftDateKey(rangeStart, 7, timeZone); setRangeStart(next); setSelectedDate(next); setSelectedSlotId(''); }}>Next <Icon name="arrowRight" size={15} /></button></div></div><div className="booking-panel booking-filter-panel"><div className="booking-filter-grid"><label><span>Provider</span><select value={providerId} onChange={(event) => changeProvider(event.target.value)}><option value="">All Providers</option>{providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}{provider.specialty ? ` · ${provider.specialty}` : ''}</option>)}</select></label><label><span>Location</span><select value={locationId} onChange={(event) => changeLocation(event.target.value)}><option value="">All Locations</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label><label className="booking-toggle-label"><span>Availability</span><span className="booking-toggle"><input type="checkbox" checked={availableOnly} onChange={(event) => setAvailableOnly(event.target.checked)} /><i aria-hidden="true" /> Available Only</span></label></div><div className="booking-provider-summary"><Icon name="provider" size={17} /><span><strong>{providerId ? providers.find((provider) => provider.id === providerId)?.name || 'Selected provider' : 'All Providers'}</strong><small>{bookableSlots.length} available on {dateLabel}{providerId ? ' · directory availability' : ' · combined availability'}</small></span><button type="button" className="booking-next-available" onClick={nextAvailable} disabled={!matchingSlots.some((slot) => slot.status === 'free')}>Next available <Icon name="arrowRight" size={13} /></button></div></div><div className="booking-panel booking-slots-panel"><SectionHeading kicker="2 · Select time" title={dateLabel} detail={bookableSlots.length ? `Earliest ${formatTime(bookableSlots[0].start, timeZone)}` : 'No matching availability'} />{!bookableSlots.length && <div className="booking-no-slots"><span className="booking-empty-icon"><Icon name="calendar" size={22} /></span><h3>No available times match these criteria.</h3><p>Try another provider, location, appointment type, or date.</p><div><button type="button" className="booking-secondary-button" onClick={() => setProviderId('')}>Change Provider</button><button type="button" className="booking-secondary-button" onClick={nextAvailable} disabled={!matchingSlots.some((slot) => slot.status === 'free')}>Next Available Date</button></div></div>}{Object.entries(groupedSlots).map(([group, groupSlots]) => groupSlots.length ? <section className="booking-slot-group" key={group}><h3>{group}</h3><div className="booking-slot-grid">{groupSlots.map((slot) => <SlotCard key={slot.id} slot={slot} snapshot={snapshot} selected={slot.id === selectedSlotId} availableOnly={availableOnly} onSelect={() => setSelectedSlotId(slot.id)} />)}</div></section> : null)}{!availableOnly && slotsForDate.some((slot) => slot.status !== 'free') && <p className="booking-muted-note"><Icon name="alert" size={14} /> Muted times are not bookable. Live slot state is authoritative at confirmation.</p>}</div></section><aside className="booking-summary-column"><section className="booking-panel booking-details-panel"><SectionHeading kicker="Booking details" title="Who and what" /><div className="booking-detail-block"><PatientSearch selectedPatient={patient} query={patientQuery} results={patientResults} onQuery={setPatientQuery} onSelect={selectPatient} onClear={clearPatient} />{patientSearching && <span className="booking-field-status">Searching the scheduling directory...</span>}</div><label className="booking-form-label"><span>Appointment Type <b aria-hidden="true">*</b></span><select value={appointmentType} onChange={(event) => { setAppointmentType(event.target.value); setSelectedSlotId(''); }}><option value="">Select appointment type</option>{visibleTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select><small>Configured from live scheduling data. Slot duration is shown after time selection.</small></label><div className="booking-two-fields"><label className="booking-form-label"><span>Provider</span><select value={providerId} onChange={(event) => changeProvider(event.target.value)}><option value="">All Providers</option>{providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}</select></label><label className="booking-form-label"><span>Location</span><select value={locationId} onChange={(event) => changeLocation(event.target.value)}><option value="">All Locations</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label></div><label className="booking-form-label"><span>Reason for Visit <small>(optional)</small></span><input value={reason} maxLength={1000} onChange={(event) => setReason(event.target.value)} placeholder="Brief scheduling reason" /></label><button type="button" className="booking-notes-toggle" aria-expanded={notesOpen} onClick={() => setNotesOpen((current) => !current)}><Icon name="note" size={15} /> Scheduling Notes <Icon name="chevronDown" size={14} /></button>{notesOpen && <label className="booking-form-label"><span>Operational notes <small>(optional)</small></span><textarea value={notes} maxLength={3000} rows={4} onChange={(event) => setNotes(event.target.value)} placeholder="Add operational context for the scheduling team." /></label>}{upcomingAppointments.length > 0 && <div className="booking-upcoming"><span className="booking-section-kicker">Patient context</span><strong>Upcoming appointments</strong>{upcomingAppointments.map((appointment) => <Link key={appointment.id} href={withPreview(`/dashboard/appointments/${encodeURIComponent(appointment.id)}`, searchParams)}>{formatDate(appointment.start, timeZone, { month: 'short', day: 'numeric' })} · {appointment.appointmentType || appointment.serviceType || 'Appointment'} <Icon name="arrowRight" size={13} /></Link>)}</div>}</section><section className="booking-panel booking-summary-panel"><SectionHeading kicker="3 · Review" title="Booking Summary" /><div className="booking-summary-status"><span className={requiredComplete ? 'is-ready' : 'is-pending'}><Icon name={requiredComplete ? 'check' : 'clock'} size={14} /> {requiredComplete ? 'Ready to review' : 'Complete required fields'}</span></div><dl className="booking-summary-list"><div><dt>Patient</dt><dd>{patient ? <><strong>{patient.name}</strong><small>{patient.mrn || 'MRN not documented'}</small></> : <span className="is-empty">No patient selected</span>}</dd></div><div><dt>Visit</dt><dd>{appointmentType ? <><strong>{appointmentType}</strong><small>{durationLabel(selectedSlot)}</small></> : <span className="is-empty">No visit type selected</span>}</dd></div><div><dt>Provider</dt><dd><strong>{providerName}</strong><small>{selectedSlot ? 'Assigned by selected live slot' : 'Select a time to confirm provider'}</small></dd></div><div><dt>Date and time</dt><dd>{selectedSlot ? <><strong>{formatDate(selectedSlot.start, timeZone, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</strong><small>{formatTime(selectedSlot.start, timeZone)} to {formatTime(selectedSlot.end, timeZone)}</small></> : <span className="is-empty">No time selected</span>}</dd></div><div><dt>Location</dt><dd><strong>{locationName}</strong><small>{selectedSlot ? 'From live availability' : 'Location will follow the selected slot'}</small></dd></div></dl>{duplicate && <div className="booking-duplicate-warning" role="alert"><Icon name="alert" size={17} /><div><strong>Potential duplicate appointment</strong><p>{patient?.name} already has a similar appointment on this date{duplicate.start ? ` at ${formatTime(duplicate.start, timeZone)}` : ''}. Review before continuing.</p><Link href={withPreview(`/dashboard/appointments/${encodeURIComponent(duplicate.id)}`, searchParams)}>View Existing Appointment <Icon name="arrowRight" size={13} /></Link></div></div>}<div className="booking-action-stack"><button type="button" className="booking-primary-button booking-main-action" disabled={!requiredComplete || booking} onClick={() => requestBooking(false)}>{booking ? 'Booking...' : 'Book Appointment'} <Icon name="arrowRight" size={15} /></button><button type="button" className="booking-secondary-button" disabled={!requiredComplete || booking} onClick={() => requestBooking(true)}>Book & Open Chart</button><div className="booking-draft-actions"><button type="button" className="booking-tertiary-button" disabled={savingDraft} onClick={() => void saveDraft()}><Icon name="save" size={14} /> {savingDraft ? 'Saving...' : draftSavedAt ? 'Save Draft Again' : 'Save Draft'}</button>{draftSavedAt && <button type="button" className="booking-discard-button" disabled={savingDraft} onClick={() => void discardDraft()}>Discard Draft</button>}</div>{draftSavedAt && <span className="booking-draft-status" role="status">Saved {formatDate(draftSavedAt, timeZone, { hour: 'numeric', minute: '2-digit' })}</span>}</div></section></aside></div>{confirmOpen && <div className="booking-confirm-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !booking && setConfirmOpen(false)}><section className="booking-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="booking-confirm-title"><button type="button" className="booking-close-button" onClick={() => setConfirmOpen(false)} aria-label="Cancel booking confirmation"><Icon name="close" /></button><span className="booking-eyebrow">Final review</span><h2 id="booking-confirm-title">Book this appointment?</h2><p>Confirm the patient, visit, provider, time, and location before the live slot is revalidated.</p><div className="booking-confirm-card"><strong>{patient?.name}</strong><span>{appointmentType} · {durationLabel(selectedSlot)}</span><span>{selectedSlot ? `${formatDate(selectedSlot.start, timeZone, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} · ${formatTime(selectedSlot.start, timeZone)} to ${formatTime(selectedSlot.end, timeZone)}` : 'No time selected'}</span><span>{providerName} · {locationName}</span></div>{duplicate && <div className="booking-confirm-warning"><Icon name="alert" size={16} /><span><strong>Existing appointment found.</strong> Continue only if this additional appointment is intentional.</span></div>}<form onSubmit={(event) => void confirmBooking(event)}><div className="booking-confirm-actions"><button type="button" className="booking-secondary-button" disabled={booking} onClick={() => setConfirmOpen(false)}>Cancel</button><button type="submit" className="booking-primary-button" disabled={booking}>{booking ? 'Booking...' : 'Confirm Booking'}</button></div></form></section></div>}</main>;
}
