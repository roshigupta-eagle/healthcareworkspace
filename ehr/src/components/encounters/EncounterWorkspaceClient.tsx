'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  CardiovascularRoom,
  CardiovascularVisit,
  CardiovascularVisitState,
  ProcedureStatus,
  VisitPriority,
} from '@/cardiology/types/fhir-domain';

type EncounterRecord = CardiovascularVisit & { source?: 'demo' | 'imported'; importedFhir?: FhirResource };
type FhirResource = Record<string, unknown> & { resourceType?: string; id?: string; status?: string };
type DetailTab = 'overview' | 'timeline' | 'notes' | 'observations' | 'orders' | 'procedures' | 'care-plan' | 'documents' | 'fhir';
type ListTab = 'all' | 'waiting' | 'in-progress' | 'needs-attention' | 'procedure' | 'completed';
type SortKey = 'priority' | 'recent' | 'oldest' | 'patient' | 'status' | 'practitioner' | 'location';

const TERMINAL_STATES = new Set(['CONSULTATION_COMPLETE', 'CHECKOUT_COMPLETE', 'DISCHARGED', 'CANCELLED', 'NO_SHOW']);
const WAITING_STATES = new Set(['PATIENT_ARRIVED', 'CHECKING_IN', 'CHECKED_IN', 'IN_WAITING_ROOM']);
const IN_PROGRESS_STATES = new Set(['NURSING_ASSESSMENT', 'IN_EXAM_ROOM', 'PHYSICIAN_PENDING', 'PHYSICIAN_WITH_PATIENT', 'ORDERS_PLACED', 'IN_PROCEDURE', 'RESULTS_READY', 'RESULTS_REVIEW', 'CHECKING_OUT']);
const PROCEDURE_STATES = new Set(['PROCEDURE_QUEUED', 'IN_PROCEDURE', 'PROCEDURE_COMPLETE']);
const ATTENTION_STATES = new Set(['CRITICAL', 'ON_HOLD']);

const WORKFLOW_LABELS: Record<string, string> = {
  REFERRAL_RECEIVED: 'Referral Received',
  SCHEDULING: 'Scheduling',
  APPOINTMENT_SCHEDULED: 'Appointment Scheduled',
  APPOINTMENT_CONFIRMED: 'Appointment Confirmed',
  PRE_VISIT_FORMS: 'Pre-Visit Forms',
  PATIENT_ARRIVED: 'Patient Arrived',
  CHECKING_IN: 'Checking In',
  CHECKED_IN: 'Checked In',
  IN_WAITING_ROOM: 'Waiting Room',
  NURSING_ASSESSMENT: 'Nursing Assessment',
  IN_EXAM_ROOM: 'In Exam Room',
  PHYSICIAN_PENDING: 'Physician Pending',
  PHYSICIAN_WITH_PATIENT: 'Physician With Patient',
  ORDERS_PLACED: 'Orders Placed',
  PROCEDURE_QUEUED: 'Procedure Queued',
  IN_PROCEDURE: 'In Procedure',
  PROCEDURE_COMPLETE: 'Procedure Complete',
  RESULTS_READY: 'Results Ready',
  RESULTS_REVIEW: 'Results Review',
  CONSULTATION_COMPLETE: 'Consultation Complete',
  CHECKING_OUT: 'Checking Out',
  CHECKOUT_COMPLETE: 'Checkout Complete',
  BILLING_PENDING: 'Billing Pending',
  FOLLOW_UP_SCHEDULED: 'Follow-Up Scheduled',
  DISCHARGED: 'Completed',
  ON_HOLD: 'On Hold',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No Show',
};

const FHIR_STATUS_LABELS: Record<string, string> = {
  planned: 'Planned',
  arrived: 'Arrived',
  triaged: 'Triaged',
  'in-progress': 'In Progress',
  'on-hold': 'On Hold',
  finished: 'Finished',
  cancelled: 'Cancelled',
  'entered-in-error': 'Entered in Error',
  unknown: 'Unknown',
};

const DETAIL_TABS: Array<{ id: DetailTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'notes', label: 'Clinical Notes' },
  { id: 'observations', label: 'Observations' },
  { id: 'orders', label: 'Orders' },
  { id: 'procedures', label: 'Procedures' },
  { id: 'care-plan', label: 'Care Plan' },
  { id: 'documents', label: 'Documents' },
  { id: 'fhir', label: 'FHIR' },
];

