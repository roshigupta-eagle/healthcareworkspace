'use client';

import Link from 'next/link';
import {
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import WorkspaceDrawer from '@/components/doctor-workspace/WorkspaceDrawer';
import {
  encounterTransitionLabel,
  transitionRequiresPractitioner,
  transitionRequiresRoom,
} from '@/lib/encounterWorkflow';
import type {
  EncounterAttention,
  EncounterClinicalResource,
  EncounterDetail,
  EncounterLocationStatus,
  EncounterWorklistItem,
  EncounterWorkspaceFilter,
  EncounterWorkspaceSnapshot,
  EncounterWorkspaceSort,
} from '@/lib/encounterWorkspace';
import './encounter-command-center.css';

type ViewMode = 'list' | 'cards';
type DetailTab = 'overview' | 'timeline' | 'results' | 'orders' | 'notes' | 'more';

type Props = {
  initialData: EncounterWorkspaceSnapshot;
};

type IconName =
  | 'activity'
  | 'alert'
  | 'arrow'
  | 'calendar'
  | 'check'
  | 'chevron'
  | 'clock'
  | 'code'
  | 'document'
  | 'download'
  | 'filter'
  | 'grid'
  | 'location'
  | 'more'
  | 'orders'
  | 'patient'
  | 'procedure'
  | 'refresh'
  | 'search'
  | 'shield'
  | 'stethoscope'
  | 'upload'
  | 'users'
  | 'x';

const FHIR_STATUS_LABELS: Record<string, string> = {
  planned: 'Planned',
  arrived: 'Arrived',
  triaged: 'Triaged',
  'in-progress': 'In progress',
  onleave: 'On leave',
  finished: 'Finished',
  cancelled: 'Cancelled',
  'entered-in-error': 'Entered in error',
  unknown: 'Unknown',
};

const TABS: Array<{ id: EncounterWorkspaceFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'waiting', label: 'Waiting' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'needs-attention', label: 'Needs Attention' },
  { id: 'procedure', label: 'Procedures' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
];

const DETAIL_TABS: Array<{ id: DetailTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'results', label: 'Results' },
  { id: 'orders', label: 'Orders' },
  { id: 'notes', label: 'Notes' },
  { id: 'more', label: 'More' },
];

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    activity: <><path d="M3 12h4l2.2-6 4.2 12L16 12h5" /></>,
    alert: <><path d="m12 3 9 17H3L12 3z" /><path d="M12 9v4M12 16h.01" /></>,
    arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></>,
    check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    code: <><path d="m8 9-4 3 4 3M16 9l4 3-4 3M14 5l-4 14" /></>,
    document: <><path d="M6 3h9l4 4v14H6z" /><path d="M14 3v5h5M9 13h6M9 17h5" /></>,
    download: <><path d="M12 3v11M8 10l4 4 4-4M5 20h14" /></>,
    filter: <path d="M4 6h16M7 12h10M10 18h4" />,
    grid: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></>,
    location: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
    orders: <><path d="M5 4h14v16H5z" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
    patient: <><circle cx="12" cy="8" r="3" /><path d="M5 21a7 7 0 0 1 14 0" /></>,
    procedure: <><path d="m5 4 6 6M13 4l-2 2m2-2 2 2M4 15l5 5 11-11-5-5z" /><path d="m8 19 2-2" /></>,
    refresh: <><path d="M20 11a8 8 0 0 0-14-5L3 9M3 4v5h5M4 13a8 8 0 0 0 14 5l3-3M21 20v-5h-5" /></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
    shield: <><path d="M12 3 5 6v5c0 5 3.2 8.2 7 10 3.8-1.8 7-5 7-10V6z" /><path d="m9 12 2 2 4-4" /></>,
    stethoscope: <><path d="M6 3v5a4 4 0 0 0 8 0V3M4 3h4M12 3h4M14 12v3a4 4 0 0 0 4 4h1a2 2 0 0 0 2-2v-1" /><circle cx="19" cy="12" r="2" /></>,
    upload: <><path d="M12 15V4M8 8l4-4 4 4M5 20h14" /></>,
    users: <><path d="M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1" /><circle cx="9.5" cy="7" r="3" /><path d="M17 11a3 3 0 1 0 0-6M21 20v-1a4 4 0 0 0-3-3.8" /></>,
    x: <path d="m6 6 12 12M18 6 6 18" />,
  };
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      width={size}
    >
      {paths[name]}
    </svg>
  );
}