function humanize(value?: string | null): string {
  if (!value) return 'Not Recorded';
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function workflowLabel(state?: string | null): string {
  return state ? WORKFLOW_LABELS[state] || humanize(state) : 'Workflow Not Recorded';
}

function fhirStatusFor(state?: string | null): string {
  if (!state) return 'unknown';
  if (state === 'CANCELLED') return 'cancelled';
  if (state === 'ON_HOLD') return 'on-hold';
  if (state === 'NO_SHOW') return 'unknown';
  if (TERMINAL_STATES.has(state)) return 'finished';
  if (WAITING_STATES.has(state)) return state === 'PATIENT_ARRIVED' ? 'arrived' : 'arrived';
  if (state === 'REFERRAL_RECEIVED' || state === 'SCHEDULING' || state === 'APPOINTMENT_SCHEDULED' || state === 'APPOINTMENT_CONFIRMED' || state === 'PRE_VISIT_FORMS') return 'planned';
  if (state === 'NURSING_ASSESSMENT' || state === 'IN_EXAM_ROOM') return 'triaged';
  return 'in-progress';
}

function fhirStatusLabel(state?: string | null): string {
  return FHIR_STATUS_LABELS[fhirStatusFor(state)] || 'Unknown';
}

function priorityLabel(priority?: VisitPriority | number | null): string {
  if (priority === 0) return 'Urgent';
  if (priority === 25) return 'High';
  if (priority === 75) return 'Low';
  if (priority === 50) return 'Normal';
  return 'Not Recorded';
}

function priorityRank(priority?: VisitPriority | number | null): number {
  if (priority === 0) return 0;
  if (priority === 25) return 1;
  if (priority === 50) return 2;
  if (priority === 75) return 3;
  return 4;
}

function formatDate(value?: string | null): string {
  if (!value) return 'Not Recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function formatDateTime(value?: string | null): string {
  if (!value) return 'Not Recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : `${formatDate(value)} · ${formatTime(value)}`;
}

function formatTime(value?: string | null): string {
  if (!value) return 'Not Recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes} ${suffix}`;
}

function patientAge(dob?: string | null): string {
  if (!dob) return 'Age not recorded';
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return 'Age not recorded';
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const beforeBirthday = now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return `${age} years`;
}

function initials(name?: string | null): string {
  if (!name) return 'NA';
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] || ''}${parts[1]?.[0] || ''}`.toUpperCase();
}

function encounterType(visit: EncounterRecord): string {
  if (visit.proceduresOrdered?.length) return 'Procedure Visit';
  if (visit.currentState === 'REFERRAL_RECEIVED') return 'Referral Visit';
  if (/follow-up/i.test(visit.chiefComplaint || '')) return 'Follow-Up Visit';
  return 'Clinical Visit';
}

function isAttention(visit: EncounterRecord): boolean {
  return priorityRank(visit.priority) <= 1 || ATTENTION_STATES.has(visit.currentState || '') || (visit.currentAlertStatus || '').toLowerCase() === 'urgent';
}

function locationLabel(visit: EncounterRecord, rooms: CardiovascularRoom[]): string {
  if (!visit.currentRoomId) return 'Location Not Recorded';
  return rooms.find((room) => room.id === visit.currentRoomId)?.roomNumber || visit.currentRoomId;
}

function fhirProjection(visit: EncounterRecord, rooms: CardiovascularRoom[]): FhirResource {
  return {
    resourceType: 'Encounter',
    id: visit.fhirEncounterId || visit.id,
    status: fhirStatusFor(visit.currentState),
    subject: {
      reference: visit.fhirPatientId ? `Patient/${visit.fhirPatientId}` : `Patient/${visit.patientId}`,
      display: visit.patientName,
    },
    period: {
      start: visit.arrivedAt,
      end: visit.dischargedAt,
    },
    participant: visit.assignedPhysicianName ? [{ individual: { display: visit.assignedPhysicianName } }] : undefined,
    location: visit.currentRoomId ? [{ location: { reference: `Location/${visit.currentRoomId}`, display: locationLabel(visit, rooms) } }] : undefined,
    extension: [{ url: 'https://roshi.example/fhir/StructureDefinition/workflow-status', valueCode: visit.currentState }],
  };
}

function jsonDownload(filename: string, content: string, mime = 'application/json') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function Icon({ name, size = 18, className = '' }: { name: 'grid' | 'users' | 'calendar' | 'stethoscope' | 'clipboard' | 'check' | 'alert' | 'search' | 'filter' | 'refresh' | 'close' | 'external' | 'code' | 'clock' | 'map' | 'more' | 'download' | 'upload' | 'arrow'; size?: number; className?: string }) {
  const paths: Record<string, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    users: <><path d="M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1" /><circle cx="9.5" cy="7" r="3" /><path d="M17 11a3 3 0 1 0 0-6M21 20v-1a4 4 0 0 0-3-3.8" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18M8 14h3M8 17h6" /></>,
    stethoscope: <><path d="M6 3v5a4 4 0 0 0 8 0V3M4 3h4M12 3h4M14 12v3a4 4 0 0 0 4 4h1a2 2 0 0 0 2-2v-1" /><circle cx="19" cy="12" r="2" /></>,
    clipboard: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M9 11h6M9 15h6" /></>,
    check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></>,
    alert: <><path d="m12 3 9 17H3L12 3z" /><path d="M12 9v4M12 16h.01" /></>,
    search: <><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.3-4.3" /></>,
    filter: <path d="M4 6h16M7 12h10M10 18h4" />,
    refresh: <><path d="M20 11a8 8 0 0 0-14-4L4 9" /><path d="M4 5v4h4M4 13a8 8 0 0 0 14 4l2-2" /><path d="M20 19v-4h-4" /></>,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    external: <><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" /></>,
    code: <><path d="m8 9-4 3 4 3M16 9l4 3-4 3M14 5l-4 14" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6z" /><path d="M9 3v15M15 6v15" /></>,
    more: <><circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" /></>,
    download: <><path d="M12 3v11M8 10l4 4 4-4M5 20h14" /></>,
    upload: <><path d="M12 15V4M8 8l4-4 4 4M5 20h14" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>{paths[name]}</svg>;
}

function StatusBadge({ visit, small = false }: { visit: EncounterRecord; small?: boolean }) {
  const state = visit.currentState || '';
  const isCritical = isAttention(visit) && priorityRank(visit.priority) === 0;
  const isComplete = fhirStatusFor(state) === 'finished';
  const tone = isCritical ? 'border-rose-200 bg-rose-50 text-rose-700' : isComplete ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : PROCEDURE_STATES.has(state) ? 'border-amber-100 bg-amber-50 text-amber-800' : IN_PROGRESS_STATES.has(state) ? 'border-sky-100 bg-sky-50 text-sky-700' : 'border-teal-100 bg-teal-50 text-teal-700';
  return <span className={`inline-flex items-center gap-1.5 rounded-full border font-semibold ${small ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]'} ${tone}`}><span className={`h-1.5 w-1.5 rounded-full ${isCritical ? 'bg-rose-500' : isComplete ? 'bg-emerald-500' : PROCEDURE_STATES.has(state) ? 'bg-amber-500' : IN_PROGRESS_STATES.has(state) ? 'bg-sky-500' : 'bg-teal-500'}`} />{workflowLabel(state)}</span>;
}

function FhirStatusBadge({ visit }: { visit: EncounterRecord }) {
  return <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600">FHIR: {fhirStatusLabel(visit.currentState)}</span>;
}