function timestamp(value?: string) {
  const parsed = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(value?: string, includeTime = false) {
  const parsed = timestamp(value);
  if (!parsed) return 'Not recorded';
  const date = new Date(parsed);
  const dateLabel = new Intl.DateTimeFormat('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
  if (!includeTime) return dateLabel;
  return `${dateLabel} at ${new Intl.DateTimeFormat('en-CA', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)}`;
}

function formatDuration(minutes?: number) {
  if (minutes === undefined) return 'Not started';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`;
}

function ageFromBirthDate(birthDate?: string) {
  const parsed = timestamp(`${birthDate || ''}T12:00:00`);
  if (!parsed) return 'Age not recorded';
  const birth = new Date(parsed);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
  ) {
    age -= 1;
  }
  return `${age} yrs`;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'PT';
}

function statusTone(item: EncounterWorklistItem) {
  if (item.operational.category === 'waiting') return 'is-waiting';
  if (item.operational.category === 'triage') return 'is-triage';
  if (item.operational.category === 'active') return 'is-active';
  if (item.operational.category === 'procedure') return 'is-procedure';
  if (item.operational.category === 'results') return 'is-results';
  if (item.operational.category === 'disposition') return 'is-disposition';
  if (item.operational.category === 'completed') return 'is-completed';
  if (item.operational.category === 'exception') return 'is-exception';
  return 'is-unknown';
}

function StatusBadge({ item }: { item: EncounterWorklistItem }) {
  return (
    <span className={`enc-status ${statusTone(item)}`}>
      <i />
      {item.operational.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: EncounterWorklistItem['priority'] }) {
  const tone = priority === 'Urgent'
    ? 'is-urgent'
    : priority === 'High'
      ? 'is-high'
      : priority === 'Normal'
        ? 'is-normal'
        : 'is-low';
  return <span className={`enc-priority ${tone}`}>{priority}</span>;
}

function PatientIdentity({ patient }: { patient: EncounterWorklistItem['patient'] }) {
  return (
    <span className="enc-patient">
      <span className="enc-avatar" aria-hidden="true">{initials(patient.name)}</span>
      <span>
        <strong>{patient.name}</strong>
        <small>
          {patient.mrn ? `MRN ${patient.mrn}` : 'MRN not recorded'}
          {patient.birthDate ? ` · ${ageFromBirthDate(patient.birthDate)}` : ''}
          {patient.gender ? ` · ${patient.gender}` : ''}
        </small>
      </span>
    </span>
  );
}

function MetricCard({
  icon,
  label,
  value,
  detail,
  active,
  onClick,
  tone,
}: {
  icon: IconName;
  label: string;
  value: number;
  detail: string;
  active: boolean;
  onClick: () => void;
  tone: string;
}) {
  return (
    <button
      aria-pressed={active}
      className={`enc-metric ${tone}${active ? ' is-active' : ''}`}
      onClick={onClick}
      type="button"
    >
      <span className="enc-metric-icon"><Icon name={icon} size={18} /></span>
      <span className="enc-metric-copy">
        <small>{label}</small>
        <strong>{value}</strong>
        <em>{detail}</em>
      </span>
      <Icon name="arrow" size={14} />
    </button>
  );
}

function EncounterTable({
  items,
  selectedId,
  now,
  onOpen,
}: {
  items: EncounterWorklistItem[];
  selectedId: string | null;
  now: Date;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="enc-table-wrap">
      <table>
        <thead>
          <tr>
            <th scope="col">Patient</th>
            <th scope="col">Reason for visit</th>
            <th scope="col">Status</th>
            <th scope="col">Location</th>
            <th scope="col">Practitioner</th>
            <th scope="col">Priority</th>
            <th scope="col">Arrival / duration</th>
            <th scope="col"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const waiting = item.operational.category === 'waiting'
              ? item.waitMinutes === undefined
                ? undefined
                : Math.max(0, Math.floor((now.getTime() - timestamp(item.arrivedAt || item.stateEnteredAt)) / 60_000))
              : undefined;
            return (
              <tr className={selectedId === item.encounterId ? 'is-selected' : ''} key={item.encounterId}>
                <td><PatientIdentity patient={item.patient} /></td>
                <td>
                  <button className="enc-row-title" onClick={() => onOpen(item.encounterId)} type="button">
                    <strong>{item.reason}</strong>
                    <small>{item.encounterType} · Encounter/{item.encounterId.slice(0, 8)}</small>
                  </button>
                </td>
                <td>
                  <StatusBadge item={item} />
                  <small className="enc-fhir-status">FHIR: {FHIR_STATUS_LABELS[item.fhirStatus]}</small>
                </td>
                <td><span className="enc-cell-stack"><strong>{item.location?.name || 'Not recorded'}</strong><small>{item.location?.type?.replace(/_/g, ' ') || 'Operational location'}</small></span></td>
                <td><span className={`enc-cell-stack${item.practitioner ? '' : ' is-unassigned'}`}><strong>{item.practitioner?.name || 'Unassigned'}</strong><small>{item.practitioner ? 'Assigned practitioner' : 'Assignment required when workflow permits'}</small></span></td>
                <td><PriorityBadge priority={item.priority} /></td>
                <td><span className="enc-cell-stack"><strong>{formatDate(item.arrivedAt || item.stateEnteredAt, true)}</strong><small>{waiting !== undefined ? `Waiting ${formatDuration(waiting)}` : item.stateEnteredAt ? `Updated ${formatDate(item.stateEnteredAt, true)}` : 'No arrival time recorded'}</small></span></td>
                <td><button className="enc-open-button" onClick={() => onOpen(item.encounterId)} type="button">Open <Icon name="arrow" size={13} /></button></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function EncounterCards({
  items,
  selectedId,
  now,
  onOpen,
}: {
  items: EncounterWorklistItem[];
  selectedId: string | null;
  now: Date;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="enc-card-grid">
      {items.map((item) => {
        const waiting = item.operational.category === 'waiting'
          ? item.waitMinutes === undefined
            ? undefined
            : Math.max(0, Math.floor((now.getTime() - timestamp(item.arrivedAt || item.stateEnteredAt)) / 60_000))
          : undefined;
        return (
          <article className={`enc-card${selectedId === item.encounterId ? ' is-selected' : ''}`} key={item.encounterId}>
            <header>
              <PatientIdentity patient={item.patient} />
              <PriorityBadge priority={item.priority} />
            </header>
            <div className="enc-card-heading">
              <span className="enc-kicker">Reason for visit</span>
              <button onClick={() => onOpen(item.encounterId)} type="button">{item.reason}</button>
            </div>
            <div className="enc-card-state">
              <StatusBadge item={item} />
              <span>FHIR: {FHIR_STATUS_LABELS[item.fhirStatus]}</span>
            </div>
            <dl className="enc-card-details">
              <div><dt>Location</dt><dd>{item.location?.name || 'Not recorded'}</dd></div>
              <div><dt>Practitioner</dt><dd>{item.practitioner?.name || 'Unassigned'}</dd></div>
              <div><dt>Arrival</dt><dd>{formatDate(item.arrivedAt || item.stateEnteredAt, true)}</dd></div>
              <div><dt>Duration</dt><dd>{waiting !== undefined ? `Waiting ${formatDuration(waiting)}` : 'See encounter'}</dd></div>
            </dl>
            {item.needsAttention.length > 0 && <div className="enc-card-alert"><Icon name="alert" size={14} /><span>{item.needsAttention[0].label}</span></div>}
            <footer><span>Encounter/{item.encounterId.slice(0, 8)}</span><button className="enc-open-button" onClick={() => onOpen(item.encounterId)} type="button">Open <Icon name="arrow" size={13} /></button></footer>
          </article>
        );
      })}
    </div>
  );
}

function EmptyState({ filtered, onClear, onNew }: { filtered: boolean; onClear: () => void; onNew: () => void }) {
  return (
    <div className="enc-empty">
      <span><Icon name="calendar" size={23} /></span>
      <h3>{filtered ? 'No encounters match these filters' : 'No active encounters are available'}</h3>
      <p>{filtered ? 'Adjust the search or filter controls to return to the authorized encounter worklist.' : 'The connected Encounter source has no records in the current authorized scope.'}</p>
      <div>
        {filtered && <button className="enc-secondary-button" onClick={onClear} type="button">Clear filters</button>}
        <button className="enc-primary-button" onClick={onNew} type="button"><Icon name="calendar" size={14} /> Schedule encounter</button>
      </div>
    </div>
  );
}

function ResourceList({
  title,
  resources,
  empty,
}: {
  title: string;
  resources: EncounterClinicalResource[];
  empty: string;
}) {
  return (
    <section className="enc-detail-section">
      <h3>{title}</h3>
      {resources.length ? (
        <div className="enc-resource-list">
          {resources.map((resource) => (
            <article key={`${resource.type}-${resource.id}`}>
              <span className="enc-resource-icon"><Icon name={resource.type === 'Procedure' ? 'procedure' : resource.type === 'Task' ? 'check' : resource.type === 'DocumentReference' ? 'document' : resource.type === 'ServiceRequest' ? 'orders' : 'activity'} size={15} /></span>
              <div><strong>{resource.display}</strong><small>{resource.type} · {resource.status || 'Status not recorded'}{resource.occurredAt ? ` · ${formatDate(resource.occurredAt, true)}` : ''}</small>{resource.summary && <p>{resource.summary}</p>}</div>
            </article>
          ))}
        </div>
      ) : <p className="enc-muted-copy">{empty}</p>}
    </section>
  );
}

function SourceList({ sources }: { sources: EncounterDetail['sources'] | EncounterWorkspaceSnapshot['sources'] }) {
  return (
    <ul className="enc-source-list">
      {Object.entries(sources).map(([key, source]) => (
        <li key={key} className={`is-${source.state}`}>
          <i />
          <span>{source.label}</span>
          <small>{source.state === 'ready' ? 'Connected' : source.error || 'Unavailable'}</small>
        </li>
      ))}
    </ul>
  );
}

function EncounterDetailDrawer({
  detail,
  loading,
  error,
  onClose,
  onTransition,
  busyAction,
}: {
  detail: EncounterDetail | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onTransition: (event: string, values: { roomId?: string; practitionerId?: string; note?: string }) => void;
  busyAction: string | null;
}) {
  const [tab, setTab] = useState<DetailTab>('overview');
  const [roomId, setRoomId] = useState('');
  const [practitionerId, setPractitionerId] = useState('');
  const [note, setNote] = useState('');
  useEffect(() => {
    if (!detail) return;
    const currentRoom = detail.item.location?.id || '';
    const timer = window.setTimeout(() => {
      setTab('overview');
      setRoomId(currentRoom);
      setPractitionerId(detail.item.practitioner?.id || '');
      setNote('');
    }, 0);
    return () => window.clearTimeout(timer);
  }, [detail]);

  return (
    <WorkspaceDrawer onClose={onClose} open title="Encounter Details" width="680px">
      {loading && <div className="enc-detail-loading"><span /><span /><span /></div>}
      {error && <div className="enc-detail-error" role="alert"><Icon name="alert" size={17} /><div><strong>Unable to load encounter details</strong><p>{error}</p></div></div>}
      {detail && (
        <div className="enc-detail">
          <header className="enc-detail-hero">
            <PatientIdentity patient={detail.item.patient} />
            <div className="enc-detail-identity-meta">
              <span>FHIR Patient/{detail.item.patient.id}</span>
              <span>{detail.item.patient.birthDate ? `DOB ${formatDate(detail.item.patient.birthDate)}` : 'Birth date not recorded'}</span>
            </div>
            <div className="enc-detail-badges"><StatusBadge item={detail.item} /><PriorityBadge priority={detail.item.priority} /><span className="enc-fhir-pill">FHIR: {FHIR_STATUS_LABELS[detail.item.fhirStatus]}</span></div>
          </header>
          <div className="enc-detail-notice"><Icon name="shield" size={15} /><span>Patient links remain within this encounter&apos;s verified FHIR subject context.</span></div>
          <div className="enc-detail-tabs" role="tablist" aria-label="Encounter detail views">
            {DETAIL_TABS.map((item) => <button aria-selected={tab === item.id} key={item.id} onClick={() => setTab(item.id)} role="tab" type="button">{item.label}</button>)}
          </div>
          {tab === 'overview' && (
            <>
              {detail.item.needsAttention.map((attention) => <article className={`enc-wait-alert is-${attention.priority}`} key={attention.id}><Icon name="alert" size={16} /><div><strong>{attention.label}</strong><p>{attention.detail}</p><small>{attention.source}</small></div></article>)}
              <section className="enc-detail-section">
                <h3>Encounter information</h3>
                <dl className="enc-detail-grid">
                  <div><dt>Encounter ID</dt><dd>Encounter/{detail.item.encounterId}</dd></div>
                  <div><dt>FHIR status</dt><dd>{FHIR_STATUS_LABELS[detail.item.fhirStatus]}</dd></div>
                  <div><dt>Operational state</dt><dd>{detail.item.operational.label}</dd></div>
                  <div><dt>Class</dt><dd>{detail.item.encounterClass.display}</dd></div>
                  <div><dt>Type</dt><dd>{detail.item.encounterType}</dd></div>
                  <div><dt>Priority</dt><dd>{detail.item.priority}</dd></div>
                  <div><dt>Reason for visit</dt><dd>{detail.item.reason}</dd></div>
                  <div><dt>Location</dt><dd>{detail.item.location?.name || 'Not recorded'}</dd></div>
                  <div><dt>Practitioner</dt><dd>{detail.item.practitioner?.name || 'Unassigned'}</dd></div>
                  <div><dt>Appointment</dt><dd>{detail.item.appointment ? `Appointment/${detail.item.appointment.id}` : 'Not recorded'}</dd></div>
                  <div><dt>Arrival</dt><dd>{formatDate(detail.item.arrivedAt, true)}</dd></div>
                  <div><dt>Workflow updated</dt><dd>{formatDate(detail.item.workflowUpdatedAt || detail.item.lastUpdated, true)}</dd></div>
                </dl>
              </section>
              <WorkflowActions
                busyAction={busyAction}
                detail={detail}
                note={note}
                onNoteChange={setNote}
                onPractitionerChange={setPractitionerId}
                onRoomChange={setRoomId}
                onTransition={onTransition}
                practitionerId={practitionerId}
                roomId={roomId}
              />
              <ResourceList empty="No encounter-linked vital or observation records are available from the connected FHIR source." resources={detail.clinical.observations} title="Vitals and observations" />
              <section className="enc-detail-section"><h3>Care team</h3>{detail.item.practitioner ? <div className="enc-care-team"><Icon name="stethoscope" size={16} /><div><strong>{detail.item.practitioner.name}</strong><small>Operationally assigned practitioner</small></div></div> : <p className="enc-muted-copy">No practitioner assignment is recorded. Assignment controls appear when the authoritative state permits it.</p>}</section>
            </>
          )}
          {tab === 'timeline' && <Timeline detail={detail} />}
          {tab === 'results' && <ResourceList empty="No DiagnosticReport or Observation is directly linked to this encounter. Patient-only results are not inferred as encounter results." resources={[...detail.clinical.results, ...detail.clinical.observations]} title="Encounter-linked results" />}
          {tab === 'orders' && <ResourceList empty="No encounter-linked ServiceRequest records are available from the connected FHIR source." resources={detail.clinical.orders} title="Orders" />}
          {tab === 'notes' && <ResourceList empty="No encounter-linked DocumentReference records are available from the connected FHIR source." resources={detail.clinical.documents} title="Clinical notes" />}
          {tab === 'more' && <MoreDetail detail={detail} />}
          <footer className="enc-detail-footer"><button className="enc-secondary-button" disabled title="No verified local chart route exists for this FHIR patient identity."><Icon name="patient" size={14} /> Open Patient</button><span className="enc-detail-reference">FHIR Encounter/{detail.item.encounterId}</span></footer>
        </div>
      )}
    </WorkspaceDrawer>
  );
}

function WorkflowActions({
  detail,
  roomId,
  practitionerId,
  note,
  busyAction,
  onRoomChange,
  onPractitionerChange,
  onNoteChange,
  onTransition,
}: {
  detail: EncounterDetail;
  roomId: string;
  practitionerId: string;
  note: string;
  busyAction: string | null;
  onRoomChange: (value: string) => void;
  onPractitionerChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onTransition: (event: string, values: { roomId?: string; practitionerId?: string; note?: string }) => void;
}) {
  const actions = detail.transitions.filter((transition) => transition.allowed);
  if (!actions.length) return <section className="enc-detail-section"><h3>Next workflow action</h3><p className="enc-muted-copy">No workflow action is currently permitted for your role or the authoritative encounter state.</p></section>;
  const usableRooms = detail.rooms.filter((room) => room.status !== 'unavailable' && (room.occupancy < room.capacity || room.id === detail.item.location?.id));
  return (
    <section className="enc-detail-section enc-actions">
      <h3>Next workflow action</h3>
      <p className="enc-muted-copy">Actions are validated by the cardiology workflow service. FHIR Encounter.status remains independently sourced from the FHIR service.</p>
      {actions.map((action) => {
        const needsRoom = transitionRequiresRoom(action.event);
        const needsPractitioner = transitionRequiresPractitioner(action.event);
        const needsReason = action.event === 'CANCELLED';
        const blocked = Boolean(
          busyAction ||
          !detail.item.workflowUpdatedAt ||
          (needsRoom && !roomId) ||
          (needsPractitioner && !practitionerId) ||
          (needsReason && !note.trim()),
        );
        return (
          <div className="enc-action-card" key={action.event}>
            <div><strong>{encounterTransitionLabel(action.event)}</strong><span>{action.toState.replace(/_/g, ' ')}</span></div>
            {needsRoom && <label>Room<select onChange={(event) => onRoomChange(event.target.value)} value={roomId}><option value="">Select an available room</option>{usableRooms.map((room) => <option key={room.id} value={room.id}>{room.name} · {room.occupancy}/{room.capacity} occupied</option>)}</select></label>}
            {needsPractitioner && <label>Practitioner<select onChange={(event) => onPractitionerChange(event.target.value)} value={practitionerId}><option value="">Select practitioner</option>{detail.practitioners.map((practitioner) => <option key={practitioner.id} value={practitioner.id}>{practitioner.name}</option>)}</select></label>}
            {needsReason && <label>Cancellation reason<textarea onChange={(event) => onNoteChange(event.target.value)} value={note} /></label>}
            <button className={action.event === 'CANCELLED' ? 'enc-danger-button' : 'enc-primary-button'} disabled={blocked} onClick={() => onTransition(action.event, { roomId: needsRoom ? roomId : undefined, practitionerId: needsPractitioner ? practitionerId : undefined, note: needsReason ? note : undefined })} type="button">{busyAction === action.event ? 'Saving...' : encounterTransitionLabel(action.event)} <Icon name="arrow" size={14} /></button>
          </div>
        );
      })}
    </section>
  );
}

function Timeline({ detail }: { detail: EncounterDetail }) {
  if (!detail.activity.length) return <section className="enc-detail-section"><h3>Encounter timeline</h3><p className="enc-muted-copy">No immutable operational events are available for this encounter.</p></section>;
  return <section className="enc-detail-section"><h3>Encounter timeline</h3><ol className="enc-timeline">{detail.activity.map((event) => <li key={event.id}><span><Icon name="activity" size={14} /></span><div><strong>{encounterTransitionLabel(event.type)}</strong><p>{event.fromState && event.toState ? `${event.fromState.replace(/_/g, ' ')} to ${event.toState.replace(/_/g, ' ')}` : event.note || event.source}</p><small>{event.actor ? `${event.actor} · ` : ''}{formatDate(event.occurredAt, true)}</small></div></li>)}</ol></section>;
}

function MoreDetail({ detail }: { detail: EncounterDetail }) {
  return <div className="enc-more-detail"><ResourceList empty="No encounter-linked Procedure records are available. Procedure workflow remains distinct from the Encounter status." resources={detail.clinical.procedures} title="Procedures" /><ResourceList empty="No encounter-linked medication records are available from the connected FHIR source." resources={detail.clinical.medications} title="Medications" /><ResourceList empty="No encounter-linked Task records are available from the connected FHIR source." resources={detail.clinical.tasks} title="Tasks" /><ResourceList empty="No encounter-linked Communication records are available from the connected FHIR source." resources={detail.clinical.communications} title="Communications" /><section className="enc-detail-section"><h3>FHIR model</h3><details className="enc-fhir-model"><summary><Icon name="code" size={15} /><span>FHIR R4 Encounter/{detail.fhir.resourceId}</span><Icon name="chevron" size={15} /></summary><dl><div><dt>Version</dt><dd>{detail.fhir.versionId || 'Not recorded'}</dd></div><div><dt>Last updated</dt><dd>{formatDate(detail.fhir.lastUpdated, true)}</dd></div><div><dt>Profiles</dt><dd>{detail.fhir.profiles.length ? detail.fhir.profiles.join(', ') : 'No profile recorded'}</dd></div></dl><ul>{detail.fhir.references.map((reference) => <li key={`${reference.type}-${reference.id}`}>{reference.type}/{reference.id}{reference.display ? ` · ${reference.display}` : ''}</li>)}</ul>{detail.fhir.resource && <pre>{JSON.stringify(detail.fhir.resource, null, 2)}</pre>}</details></section><section className="enc-detail-section"><h3>Connected sources</h3><SourceList sources={detail.sources} /></section></div>;
}

function LocationStatus({ locations }: { locations: EncounterLocationStatus[] }) {
  return <section className="enc-bottom-panel"><header><span className="enc-panel-icon is-location"><Icon name="location" size={17} /></span><div><span className="enc-kicker">Operational capacity</span><h2>Location status</h2></div></header>{locations.length ? <div className="enc-location-grid">{locations.map((location) => <article key={location.id}><span className={`enc-location-dot is-${location.status}`} /><div><strong>{location.name}</strong><small>{location.type?.replace(/_/g, ' ') || 'Location'}</small></div><b>{location.occupancy}/{location.capacity || 'N/A'}</b></article>)}</div> : <p className="enc-muted-copy">Location status is unavailable from the connected operational service.</p>}</section>;
}

function AttentionQueue({
  items,
  onOpen,
}: {
  items: Array<EncounterAttention & { encounterId: string; patient: EncounterWorklistItem['patient'] }>;
  onOpen: (id: string) => void;
}) {
  return <section className="enc-bottom-panel"><header><span className="enc-panel-icon is-attention"><Icon name="alert" size={17} /></span><div><span className="enc-kicker">Derived operational work</span><h2>Needs attention queue</h2></div></header>{items.length ? <ol className="enc-attention-list">{items.slice(0, 6).map((item) => <li key={item.id}><span className={`enc-attention-severity is-${item.priority}`}><Icon name="alert" size={13} /></span><div><strong>{item.patient.name}</strong><p>{item.label}</p><small>{item.source}</small></div><button onClick={() => onOpen(item.encounterId)} type="button">Open <Icon name="arrow" size={13} /></button></li>)}</ol> : <p className="enc-muted-copy">No encounter-related work currently requires attention.</p>}</section>;
}

function MetricsPanel({ data }: { data: EncounterWorkspaceSnapshot }) {
  const { metrics, policy } = data;
  return <section className="enc-bottom-panel"><header><span className="enc-panel-icon is-metrics"><Icon name="activity" size={17} /></span><div><span className="enc-kicker">Today</span><h2>Encounter metrics</h2></div></header><dl className="enc-metrics-definition"><div><dt>Active encounters</dt><dd>{metrics.active}</dd><small>FHIR Encounter records not in a terminal status.</small></div><div><dt>Average wait</dt><dd>{metrics.averageWaitMinutes === null ? 'N/A' : formatDuration(metrics.averageWaitMinutes)}</dd><small>Elapsed time from recorded arrival for current waiting workflows.</small></div><div><dt>Longest wait</dt><dd>{metrics.longestWaitMinutes === null ? 'N/A' : formatDuration(metrics.longestWaitMinutes)}</dd><small>Operational alert threshold: {policy.waitingThresholdMinutes} min.</small></div><div><dt>Room utilization</dt><dd>{data.locations.length ? `${data.locations.filter((room) => room.occupancy > 0).length}/${data.locations.length}` : 'N/A'}</dd><small>Locations with at least one active operational occupant.</small></div></dl></section>;
}

export default function EncounterCommandCenter({ initialData }: Props) {
  const [data, setData] = useState(initialData);
  const [filter, setFilter] = useState<EncounterWorkspaceFilter>('all');
  const [search, setSearch] = useState('');
  const [fhirStatus, setFhirStatus] = useState('');
  const [type, setType] = useState('');
  const [priority, setPriority] = useState('');
  const [location, setLocation] = useState('');
  const [practitioner, setPractitioner] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sort, setSort] = useState<EncounterWorkspaceSort>('clinical-priority');
  const [view, setView] = useState<ViewMode>('list');
  const [showFilters, setShowFilters] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<EncounterDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const detailRequest = useRef<string | null>(null);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    const stored = window.localStorage.getItem('roshi-encounters-view');
    if (stored !== 'list' && stored !== 'cards') return;
    const timer = window.setTimeout(() => setView(stored), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
      setRefreshKey((current) => current + 1);
    }, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({ filter, sort, page: '1', pageSize: '25' });
      if (deferredSearch.trim()) params.set('q', deferredSearch.trim());
      if (fhirStatus) params.set('fhirStatus', fhirStatus);
      if (type) params.set('type', type);
      if (priority) params.set('priority', priority);
      if (location) params.set('location', location);
      if (practitioner) params.set('practitioner', practitioner);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      setLoading(true);
      fetch(`/api/encounters?${params.toString()}`, { cache: 'no-store', signal: controller.signal })
        .then(async (response) => {
          const payload = await response.json().catch(() => ({})) as EncounterWorkspaceSnapshot & { error?: string };
          if (!response.ok) throw new Error(payload.error || 'Unable to load the encounter worklist.');
          return payload;
        })
        .then((snapshot) => {
          setData(snapshot);
          setError(null);
          setNow(new Date());
        })
        .catch((requestError: unknown) => {
          if ((requestError as { name?: string }).name !== 'AbortError') setError(requestError instanceof Error ? requestError.message : 'Unable to load the encounter worklist.');
        })
        .finally(() => setLoading(false));
    }, deferredSearch === search ? 0 : 220);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [dateFrom, dateTo, deferredSearch, filter, fhirStatus, location, practitioner, priority, refreshKey, search, sort, type]);

  function refresh() {
    setError(null);
    setRefreshKey((current) => current + 1);
  }

  function setPreferredView(next: ViewMode) {
    setView(next);
    window.localStorage.setItem('roshi-encounters-view', next);
  }

  function clearFilters() {
    setFilter('all');
    setSearch('');
    setFhirStatus('');
    setType('');
    setPriority('');
    setLocation('');
    setPractitioner('');
    setDateFrom('');
    setDateTo('');
    setShowFilters(false);
  }

  async function openDetail(encounterId: string) {
    detailRequest.current = encounterId;
    setSelectedId(encounterId);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const response = await fetch(`/api/encounters/${encodeURIComponent(encounterId)}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => ({})) as EncounterDetail & { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Unable to load encounter details.');
      if (detailRequest.current === encounterId) setDetail(payload);
    } catch (requestError) {
      if (detailRequest.current === encounterId) setDetailError(requestError instanceof Error ? requestError.message : 'Unable to load encounter details.');
    } finally {
      if (detailRequest.current === encounterId) setDetailLoading(false);
    }
  }

  async function transition(event: string, values: { roomId?: string; practitionerId?: string; note?: string }) {
    if (!detail?.item.workflowUpdatedAt) return;
    setBusyAction(event);
    setDetailError(null);
    try {
      const response = await fetch(`/api/encounters/${encodeURIComponent(detail.item.encounterId)}/transition`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ event, expectedUpdatedAt: detail.item.workflowUpdatedAt, roomId: values.roomId, assignedPractitionerId: values.practitionerId, note: values.note }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || 'The encounter workflow action was not completed.');
      setNotice(`${encounterTransitionLabel(event)} recorded in the operational workflow.`);
      setRefreshKey((current) => current + 1);
      await openDetail(detail.item.encounterId);
    } catch (requestError) {
      setDetailError(requestError instanceof Error ? requestError.message : 'The encounter workflow action was not completed.');
    } finally {
      setBusyAction(null);
    }
  }

  const hasFilters = Boolean(search || fhirStatus || type || priority || location || practitioner || dateFrom || dateTo || filter !== 'all');
  const tabCount = (id: EncounterWorkspaceFilter) => {
    if (id === 'all') return data.metrics.active;
    if (id === 'waiting') return data.metrics.waiting;
    if (id === 'in-progress') return data.metrics.inProgress;
    if (id === 'needs-attention') return data.metrics.needsAttention;
    if (id === 'procedure') return data.metrics.procedures;
    if (id === 'completed') return data.metrics.completedToday;
    return 0;
  };
  const metricCards = [
    { icon: 'activity' as const, label: 'Active encounters', value: data.metrics.active, detail: 'Non-terminal FHIR Encounter records', filter: 'all' as const, tone: 'is-active' },
    { icon: 'clock' as const, label: 'Waiting', value: data.metrics.waiting, detail: data.metrics.longestWaitMinutes === null ? 'No active wait time recorded' : `Longest wait: ${formatDuration(data.metrics.longestWaitMinutes)}`, filter: 'waiting' as const, tone: 'is-waiting' },
    { icon: 'stethoscope' as const, label: 'In progress', value: data.metrics.inProgress, detail: 'FHIR status is in-progress', filter: 'in-progress' as const, tone: 'is-progress' },
    { icon: 'procedure' as const, label: 'Procedures', value: data.metrics.procedures, detail: 'Operational procedure workflow', filter: 'procedure' as const, tone: 'is-procedure' },
    { icon: 'alert' as const, label: 'Needs attention', value: data.metrics.needsAttention, detail: `${data.metrics.unassigned} unassigned · derived workflow alerts`, filter: 'needs-attention' as const, tone: 'is-attention' },
    { icon: 'check' as const, label: 'Completed today', value: data.metrics.completedToday, detail: 'FHIR finished with recorded completion time', filter: 'completed' as const, tone: 'is-completed' },
  ];

  return (
    <main className="encounter-center" id="main-content" aria-labelledby="encounter-title">
      <header className="enc-header">
        <div>
          <span className="enc-eyebrow">Clinical command center</span>
          <h1 id="encounter-title">Encounters</h1>
          <p>Clinical encounters, care transitions, and visit activity.</p>
          <div className="enc-header-meta"><span className={`enc-connected is-${data.sources.encounter.state}`}><i />{data.sources.encounter.state === 'ready' ? 'Connected clinical data' : 'Encounter source unavailable'}</span><span>Updated {formatDate(data.generatedAt, true)}</span><span><Icon name="shield" size={13} /> Authorized workflow</span></div>
        </div>
        <div className="enc-header-actions">
          <Link className="enc-primary-button" href="/dashboard/appointments/book?from=encounters"><Icon name="calendar" size={16} /> New Encounter</Link>
          <button className="enc-secondary-button" onClick={() => setNotice('FHIR import is quarantined until a validated import endpoint is configured.')} type="button"><Icon name="upload" size={15} /> Import FHIR</button>
          <button className="enc-secondary-button" disabled={!selectedId} onClick={() => setNotice(selectedId ? 'Open the selected encounter and use its technical FHIR panel to inspect the authorized resource.' : 'Select an encounter before exporting its authorized FHIR resource.')} type="button"><Icon name="download" size={15} /> Export</button>
          <button aria-label="Refresh encounters" className="enc-icon-button" disabled={loading} onClick={refresh} title="Refresh encounters" type="button"><Icon name="refresh" size={16} /></button>
          <div className="enc-more-actions"><button aria-expanded={showMoreActions} className="enc-icon-button" onClick={() => setShowMoreActions((open) => !open)} title="More encounter actions" type="button"><Icon name="more" size={17} /></button>{showMoreActions && <div role="menu"><button onClick={() => { clearFilters(); setShowMoreActions(false); }} role="menuitem" type="button">Clear worklist filters</button><button onClick={() => { setShowFilters(true); setShowMoreActions(false); }} role="menuitem" type="button">Open advanced filters</button></div>}</div>
        </div>
      </header>
      {notice && <div className="enc-notice" role="status"><Icon name="check" size={16} /><span>{notice}</span><button aria-label="Dismiss notice" onClick={() => setNotice(null)} type="button"><Icon name="x" size={14} /></button></div>}
      {error && <div className="enc-error" role="alert"><Icon name="alert" size={16} /><div><strong>Encounter worklist unavailable</strong><span>{error}</span></div><button onClick={refresh} type="button">Retry</button></div>}
      {(data.sources.encounter.state !== 'ready' || data.sources.workflow.state !== 'ready') && <div className="enc-source-warning" role="status"><Icon name="alert" size={15} /><span>Some encounter sources are unavailable. The rest of the command center remains limited to confirmed data.</span></div>}
      <section className="enc-metrics" aria-label="Encounter operational metrics">{metricCards.map((metric) => <MetricCard active={filter === metric.filter} key={metric.label} onClick={() => setFilter(metric.filter)} {...metric} />)}</section>
      <section className="enc-worklist" aria-busy={loading} aria-labelledby="encounter-worklist-title">
        <header className="enc-worklist-header"><div><span className="enc-eyebrow">Live worklist</span><h2 id="encounter-worklist-title">Encounter flow</h2><p>Review arrivals, active visits, procedures, transitions, and operational work requiring attention.</p></div><span aria-live="polite" className="enc-result-count">{loading ? 'Refreshing worklist...' : `${data.total} encounter${data.total === 1 ? '' : 's'} shown`}</span></header>
        <div className="enc-tab-row" role="tablist" aria-label="Encounter status views">{TABS.map((tab) => <button aria-selected={filter === tab.id} key={tab.id} onClick={() => setFilter(tab.id)} role="tab" type="button">{tab.label}<span>{tabCount(tab.id)}</span></button>)}</div>
        <div className="enc-toolbar">
          <label className="enc-search"><Icon name="search" size={18} /><span className="sr-only">Search encounters</span><input onChange={(event) => setSearch(event.target.value)} placeholder="Search by patient name, MRN, encounter ID, or visit reason..." value={search} /></label>
          <div className="enc-toolbar-actions"><button aria-expanded={showFilters} className="enc-secondary-button" onClick={() => setShowFilters((open) => !open)} type="button"><Icon name="filter" size={14} /> Filters</button><label className="enc-sort"><span className="sr-only">Sort encounters</span><select aria-label="Sort encounters" onChange={(event) => setSort(event.target.value as EncounterWorkspaceSort)} value={sort}><option value="clinical-priority">Clinical priority</option><option value="arrival">Arrival time</option><option value="longest-waiting">Longest waiting</option><option value="recently-updated">Recently updated</option><option value="patient">Patient name</option><option value="encounter-start">Encounter start</option><option value="location">Location</option></select></label><div className="enc-view-toggle" role="group" aria-label="Encounter worklist view"><button aria-pressed={view === 'list'} onClick={() => setPreferredView('list')} title="Table view" type="button"><Icon name="orders" size={15} /><span>List</span></button><button aria-pressed={view === 'cards'} onClick={() => setPreferredView('cards')} title="Card view" type="button"><Icon name="grid" size={15} /><span>Cards</span></button></div></div>
        </div>
        {showFilters && <div className="enc-advanced-filters"><label>FHIR status<select onChange={(event) => setFhirStatus(event.target.value)} value={fhirStatus}><option value="">All statuses</option>{Object.entries(FHIR_STATUS_LABELS).map(([status, label]) => <option key={status} value={status}>{label}</option>)}</select></label><label>Encounter type<select onChange={(event) => setType(event.target.value)} value={type}><option value="">All types</option>{data.options.types.map((option) => <option key={option} value={option}>{option}</option>)}</select></label><label>Priority<select onChange={(event) => setPriority(event.target.value)} value={priority}><option value="">All priorities</option>{data.options.priorities.map((option) => <option key={option} value={option}>{option}</option>)}</select></label><label>Location<select onChange={(event) => setLocation(event.target.value)} value={location}><option value="">All locations</option>{data.options.locations.map((option) => <option key={option} value={option}>{option}</option>)}</select></label><label>Practitioner<select onChange={(event) => setPractitioner(event.target.value)} value={practitioner}><option value="">All practitioners</option>{data.options.practitioners.map((option) => <option key={option} value={option}>{option}</option>)}</select></label><label>From<input onChange={(event) => setDateFrom(event.target.value)} type="date" value={dateFrom} /></label><label>To<input onChange={(event) => setDateTo(event.target.value)} type="date" value={dateTo} /></label><button className="enc-clear-filter" disabled={!hasFilters} onClick={clearFilters} type="button">Clear filters</button></div>}
        {loading && !data.items.length ? <div className="enc-skeleton"><span /><span /><span /><span /></div> : !data.items.length ? <EmptyState filtered={hasFilters} onClear={clearFilters} onNew={() => { window.location.href = '/dashboard/appointments/book?from=encounters'; }} /> : view === 'list' ? <><EncounterTable items={data.items} now={now} onOpen={(id) => void openDetail(id)} selectedId={selectedId} /><div className="enc-mobile-cards"><EncounterCards items={data.items} now={now} onOpen={(id) => void openDetail(id)} selectedId={selectedId} /></div></> : <EncounterCards items={data.items} now={now} onOpen={(id) => void openDetail(id)} selectedId={selectedId} />}
      </section>
      <section className="enc-bottom-grid"><LocationStatus locations={data.locations} /><AttentionQueue items={data.attention} onOpen={(id) => void openDetail(id)} /><MetricsPanel data={data} /></section>
      <footer className="enc-system-footer"><div><Icon name="code" size={14} /><span>FHIR R4 Encounter source</span></div><div><Icon name="shield" size={14} /><span>Audit events requested for workspace reads and commands</span></div><button onClick={() => setShowMoreActions(true)} type="button">System source status <Icon name="arrow" size={13} /></button></footer>
      {selectedId && <EncounterDetailDrawer busyAction={busyAction} detail={detail} error={detailError} loading={detailLoading} onClose={() => { detailRequest.current = null; setSelectedId(null); setDetail(null); setDetailError(null); }} onTransition={(event, values) => void transition(event, values)} />}
    </main>
  );
}