function MetricCard({ icon, label, value, support, tone, onClick }: { icon: React.ReactNode; label: string; value: number; support: string; tone: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`group min-h-[96px] rounded-xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 ${tone}`}><div className="flex items-start justify-between gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/80">{icon}</span><span className="text-2xl font-bold leading-none text-slate-900">{value}</span></div><div className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div><div className="mt-0.5 text-xs text-slate-500">{support}</div></button>;
}

function EncounterCard({ visit, rooms, selected, onSelect }: { visit: EncounterRecord; rooms: CardiovascularRoom[]; selected: boolean; onSelect: () => void }) {
  const room = locationLabel(visit, rooms);
  const hasVitals = !!visit.vitals;
  const hasProcedure = !!visit.proceduresOrdered?.length;
  const hasResults = !!visit.labResults?.length;
  const alert = isAttention(visit);
  const time = visit.arrivedAt || visit.stateEnteredAt;
  return <article
    tabIndex={0}
    role="button"
    aria-label={`Open encounter for ${visit.patientName}`}
    onClick={onSelect}
    onKeyDown={(event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onSelect();
      }
    }}
    className={`relative overflow-hidden rounded-xl border bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${selected ? 'border-teal-300 ring-2 ring-teal-100' : 'border-slate-200'} ${alert && priorityRank(visit.priority) === 0 ? 'border-l-4 border-l-rose-500' : 'border-l-4 border-l-transparent'}`}>
    <div className="relative p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700">{initials(visit.patientName)}</span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-base font-bold text-slate-900">{visit.patientName || 'Patient Name Not Recorded'}</h3>{visit.isNewPatient && <span className="rounded-full border border-violet-100 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">New Patient</span>}</div>
            <p className="mt-1 text-xs text-slate-500">MRN {visit.mrn || 'Not Recorded'} · {patientAge(visit.patientDOB)}</p>
            <p className="mt-2 text-sm font-medium text-slate-800">{visit.chiefComplaint || 'Visit reason not recorded'}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5"><StatusBadge visit={visit} /><FhirStatusBadge visit={visit} /></div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-4">
        <InfoItem icon={<Icon name="clock" size={14} />} label="Time" value={formatTime(time)} />
        <InfoItem icon={<Icon name="map" size={14} />} label="Location" value={room} />
        <InfoItem icon={<Icon name="stethoscope" size={14} />} label="Practitioner" value={visit.assignedPhysicianName || 'Unassigned'} />
        <InfoItem icon={<Icon name="alert" size={14} />} label="Priority" value={priorityLabel(visit.priority)} tone={alert ? 'text-rose-700' : undefined} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {hasVitals && <span className="rounded-full border border-sky-100 bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700">Vitals Recorded</span>}
        {hasProcedure && <span className="rounded-full border border-amber-100 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800">{visit.proceduresOrdered?.length} Procedure{visit.proceduresOrdered?.length === 1 ? '' : 's'}</span>}
        {hasResults && <span className="rounded-full border border-violet-100 bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700">{visit.labResults?.length} Result{visit.labResults?.length === 1 ? '' : 's'}</span>}
        {visit.carePlan?.followUpAt && <span className="rounded-full border border-teal-100 bg-teal-50 px-2 py-0.5 text-[10px] font-medium text-teal-700">Follow-Up {formatDate(visit.carePlan.followUpAt)}</span>}
        <span className="ml-auto text-[11px] text-slate-400">Updated {formatDateTime(visit.stateEnteredAt || visit.arrivedAt)}</span>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
        <span className="text-[11px] text-slate-400">Encounter ID: {visit.fhirEncounterId || visit.id}</span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700">Open Encounter <Icon name="arrow" size={13} /></span>
      </div>
    </div>
  </article>;
}

function InfoItem({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: string }) {
  return <div className="min-w-0"><div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{icon}{label}</div><div className={`mt-1 truncate text-xs font-medium ${tone || 'text-slate-700'}`}>{value}</div></div>;
}

function EmptyState({ filtered, onClear, onNew }: { filtered: boolean; onClear: () => void; onNew: () => void }) {
  return <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400"><Icon name="calendar" size={22} /></span><h3 className="mt-4 text-base font-semibold text-slate-900">No Encounters Found</h3><p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{filtered ? 'Try changing your filters or search terms.' : 'Create a new encounter to begin a clinical visit.'}</p><div className="mt-4 flex justify-center gap-2">{filtered && <button type="button" onClick={onClear} className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Clear Filters</button>}<button type="button" onClick={onNew} className="rounded-md bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-700">+ New Encounter</button></div></div>;
}

function DetailDrawer({ visit, rooms, onClose, onTabChange, tab }: { visit: EncounterRecord; rooms: CardiovascularRoom[]; onClose: () => void; onTabChange: (tab: DetailTab) => void; tab: DetailTab }) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) { if (event.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30" role="presentation" onClick={onClose}>
    <aside className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl" role="dialog" aria-modal="true" aria-label={`Encounter details for ${visit.patientName}`} onClick={(event) => event.stopPropagation()}>
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex items-start justify-between gap-4"><div className="flex min-w-0 items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700">{initials(visit.patientName)}</span><div className="min-w-0"><h2 className="truncate text-lg font-bold text-slate-900">{visit.patientName}</h2><p className="mt-0.5 text-xs text-slate-500">MRN {visit.mrn || 'Not Recorded'} · Encounter {visit.fhirEncounterId || visit.id}</p></div></div><button type="button" onClick={onClose} aria-label="Close Encounter Details" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"><Icon name="close" size={18} /></button></div>
        <div className="mt-3 flex flex-wrap items-center gap-2"><StatusBadge visit={visit} /><FhirStatusBadge visit={visit} /><span className="text-xs text-slate-500">{encounterType(visit)}</span></div>
      </div>
      <div className="flex gap-1 overflow-x-auto border-b border-slate-200 px-4" role="tablist" aria-label="Encounter Detail Sections">{DETAIL_TABS.map((item) => <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} onClick={() => onTabChange(item.id)} className={`shrink-0 border-b-2 px-2.5 py-3 text-xs font-medium transition ${tab === item.id ? 'border-sky-600 text-sky-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{item.label}</button>)}</div>
      <div className="min-h-0 flex-1 overflow-y-auto p-5"><DetailContent visit={visit} rooms={rooms} tab={tab} /></div>
    </aside>
  </div>;
}

function DetailContent({ visit, rooms, tab }: { visit: EncounterRecord; rooms: CardiovascularRoom[]; tab: DetailTab }) {
  if (tab === 'overview') return <OverviewTab visit={visit} rooms={rooms} />;
  if (tab === 'timeline') return <TimelineTab visit={visit} />;
  if (tab === 'notes') return <NotesTab visit={visit} />;
  if (tab === 'observations') return <ObservationsTab visit={visit} />;
  if (tab === 'orders') return <OrdersTab visit={visit} />;
  if (tab === 'procedures') return <ProceduresTab visit={visit} />;
  if (tab === 'care-plan') return <CarePlanTab visit={visit} />;
  if (tab === 'documents') return <DocumentsTab visit={visit} />;
  return <FhirTab visit={visit} rooms={rooms} />;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="border-t border-slate-100 pt-5 first:border-0 first:pt-0"><h3 className="mb-3 text-sm font-semibold text-slate-900">{title}</h3>{children}</section>;
}

function DetailField({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return <div><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt><dd className="mt-1 text-sm font-medium text-slate-800">{value}</dd></div>;
}

function OverviewTab({ visit, rooms }: { visit: EncounterRecord; rooms: CardiovascularRoom[] }) {
  return <div className="space-y-5"><Section title="Patient Identity"><dl className="grid grid-cols-2 gap-4"><DetailField label="Patient" value={visit.patientName} /><DetailField label="MRN" value={visit.mrn} /><DetailField label="Date of Birth" value={formatDate(visit.patientDOB)} /><DetailField label="Age" value={patientAge(visit.patientDOB)} /><DetailField label="Patient ID" value={visit.fhirPatientId || visit.patientId} /></dl></Section><Section title="Encounter Overview"><dl className="grid grid-cols-2 gap-4"><DetailField label="Visit Type" value={encounterType(visit)} /><DetailField label="Reason for Visit" value={visit.chiefComplaint} /><DetailField label="Operational Workflow" value={workflowLabel(visit.currentState)} /><DetailField label="FHIR Status Projection" value={fhirStatusLabel(fhirStatusFor(visit.currentState))} /><DetailField label="Priority" value={priorityLabel(visit.priority)} /><DetailField label="Started" value={formatDateTime(visit.arrivedAt)} /><DetailField label="Location" value={locationLabel(visit, rooms)} /><DetailField label="Assigned Practitioner" value={visit.assignedPhysicianName} /></dl></Section><Section title="FHIR Context"><div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600"><div className="flex items-center gap-2 font-semibold text-slate-700"><Icon name="code" size={14} /> FHIR R4 · Encounter Resource</div><p className="mt-1.5 leading-5">Operational workflow status is shown separately from the standard FHIR Encounter.status projection.</p><p className="mt-1 font-mono text-[11px] text-slate-500">{visit.fhirEncounterId || visit.id}</p></div></Section></div>;
}

function TimelineTab({ visit }: { visit: EncounterRecord }) {
  const events: Array<{ label: string; at?: string; detail: string }> = [];
  if (visit.arrivedAt) events.push({ label: 'Patient arrived', at: visit.arrivedAt, detail: 'Encounter period start' });
  if (visit.stateEnteredAt) events.push({ label: workflowLabel(visit.currentState), at: visit.stateEnteredAt, detail: 'Operational workflow status entered' });
  if (visit.vitals?.recordedAt) events.push({ label: 'Vitals recorded', at: visit.vitals.recordedAt, detail: `Observation recorded by ${visit.vitals.recordedBy}` });
  if (visit.dischargedAt) events.push({ label: 'Encounter finished', at: visit.dischargedAt, detail: 'Encounter period end' });
  if (!events.length) return <EmptyDetail text="No timestamped encounter events are available." />;
  return <Section title="Encounter Timeline"><ol className="relative ml-2 border-l border-slate-200">{events.map((event, index) => <li key={`${event.label}-${event.at}-${index}`} className="relative pb-6 pl-5 last:pb-0"><span className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full bg-sky-500 ring-4 ring-white" /><div className="flex flex-wrap items-baseline justify-between gap-2"><span className="text-sm font-semibold text-slate-800">{event.label}</span><time className="text-xs text-slate-400">{formatDateTime(event.at)}</time></div><p className="mt-1 text-xs text-slate-500">{event.detail}</p></li>)}</ol></Section>;
}

function NotesTab({ visit }: { visit: EncounterRecord }) {
  if (!visit.notes) return <EmptyDetail text="No clinical note is recorded for this encounter." />;
  return <Section title="Clinical Notes"><div className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm leading-6 text-slate-700 whitespace-pre-wrap">{visit.notes}</div></Section>;
}

function ObservationsTab({ visit }: { visit: EncounterRecord }) {
  const vitals = visit.vitals;
  const results = visit.labResults || [];
  if (!vitals && !results.length) return <EmptyDetail text="No observations or results are recorded for this encounter." />;
  return <div className="space-y-5">{vitals && <Section title="Latest Vitals"><div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">{[['Blood Pressure', vitals.bpSystolic && vitals.bpDiastolic ? `${vitals.bpSystolic}/${vitals.bpDiastolic} mmHg` : null], ['Heart Rate', vitals.heartRateBpm ? `${vitals.heartRateBpm} bpm` : null], ['Temperature', vitals.temperatureC !== undefined ? `${vitals.temperatureC} °C` : null], ['SpO₂', vitals.oxygenSaturationPercent ? `${vitals.oxygenSaturationPercent}%` : null], ['Respiratory Rate', vitals.respirationRate ? `${vitals.respirationRate}/min` : null]].map(([label, value]) => value ? <div key={String(label)} className="rounded-lg border border-slate-100 bg-slate-50 p-3"><div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</div><div className="mt-1 text-base font-bold text-slate-800">{value}</div></div> : null)}</div><p className="mt-2 text-xs text-slate-400">Recorded {formatDateTime(vitals.recordedAt)} by {vitals.recordedBy}</p></Section>}{results.length > 0 && <Section title="Recorded Results"><div className="space-y-2">{results.map((result) => <div key={result.id} className="rounded-lg border border-slate-100 p-3"><div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold text-slate-800">{result.testName}</span><span className="text-xs text-slate-500">{formatDateTime(result.date)}</span></div><p className="mt-1 text-sm text-slate-600">{result.summary || 'Result summary not recorded.'}</p>{result.interpretation && <p className="mt-1 text-xs text-slate-500">{result.interpretation}</p>}</div>)}</div></Section>}</div>;
}

function OrdersTab({ visit }: { visit: EncounterRecord }) {
  return <EmptyDetail text="No ServiceRequest records are available for this encounter." />;
}

function ProceduresTab({ visit }: { visit: EncounterRecord }) {
  const procedures = visit.proceduresOrdered || [];
  if (!procedures.length) return <EmptyDetail text="No procedures are recorded for this encounter." />;
  return <Section title="Associated Procedures"><div className="space-y-2.5">{procedures.map((procedure) => <div key={procedure.id} className="rounded-lg border border-slate-100 p-3"><div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold text-slate-800">{humanize(procedure.procedureType)}</span><span className="rounded-full border border-amber-100 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">{humanize(procedure.status)}</span></div><dl className="mt-2 grid grid-cols-2 gap-2 text-xs"><DetailField label="Ordered By" value={procedure.orderedBy} /><DetailField label="Ordered At" value={formatDateTime(procedure.orderedAt)} /><DetailField label="Room" value={procedure.roomId} /><DetailField label="FHIR Diagnostic Report" value={procedure.fhirDiagnosticReportId} /></dl>{procedure.findings && <p className="mt-2 text-sm text-slate-600">{procedure.findings}</p>}</div>)}</div></Section>;
}

function CarePlanTab({ visit }: { visit: EncounterRecord }) {
  if (!visit.carePlan) return <EmptyDetail text="No CarePlan is recorded for this encounter." />;
  const plan = visit.carePlan;
  return <Section title="Active Care Plan"><div className="space-y-4"><DetailField label="Documented Diagnosis" value={plan.diagnosis} />{plan.symptoms?.length ? <div><div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Documented Symptoms</div><div className="mt-1 flex flex-wrap gap-1.5">{plan.symptoms.map((symptom) => <span key={symptom} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600">{symptom}</span>)}</div></div> : null}<DetailField label="Next Steps" value={plan.nextSteps} /><DetailField label="Recommended Procedure" value={plan.recommendedProcedure} /><DetailField label="Follow-Up" value={formatDateTime(plan.followUpAt)} />{plan.medications?.length ? <div><div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Documented Medications</div><ul className="mt-1 space-y-1 text-sm text-slate-700">{plan.medications.map((medication) => <li key={medication}>• {medication}</li>)}</ul></div> : null}</div></Section>;
}

function DocumentsTab({ visit }: { visit: EncounterRecord }) {
  const documents = visit.medicalDocuments || [];
  if (!documents.length) return <EmptyDetail text="No documents are recorded for this encounter." />;
  return <Section title="Encounter Documents"><div className="space-y-2">{documents.map((document) => <div key={document.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 p-3"><div><div className="text-sm font-semibold text-slate-800">{document.name}</div><div className="mt-0.5 text-xs text-slate-500">{humanize(document.type)} · Uploaded {formatDateTime(document.uploadedAt)}</div></div>{document.url && <a href={document.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800">Open <Icon name="external" size={13} /></a>}</div>)}</div></Section>;
}

function FhirTab({ visit, rooms }: { visit: EncounterRecord; rooms: CardiovascularRoom[] }) {
  const resource = fhirProjection(visit, rooms);
  return <Section title="FHIR Resource Inspector"><div className="mb-3 rounded-lg border border-sky-100 bg-sky-50/60 p-3 text-xs text-sky-800"><div className="flex items-center gap-2 font-semibold"><Icon name="code" size={14} /> FHIR R4 · Encounter</div><p className="mt-1">This is a normalized projection from the available encounter record. Operational workflow state is represented as a separate extension.</p></div><pre className="overflow-x-auto rounded-lg bg-slate-950 p-4 text-[11px] leading-5 text-slate-100">{JSON.stringify(resource, null, 2)}</pre><button type="button" onClick={() => jsonDownload(`${visit.id}-encounter.json`, JSON.stringify(resource, null, 2))} className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Icon name="download" size={14} /> Copy / Export Resource</button></Section>;
}

function EmptyDetail({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">{text}</div>;
}

export default function EncounterWorkspaceClient({ initialVisits, rooms }: { initialVisits: CardiovascularVisit[]; rooms: CardiovascularRoom[] }) {
  const [visits, setVisits] = useState<EncounterRecord[]>(() => initialVisits.map((visit) => ({ ...visit, source: 'demo' })));
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [practitionerFilter, setPractitionerFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [sort, setSort] = useState<SortKey>('priority');
  const [listTab, setListTab] = useState<ListTab>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');
  const [importOpen, setImportOpen] = useState(false);
  const [importedResources, setImportedResources] = useState<FhirResource[]>([]);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 4500);
  };

  async function refresh() {
    setLoading(true);
    try {
      const response = await fetch('/api/cardiology/visits', { cache: 'no-store' });
      if (!response.ok) throw new Error('Unable to load encounters');
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('The encounter service returned an invalid response');
      setVisits(data.map((visit: CardiovascularVisit) => ({ ...visit, source: 'demo' })));
      showNotice('Encounters refreshed.');
    } catch (error) {
      showNotice(error instanceof Error ? error.message : 'Unable to refresh encounters.');
    } finally {
      setLoading(false);
    }
  }

  const filterOptions = useMemo(() => {
    const locations = Array.from(new Set(visits.map((visit) => locationLabel(visit, rooms)).filter((value) => value !== 'Location Not Recorded'))).sort();
    const practitioners = Array.from(new Set(visits.map((visit) => visit.assignedPhysicianName).filter(Boolean) as string[])).sort();
    const types = Array.from(new Set(visits.map((visit) => encounterType(visit)))).sort();
    return { locations, practitioners, types };
  }, [rooms, visits]);

  const filteredVisits = useMemo(() => {
    const query = search.trim().toLowerCase();
    return visits
      .filter((visit) => {
        const state = visit.currentState || '';
        if (listTab === 'waiting' && !WAITING_STATES.has(state)) return false;
        if (listTab === 'in-progress' && !IN_PROGRESS_STATES.has(state)) return false;
        if (listTab === 'needs-attention' && !isAttention(visit)) return false;
        if (listTab === 'procedure' && !PROCEDURE_STATES.has(state) && !visit.proceduresOrdered?.length) return false;
        if (listTab === 'completed' && fhirStatusFor(state) !== 'finished') return false;
        if (statusFilter !== 'all' && fhirStatusFor(state) !== statusFilter) return false;
        if (typeFilter !== 'all' && encounterType(visit) !== typeFilter) return false;
        if (priorityFilter !== 'all' && priorityLabel(visit.priority).toLowerCase() !== priorityFilter) return false;
        if (locationFilter !== 'all' && locationLabel(visit, rooms) !== locationFilter) return false;
        if (practitionerFilter !== 'all' && (visit.assignedPhysicianName || '') !== practitionerFilter) return false;
        if (dateFilter && !(visit.arrivedAt || visit.stateEnteredAt || '').startsWith(dateFilter)) return false;
        if (query && ![visit.patientName, visit.mrn, visit.id, visit.fhirEncounterId, visit.patientId, visit.chiefComplaint, visit.assignedPhysicianName, locationLabel(visit, rooms)].filter(Boolean).join(' ').toLowerCase().includes(query)) return false;
        return true;
      })
      .sort((a, b) => {
        if (sort === 'priority') return priorityRank(a.priority) - priorityRank(b.priority) || Date.parse(b.arrivedAt || b.stateEnteredAt || '') - Date.parse(a.arrivedAt || a.stateEnteredAt || '');
        if (sort === 'patient') return (a.patientName || '').localeCompare(b.patientName || '');
        if (sort === 'oldest') return Date.parse(a.arrivedAt || a.stateEnteredAt || '') - Date.parse(b.arrivedAt || b.stateEnteredAt || '');
        if (sort === 'status') return workflowLabel(a.currentState).localeCompare(workflowLabel(b.currentState));
        if (sort === 'practitioner') return (a.assignedPhysicianName || '').localeCompare(b.assignedPhysicianName || '');
        if (sort === 'location') return locationLabel(a, rooms).localeCompare(locationLabel(b, rooms));
        return Date.parse(b.arrivedAt || b.stateEnteredAt || '') - Date.parse(a.arrivedAt || a.stateEnteredAt || '');
      });
  }, [dateFilter, listTab, locationFilter, practitionerFilter, priorityFilter, rooms, search, sort, statusFilter, typeFilter, visits]);

  const selectedVisit = visits.find((visit) => visit.id === selectedId) || null;
  const activeCount = visits.filter((visit) => !TERMINAL_STATES.has(visit.currentState || '')).length;
  const waitingCount = visits.filter((visit) => WAITING_STATES.has(visit.currentState || '')).length;
  const inProgressCount = visits.filter((visit) => IN_PROGRESS_STATES.has(visit.currentState || '')).length;
  const procedureCount = visits.filter((visit) => !!visit.proceduresOrdered?.length).length;
  const today = new Date().toISOString().slice(0, 10);
  const completedToday = visits.filter((visit) => fhirStatusFor(visit.currentState) === 'finished' && (visit.dischargedAt || visit.stateEnteredAt || '').startsWith(today)).length;
  const attentionCount = visits.filter(isAttention).length;
  const hasFilters = !!search || statusFilter !== 'all' || typeFilter !== 'all' || priorityFilter !== 'all' || locationFilter !== 'all' || practitionerFilter !== 'all' || !!dateFilter || listTab !== 'all';

  function clearFilters() {
    setSearch('');
    setStatusFilter('all');
    setTypeFilter('all');
    setPriorityFilter('all');
    setLocationFilter('all');
    setPractitionerFilter('all');
    setDateFilter('');
    setListTab('all');
  }

  function openDetail(id: string, tab: DetailTab = 'overview') {
    setSelectedId(id);
    setDetailTab(tab);
  }

  function exportVisits() {
    const payload = filteredVisits.map((visit) => ({
      resourceType: 'Encounter',
      id: visit.fhirEncounterId || visit.id,
      patient: { id: visit.patientId, name: visit.patientName, mrn: visit.mrn },
      fhirStatus: fhirStatusFor(visit.currentState),
      workflowStatus: visit.currentState,
      reason: visit.chiefComplaint,
      practitioner: visit.assignedPhysicianName,
      location: locationLabel(visit, rooms),
      started: visit.arrivedAt,
    }));
    jsonDownload('encounters-export.json', JSON.stringify(payload, null, 2));
    showNotice(`${payload.length} encounter${payload.length === 1 ? '' : 's'} exported.`);
  }

  async function handleFhirFile(file: File | undefined) {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as FhirResource | { resourceType?: string; entry?: Array<{ resource?: FhirResource }> };
      const resources = 'entry' in parsed && Array.isArray(parsed.entry) ? parsed.entry.map((entry) => entry.resource).filter((resource): resource is FhirResource => !!resource) : [parsed as FhirResource];
      const encounters = resources.filter((resource) => resource.resourceType === 'Encounter');
      if (!encounters.length) throw new Error('No Encounter resources were found in that FHIR file.');
      setImportedResources(encounters);
      setImportOpen(true);
      showNotice(`${encounters.length} FHIR Encounter resource${encounters.length === 1 ? '' : 's'} loaded for preview.`);
    } catch (error) {
      showNotice(error instanceof Error ? error.message : 'The FHIR file could not be read.');
    } finally {
      if (importInputRef.current) importInputRef.current.value = '';
    }
  }

  const tabs: Array<{ id: ListTab; label: string; count: number }> = [
    { id: 'all', label: 'All', count: visits.length },
    { id: 'waiting', label: 'Waiting', count: waitingCount },
    { id: 'in-progress', label: 'In Progress', count: inProgressCount },
    { id: 'needs-attention', label: 'Needs Attention', count: attentionCount },
    { id: 'procedure', label: 'Procedure', count: procedureCount },
    { id: 'completed', label: 'Completed', count: visits.filter((visit) => fhirStatusFor(visit.currentState) === 'finished').length },
  ];

  return <div className="w-full space-y-5">
    {notice && <div role="status" className="fixed bottom-5 right-5 z-[60] max-w-sm rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-lg">{notice}</div>}

    <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between"><div><div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-sky-700"><span className="h-2 w-2 rounded-full bg-sky-500" /> Clinical Command Center</div><h1 className="text-3xl font-bold tracking-tight text-slate-950">Encounters</h1><p className="mt-1 text-sm text-slate-500">Clinical encounters, care transitions, and visit activity.</p><span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600"><Icon name="code" size={13} /> FHIR R4 · Encounter Resource</span></div><div className="flex flex-wrap items-center gap-2"><Link href="/dashboard/encounters/new" className="inline-flex items-center gap-2 rounded-md bg-sky-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300">+ New Encounter</Link><button type="button" onClick={() => importInputRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"><Icon name="upload" size={15} /> Import FHIR</button><input ref={importInputRef} type="file" accept="application/json,application/fhir+json" className="hidden" onChange={(event) => handleFhirFile(event.target.files?.[0])} /><button type="button" onClick={exportVisits} disabled={!filteredVisits.length} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"><Icon name="download" size={15} /> Export</button><button type="button" onClick={refresh} disabled={loading} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"><Icon name="refresh" size={15} /> {loading ? 'Refreshing…' : 'Refresh'}</button></div></header>

    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5"><MetricCard icon={<Icon name="clipboard" size={17} className="text-sky-600" />} label="Active Encounters" value={activeCount} support="Non-terminal workflow states" tone="border-sky-100 bg-sky-50/50" onClick={() => setListTab('all')} /><MetricCard icon={<Icon name="clock" size={17} className="text-teal-600" />} label="Waiting" value={waitingCount} support={`${visits.filter((visit) => WAITING_STATES.has(visit.currentState || '') && visit.arrivedAt && Date.now() - Date.parse(visit.arrivedAt) > 30 * 60000).length} waiting over 30 min`} tone="border-teal-100 bg-teal-50/50" onClick={() => setListTab('waiting')} /><MetricCard icon={<Icon name="stethoscope" size={17} className="text-indigo-600" />} label="In Progress" value={inProgressCount} support="Currently in clinical workflow" tone="border-indigo-100 bg-indigo-50/50" onClick={() => setListTab('in-progress')} /><MetricCard icon={<Icon name="calendar" size={17} className="text-amber-600" />} label="Procedures" value={procedureCount} support="Visits with recorded procedures" tone="border-amber-100 bg-amber-50/50" onClick={() => setListTab('procedure')} /><MetricCard icon={<Icon name="check" size={17} className="text-emerald-600" />} label="Completed Today" value={completedToday} support="Based on recorded finish time" tone="border-emerald-100 bg-emerald-50/50" onClick={() => setListTab('completed')} /></div>

    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
      <div className="min-w-0 space-y-4">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-col gap-3 lg:flex-row lg:items-center"><div className="relative min-w-0 flex-1"><Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input aria-label="Search encounters" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search Patient, MRN, Encounter ID..." className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100" /></div><div className="flex flex-wrap items-center gap-2"><select aria-label="Filter by FHIR status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-lg border border-slate-200 px-2.5 py-2 text-xs text-slate-700 focus:border-sky-400 focus:outline-none"><option value="all">All FHIR Statuses</option>{Object.keys(FHIR_STATUS_LABELS).map((status) => <option key={status} value={status}>{FHIR_STATUS_LABELS[status]}</option>)}</select><select aria-label="Sort encounters" value={sort} onChange={(event) => setSort(event.target.value as SortKey)} className="rounded-lg border border-slate-200 px-2.5 py-2 text-xs text-slate-700 focus:border-sky-400 focus:outline-none"><option value="priority">Sort: Clinical Priority</option><option value="recent">Sort: Most Recent</option><option value="oldest">Sort: Oldest</option><option value="patient">Sort: Patient Name</option><option value="status">Sort: Status</option><option value="practitioner">Sort: Practitioner</option><option value="location">Sort: Location</option></select><button type="button" onClick={clearFilters} disabled={!hasFilters} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"><Icon name="filter" size={14} /> Clear Filters</button></div></div><div className="mt-3 flex flex-wrap gap-2"><select aria-label="Filter by encounter type" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 focus:border-sky-400 focus:outline-none"><option value="all">All Encounter Types</option>{filterOptions.types.map((type) => <option key={type} value={type}>{type}</option>)}</select><select aria-label="Filter by priority" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 focus:border-sky-400 focus:outline-none"><option value="all">All Priorities</option><option value="urgent">Urgent</option><option value="high">High</option><option value="normal">Normal</option><option value="low">Low</option></select><select aria-label="Filter by location" value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 focus:border-sky-400 focus:outline-none"><option value="all">All Locations</option>{filterOptions.locations.map((location) => <option key={location} value={location}>{location}</option>)}</select><select aria-label="Filter by practitioner" value={practitionerFilter} onChange={(event) => setPractitionerFilter(event.target.value)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 focus:border-sky-400 focus:outline-none"><option value="all">All Practitioners</option>{filterOptions.practitioners.map((practitioner) => <option key={practitioner} value={practitioner}>{practitioner}</option>)}</select><label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600">Date <input type="date" aria-label="Filter by encounter date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="border-0 bg-transparent p-0 text-xs text-slate-600 focus:outline-none" /></label></div></section>

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 pt-3"><div className="flex min-w-0 gap-1 overflow-x-auto" role="tablist" aria-label="Encounter Status Views">{tabs.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={listTab === tab.id} onClick={() => setListTab(tab.id)} className={`shrink-0 border-b-2 px-2.5 py-2.5 text-xs font-semibold transition ${listTab === tab.id ? 'border-sky-600 text-sky-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{tab.label} <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] ${listTab === tab.id ? 'bg-sky-50 text-sky-700' : 'bg-slate-100 text-slate-500'}`}>{tab.count}</span></button>)}</div><span className="hidden shrink-0 text-xs text-slate-500 sm:block">{filteredVisits.length} Showing</span></div><div className="space-y-3 p-4">{filteredVisits.length ? filteredVisits.map((visit) => <EncounterCard key={visit.id} visit={visit} rooms={rooms} selected={visit.id === selectedId} onSelect={() => openDetail(visit.id)} />) : <EmptyState filtered={hasFilters} onClear={clearFilters} onNew={() => { window.location.href = '/dashboard/encounters/new'; }} />}</div></section>
      </div>

      <aside className="space-y-4"><section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-2"><Icon name="alert" size={16} className="text-rose-600" /><h2 className="text-sm font-semibold text-slate-900">Work Queue</h2></div><div className="mt-3 space-y-2.5"><button type="button" onClick={() => setListTab('needs-attention')} className="flex w-full items-center justify-between rounded-lg border border-rose-100 bg-rose-50/50 px-3 py-2 text-left hover:bg-rose-50"><span className="text-xs font-medium text-rose-800">Needs Attention</span><strong className="text-sm text-rose-700">{attentionCount}</strong></button><button type="button" onClick={() => setListTab('waiting')} className="flex w-full items-center justify-between rounded-lg border border-teal-100 bg-teal-50/50 px-3 py-2 text-left hover:bg-teal-50"><span className="text-xs font-medium text-teal-800">Waiting Room</span><strong className="text-sm text-teal-700">{waitingCount}</strong></button><button type="button" onClick={() => setListTab('procedure')} className="flex w-full items-center justify-between rounded-lg border border-amber-100 bg-amber-50/50 px-3 py-2 text-left hover:bg-amber-50"><span className="text-xs font-medium text-amber-800">Procedure Visits</span><strong className="text-sm text-amber-700">{procedureCount}</strong></button></div></section><section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-2"><Icon name="code" size={16} className="text-slate-600" /><h2 className="text-sm font-semibold text-slate-900">FHIR Model</h2></div><p className="mt-2 text-xs leading-5 text-slate-500">Clinical cards use human-readable labels. Technical status and resource relationships are available inside encounter details.</p><div className="mt-3 space-y-2 text-xs"><div className="flex justify-between"><span className="text-slate-500">Resource</span><span className="font-mono text-slate-700">Encounter</span></div><div className="flex justify-between"><span className="text-slate-500">Version</span><span className="font-mono text-slate-700">R4</span></div><div className="flex justify-between"><span className="text-slate-500">Loaded Records</span><span className="font-medium text-slate-700">{visits.length}</span></div></div><button type="button" onClick={() => selectedVisit && openDetail(selectedVisit.id, 'fhir')} disabled={!selectedVisit} className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"><Icon name="code" size={14} /> Inspect Selected Resource</button></section><section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="text-sm font-semibold text-slate-900">Saved Views</h2><div className="mt-2 space-y-1.5"><button type="button" onClick={() => { clearFilters(); setListTab('all'); setSort('priority'); }} className="block w-full rounded-md px-2 py-1.5 text-left text-xs text-slate-600 hover:bg-slate-50">My Encounters</button><button type="button" onClick={() => { clearFilters(); setListTab('waiting'); }} className="block w-full rounded-md px-2 py-1.5 text-left text-xs text-slate-600 hover:bg-slate-50">Waiting Room</button><button type="button" onClick={() => { clearFilters(); setDateFilter(today); }} className="block w-full rounded-md px-2 py-1.5 text-left text-xs text-slate-600 hover:bg-slate-50">Today's Encounters</button><button type="button" onClick={() => { clearFilters(); setListTab('needs-attention'); }} className="block w-full rounded-md px-2 py-1.5 text-left text-xs text-slate-600 hover:bg-slate-50">Urgent</button></div></section></aside>
    </div>

    {importOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4" role="presentation" onClick={() => setImportOpen(false)}><div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl" role="dialog" aria-modal="true" aria-label="FHIR Import Preview" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="text-lg font-semibold text-slate-900">FHIR Import Preview</h2><p className="mt-1 text-sm text-slate-500">Encounter resources loaded from the selected file. Nothing is persisted until an authorized import workflow is available.</p></div><button type="button" onClick={() => setImportOpen(false)} aria-label="Close FHIR Import Preview" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100"><Icon name="close" size={18} /></button></div><div className="max-h-[60vh] overflow-y-auto p-5 space-y-2">{importedResources.map((resource, index) => <div key={`${resource.id || 'resource'}-${index}`} className="rounded-lg border border-slate-100 bg-slate-50 p-3"><div className="flex items-center justify-between"><span className="font-mono text-xs text-slate-700">{resource.resourceType || 'Resource'}/{resource.id || 'No ID'}</span><span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-600">{resource.status || 'Status Not Recorded'}</span></div><pre className="mt-2 max-h-32 overflow-auto text-[10px] leading-4 text-slate-500">{JSON.stringify(resource, null, 2)}</pre></div>)}</div><div className="flex justify-end border-t border-slate-100 px-5 py-3"><button type="button" onClick={() => setImportOpen(false)} className="rounded-md bg-sky-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-sky-700">Close Preview</button></div></div></div>}

    {selectedVisit && <DetailDrawer visit={selectedVisit} rooms={rooms} tab={detailTab} onTabChange={setDetailTab} onClose={() => setSelectedId(null)} />}
  </div>;
}
