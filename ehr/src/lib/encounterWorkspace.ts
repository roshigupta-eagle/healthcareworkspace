import type { DoctorWorkspaceActor } from '@/lib/doctorWorkspaceAuth';
import {
  cardiologyRoleFor,
  configuredWaitThresholdMinutes,
  transitionRequiresPractitioner,
  transitionRequiresRoom,
  isEncounterFhirStatus,
  isTerminalEncounterStatus,
  operationalStateFor,
  waitDurationMinutes,
  type EncounterFhirStatus,
  type EncounterOperationalState,
  type EncounterTransition,
} from '@/lib/encounterWorkflow';

type JsonObject = Record<string, unknown>;

type FhirBundle = {
  resourceType?: string;
  type?: string;
  total?: number;
  entry?: Array<{ resource?: JsonObject }>;
};

type CardiologyVisit = {
  ID?: string;
  TenantID?: string;
  EncounterID?: string;
  PatientID?: string;
  AppointmentID?: string | null;
  ReferralID?: string | null;
  CurrentState?: string;
  PreviousState?: string | null;
  VisitType?: string;
  Priority?: string;
  AssignedPhysicianID?: string | null;
  AssignedNurseID?: string | null;
  CurrentRoomID?: string | null;
  ChiefComplaint?: string | null;
  ArrivedAt?: string | null;
  StateEnteredAt?: string | null;
  DischargedAt?: string | null;
  CreatedAt?: string;
  UpdatedAt?: string;
};

type CardiologyRoom = {
  ID?: string;
  TenantID?: string;
  Name?: string;
  RoomType?: string;
  Capacity?: number;
  FHIRLocationID?: string | null;
  IsActive?: boolean;
  Occupants?: Array<{
    EncounterID?: string;
    PatientID?: string;
    CurrentState?: string;
  }> | null;
};

export type EncounterWorkspaceFilter =
  | 'all'
  | 'waiting'
  | 'in-progress'
  | 'needs-attention'
  | 'procedure'
  | 'completed'
  | 'cancelled';

export type EncounterWorkspaceSort =
  | 'clinical-priority'
  | 'arrival'
  | 'longest-waiting'
  | 'recently-updated'
  | 'patient'
  | 'encounter-start'
  | 'location';

export type EncounterWorkspaceFilters = {
  q?: string;
  filter?: EncounterWorkspaceFilter;
  fhirStatus?: EncounterFhirStatus;
  type?: string;
  priority?: string;
  location?: string;
  practitioner?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: EncounterWorkspaceSort;
  page?: number;
  pageSize?: number;
};

export type EncounterSource = {
  state: 'ready' | 'partial' | 'stale' | 'unavailable';
  label: string;
  error?: string;
};

export type EncounterPatient = {
  id: string;
  name: string;
  mrn?: string;
  birthDate?: string;
  gender?: string;
};

export type EncounterLocation = {
  id: string;
  name: string;
  type?: string;
  fhirLocationId?: string;
};

export type EncounterPractitioner = {
  id: string;
  name: string;
};

export type EncounterAttention = {
  id: string;
  type: 'operational-wait' | 'unassigned-practitioner' | 'location' | 'documentation';
  label: string;
  detail: string;
  priority: 'urgent' | 'high' | 'normal';
  source: string;
};

export type EncounterWorklistItem = {
  encounterId: string;
  fhirVersionId?: string;
  fhirLastUpdated?: string;
  fhirStatus: EncounterFhirStatus;
  encounterClass: { code?: string; display: string };
  encounterType: string;
  operational: EncounterOperationalState & { code?: string };
  patient: EncounterPatient;
  reason: string;
  priority: 'Urgent' | 'High' | 'Normal' | 'Low' | 'Not recorded';
  prioritySource: 'operational' | 'fhir' | 'unavailable';
  location?: EncounterLocation;
  practitioner?: EncounterPractitioner;
  appointment?: { id: string; status?: string; start?: string; end?: string };
  arrivedAt?: string;
  stateEnteredAt?: string;
  finishedAt?: string;
  waitMinutes?: number;
  needsAttention: EncounterAttention[];
  lastUpdated?: string;
  hasOperationalWorkflow: boolean;
  workflowUpdatedAt?: string;
};

export type EncounterLocationStatus = {
  id: string;
  name: string;
  type?: string;
  capacity: number;
  occupancy: number;
  status: 'available' | 'occupied' | 'unavailable' | 'data-conflict';
  fhirLocationId?: string;
};

export type EncounterWorkspaceSnapshot = {
  generatedAt: string;
  items: EncounterWorklistItem[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  metrics: {
    active: number;
    waiting: number;
    inProgress: number;
    procedures: number;
    needsAttention: number;
    completedToday: number;
    unassigned: number;
    longestWaitMinutes: number | null;
    averageWaitMinutes: number | null;
  };
  attention: Array<EncounterAttention & { encounterId: string; patient: EncounterPatient }>;
  locations: EncounterLocationStatus[];
  options: {
    types: string[];
    priorities: string[];
    locations: string[];
    practitioners: string[];
  };
  sources: {
    encounter: EncounterSource;
    workflow: EncounterSource;
    locations: EncounterSource;
  };
  policy: { waitingThresholdMinutes: number; source: string; timeZone: string };
  freshness: {
    state: 'current' | 'stale' | 'unknown';
    lastUpdated?: string;
    staleAfterMinutes: number;
  };
};

export type EncounterActivity = {
  id: string;
  type: string;
  occurredAt?: string;
  actor?: string;
  fromState?: string;
  toState?: string;
  locationId?: string;
  note?: string;
  source: string;
};

export type EncounterClinicalResource = {
  id: string;
  type:
    | 'Observation'
    | 'DiagnosticReport'
    | 'ServiceRequest'
    | 'Procedure'
    | 'DocumentReference'
    | 'MedicationRequest'
    | 'Task'
    | 'Communication';
  display: string;
  status?: string;
  occurredAt?: string;
  summary?: string;
};

export type EncounterDetail = {
  item: EncounterWorklistItem;
  fhir: {
    resourceId: string;
    versionId?: string;
    lastUpdated?: string;
    profiles: string[];
    references: Array<{ type: string; id: string; display?: string }>;
    resource?: JsonObject;
  };
  activity: EncounterActivity[];
  transitions: Array<EncounterTransition & { allowed: boolean }>;
  rooms: EncounterLocationStatus[];
  practitioners: EncounterPractitioner[];
  clinical: {
    observations: EncounterClinicalResource[];
    results: EncounterClinicalResource[];
    orders: EncounterClinicalResource[];
    procedures: EncounterClinicalResource[];
    documents: EncounterClinicalResource[];
    medications: EncounterClinicalResource[];
    tasks: EncounterClinicalResource[];
    communications: EncounterClinicalResource[];
  };
  sources: Record<string, EncounterSource>;
};

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function object(value: unknown): JsonObject | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonObject
    : undefined;
}

function values(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function timestamp(value?: string | null): number {
  const parsed = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

function referenceId(value: unknown, resourceType: string): string | undefined {
  const reference = text(object(value)?.reference);
  if (!reference) return undefined;
  const parts = reference.split('/');
  const index = parts.lastIndexOf(resourceType);
  return index >= 0 ? parts[index + 1] : undefined;
}

function nameFromResource(resource?: JsonObject): string {
  if (!resource) return 'Patient name unavailable';
  const name = values(resource.name)
    .map(object)
    .find(Boolean);
  if (!name) return text(resource.display) || 'Patient name unavailable';
  const given = values(name.given)
    .map(text)
    .filter((value): value is string => Boolean(value));
  const family = text(name.family);
  return [...given, family].filter(Boolean).join(' ') || 'Patient name unavailable';
}

function identifierValue(resource: JsonObject): string | undefined {
  return values(resource.identifier)
    .map(object)
    .map((identifier) => text(identifier?.value))
    .find(Boolean);
}

function conceptDisplay(value: unknown, fallback = 'Not recorded'): string {
  const concept = object(value);
  if (!concept) return fallback;
  const direct = text(concept.text);
  if (direct) return direct;
  for (const coding of values(concept.coding).map(object)) {
    const display = text(coding?.display) || text(coding?.code);
    if (display) return display;
  }
  return fallback;
}

function firstConceptDisplay(value: unknown, fallback = 'Not recorded'): string {
  return conceptDisplay(values(value)[0], fallback);
}

function encounterClass(resource: JsonObject) {
  const concept = object(resource.class);
  return {
    code: text(concept?.code),
    display: text(concept?.display) || text(concept?.code) || 'Not recorded',
  };
}

function fhirStatus(resource: JsonObject): EncounterFhirStatus {
  const status = text(resource.status);
  return isEncounterFhirStatus(status) ? status : 'unknown';
}

function operationalPriority(value?: string | null): EncounterWorklistItem['priority'] {
  const priority = (value || '').toUpperCase();
  if (priority === 'URGENT') return 'Urgent';
  if (priority === 'HIGH') return 'High';
  if (priority === 'NORMAL') return 'Normal';
  if (priority === 'LOW') return 'Low';
  return 'Not recorded';
}

function priorityRank(priority: EncounterWorklistItem['priority']): number {
  if (priority === 'Urgent') return 0;
  if (priority === 'High') return 1;
  if (priority === 'Normal') return 2;
  if (priority === 'Low') return 3;
  return 4;
}

function timeZone(): string {
  return process.env.DOCTOR_VIEW_TIME_ZONE || 'America/Toronto';
}

function dateKey(value: string | undefined, zone: string): string | undefined {
  if (!value || !timestamp(value)) return undefined;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value));
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  return year && month && day ? `${year}-${month}-${day}` : undefined;
}

function sourceUrl(path: string): string {
  const base = (process.env.FHIR_BASE_URL || process.env.NEXT_PUBLIC_FHIR_API_URL || 'http://localhost:8081/fhir').replace(/\/$/, '');
  return `${base.endsWith('/R4') ? base : `${base}/R4`}${path}`;
}

function cardiologyUrl(path: string): string {
  const base = (process.env.CARDIOLOGY_API_URL || 'http://localhost:8081/cardiology').replace(/\/$/, '');
  return `${base}${path}`;
}

function integrationHeaders() {
  const token = process.env.CARDIOLOGY_SERVICE_TOKEN || process.env.FHIR_INTERNAL_TOKEN || process.env.FHIR_SERVICE_TOKEN;
  const tenantId = process.env.ENCOUNTER_WORKSPACE_TENANT_ID || process.env.NEXT_PUBLIC_TENANT_ID || 'default';
  return {
    accept: 'application/fhir+json, application/json',
    'x-tenant-id': tenantId,
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(url, {
      headers: integrationHeaders(),
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Source returned HTTP ${response.status}.`);
    return await response.json() as T;
  } finally {
    clearTimeout(timeout);
  }
}

async function fhirSearch(resourceType: string, params: Record<string, string> = {}): Promise<JsonObject[]> {
  const query = new URLSearchParams({ _count: '100', ...params }).toString();
  const bundle = await fetchJson<FhirBundle>(sourceUrl(`/${resourceType}?${query}`));
  if (bundle.resourceType !== 'Bundle' || bundle.type !== 'searchset') {
    throw new Error(`${resourceType} source did not return a FHIR searchset.`);
  }
  return values(bundle.entry)
    .map(object)
    .map((entry) => object(entry?.resource))
    .filter((resource): resource is JsonObject => Boolean(resource));
}

async function fhirRead(resourceType: string, id: string): Promise<JsonObject> {
  return fetchJson<JsonObject>(sourceUrl(`/${resourceType}/${encodeURIComponent(id)}`));
}

function canAccessEncounterPatient(patientId: string): boolean {
  const configured = (process.env.ENCOUNTER_WORKSPACE_PATIENT_IDS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return configured.includes(patientId);
}

function configuredForProduction(): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  return Boolean(
    process.env.CARDIOLOGY_SERVICE_TOKEN &&
      process.env.FHIR_INTERNAL_TOKEN &&
      process.env.ENCOUNTER_WORKSPACE_PATIENT_IDS,
  );
}

function roomStatus(room: CardiologyRoom): EncounterLocationStatus | null {
  const id = text(room.ID);
  const name = text(room.Name);
  if (!id || !name) return null;
  const capacity = typeof room.Capacity === 'number' && room.Capacity >= 0 ? room.Capacity : 0;
  const occupancy = values(room.Occupants).length;
  return {
    id,
    name,
    type: text(room.RoomType),
    capacity,
    occupancy,
    status: room.IsActive === false ? 'unavailable' : occupancy > 0 ? 'occupied' : 'available',
    fhirLocationId: text(room.FHIRLocationID),
  };
}

function attentionFor(
  item: Omit<EncounterWorklistItem, 'needsAttention'>,
  thresholdMinutes: number,
): EncounterAttention[] {
  const attention: EncounterAttention[] = [];
  if (item.operational.category === 'waiting' && item.waitMinutes !== undefined && item.waitMinutes > thresholdMinutes) {
    attention.push({
      id: `${item.encounterId}:operational-wait`,
      type: 'operational-wait',
      label: `Waiting ${item.waitMinutes} minutes`,
      detail: `Waiting exceeds the configured ${thresholdMinutes}-minute operational threshold.`,
      priority: item.priority === 'Urgent' ? 'urgent' : 'high',
      source: 'Cardiology operational workflow',
    });
  }
  if (item.operational.code === 'PHYSICIAN_PENDING' && !item.practitioner) {
    attention.push({
      id: `${item.encounterId}:unassigned-practitioner`,
      type: 'unassigned-practitioner',
      label: 'Practitioner assignment required',
      detail: 'The operational workflow is awaiting a practitioner assignment.',
      priority: item.priority === 'Urgent' ? 'urgent' : 'high',
      source: 'Cardiology operational workflow',
    });
  }
  if (
    ['triage', 'active', 'procedure'].includes(item.operational.category) &&
    !item.location
  ) {
    attention.push({
      id: `${item.encounterId}:location`,
      type: 'location',
      label: 'Location not recorded',
      detail: 'The active workflow has no linked operational location.',
      priority: 'normal',
      source: 'Cardiology operational workflow',
    });
  }
  return attention;
}

function matchesFilters(
  item: EncounterWorklistItem,
  filters: EncounterWorkspaceFilters,
  zone: string,
): boolean {
  const filter = filters.filter || 'all';
  if (filter === 'waiting' && item.operational.category !== 'waiting') return false;
  if (filter === 'in-progress' && item.fhirStatus !== 'in-progress') return false;
  if (filter === 'needs-attention' && !item.needsAttention.length) return false;
  if (filter === 'procedure' && item.operational.category !== 'procedure') return false;
  if (filter === 'completed' && item.fhirStatus !== 'finished') return false;
  if (filter === 'cancelled' && !['cancelled', 'entered-in-error'].includes(item.fhirStatus)) return false;
  if (filters.fhirStatus && item.fhirStatus !== filters.fhirStatus) return false;
  if (filters.type && item.encounterType !== filters.type) return false;
  if (filters.priority && item.priority.toLowerCase() !== filters.priority.toLowerCase()) return false;
  if (filters.location && item.location?.name !== filters.location) return false;
  if (filters.practitioner && item.practitioner?.name !== filters.practitioner) return false;
  const eventDate = dateKey(item.arrivedAt || item.stateEnteredAt || item.lastUpdated, zone);
  if (filters.dateFrom && (!eventDate || eventDate < filters.dateFrom)) return false;
  if (filters.dateTo && (!eventDate || eventDate > filters.dateTo)) return false;
  const query = filters.q?.trim().toLowerCase();
  if (query) {
    const fields = [
      item.patient.name,
      item.patient.mrn,
      item.encounterId,
      item.reason,
      item.practitioner?.name,
      item.location?.name,
      item.appointment?.id,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    if (!fields.includes(query)) return false;
  }
  return true;
}

function sortItems(items: EncounterWorklistItem[], sort: EncounterWorkspaceSort): EncounterWorklistItem[] {
  return [...items].sort((left, right) => {
    if (sort === 'patient') return left.patient.name.localeCompare(right.patient.name);
    if (sort === 'location') return (left.location?.name || '').localeCompare(right.location?.name || '');
    if (sort === 'arrival') return timestamp(right.arrivedAt) - timestamp(left.arrivedAt);
    if (sort === 'longest-waiting') return (right.waitMinutes || -1) - (left.waitMinutes || -1);
    if (sort === 'recently-updated') return timestamp(right.lastUpdated) - timestamp(left.lastUpdated);
    if (sort === 'encounter-start') return timestamp(right.stateEnteredAt) - timestamp(left.stateEnteredAt);
    return priorityRank(left.priority) - priorityRank(right.priority) || timestamp(left.arrivedAt || left.lastUpdated) - timestamp(right.arrivedAt || right.lastUpdated);
  });
}

export async function getEncounterWorkspace(
  actor: DoctorWorkspaceActor,
  filters: EncounterWorkspaceFilters = {},
  now = new Date(),
): Promise<EncounterWorkspaceSnapshot> {
  const zone = timeZone();
  const thresholdMinutes = configuredWaitThresholdMinutes();
  const unavailable = (error: string): EncounterWorkspaceSnapshot => ({
    generatedAt: now.toISOString(),
    items: [],
    total: 0,
    page: 1,
    pageSize: 25,
    pageCount: 1,
    metrics: { active: 0, waiting: 0, inProgress: 0, procedures: 0, needsAttention: 0, completedToday: 0, unassigned: 0, longestWaitMinutes: null, averageWaitMinutes: null },
    attention: [],
    locations: [],
    options: { types: [], priorities: [], locations: [], practitioners: [] },
    sources: {
      encounter: { state: 'unavailable', label: 'FHIR R4 Encounter service', error },
      workflow: { state: 'unavailable', label: 'Cardiology operational workflow', error },
      locations: { state: 'unavailable', label: 'Cardiology location service', error },
    },
    policy: { waitingThresholdMinutes: thresholdMinutes, source: 'ENCOUNTER_WAIT_THRESHOLD_MINUTES', timeZone: zone },
  });

  if (!configuredForProduction()) {
    return unavailable('Encounter integration is not configured with a production patient-access scope.');
  }

  const [encounterResult, visitResult, roomResult] = await Promise.allSettled([
    fhirSearch('Encounter'),
    fetchJson<CardiologyVisit[]>(cardiologyUrl('/visits')),
    fetchJson<CardiologyRoom[]>(cardiologyUrl('/rooms')),
  ]);
  if (encounterResult.status !== 'fulfilled') {
    return unavailable('FHIR Encounter source is temporarily unavailable.');
  }
  if (visitResult.status !== 'fulfilled') {
    return unavailable('Cardiology operational workflow source is temporarily unavailable.');
  }

  const workflowVisits = Array.isArray(visitResult.value) ? visitResult.value : [];
  const rooms = roomResult.status === 'fulfilled' && Array.isArray(roomResult.value)
    ? roomResult.value
    : [];
  const visitByEncounterId = new Map(
    workflowVisits
      .map((visit) => [text(visit.EncounterID), visit] as const)
      .filter((entry): entry is [string, CardiologyVisit] => Boolean(entry[0])),
  );
  const locationById = new Map(
    rooms
      .map(roomStatus)
      .filter((room): room is EncounterLocationStatus => Boolean(room))
      .map((room) => [room.id, room]),
  );

  const candidates = encounterResult.value
    .map((resource) => ({ resource, id: text(resource.id), patientId: referenceId(resource.subject, 'Patient') }))
    .filter((entry): entry is { resource: JsonObject; id: string; patientId: string } => Boolean(entry.id && entry.patientId))
    .filter((entry) => canAccessEncounterPatient(entry.patientId));
  const patientIds = [...new Set(candidates.map((entry) => entry.patientId))];
  const patientReads = await Promise.allSettled(
    patientIds.map(async (patientId) => [patientId, await fhirRead('Patient', patientId)] as const),
  );
  const patients = new Map(
    patientReads
      .filter((result): result is PromiseFulfilledResult<readonly [string, JsonObject]> => result.status === 'fulfilled')
      .map((result) => result.value),
  );

  const items: EncounterWorklistItem[] = [];
  for (const candidate of candidates) {
    const patientResource = patients.get(candidate.patientId);
    const workflow = visitByEncounterId.get(candidate.id);
    if (!patientResource) continue;
    if (workflow && text(workflow.PatientID) !== candidate.patientId) continue;
    const operationalCode = text(workflow?.CurrentState);
    const operational = { ...operationalStateFor(operationalCode), ...(operationalCode ? { code: operationalCode } : {}) };
    const room = text(workflow?.CurrentRoomID);
    const location = room ? locationById.get(room) : undefined;
    const assignedId = text(workflow?.AssignedPhysicianID);
    const priority = operationalPriority(workflow?.Priority);
    const reason = firstConceptDisplay(candidate.resource.reasonCode, text(workflow?.ChiefComplaint) || 'Reason for visit not recorded');
    const period = object(candidate.resource.period);
    const arrivedAt = text(workflow?.ArrivedAt) || text(period?.start);
    const stateEnteredAt = text(workflow?.StateEnteredAt);
    const finishedAt = text(workflow?.DischargedAt) || text(period?.end);
    const base: Omit<EncounterWorklistItem, 'needsAttention'> = {
      encounterId: candidate.id,
      fhirVersionId: text(object(candidate.resource.meta)?.versionId),
      fhirLastUpdated: text(object(candidate.resource.meta)?.lastUpdated),
      fhirStatus: fhirStatus(candidate.resource),
      encounterClass: encounterClass(candidate.resource),
      encounterType: firstConceptDisplay(candidate.resource.type, text(workflow?.VisitType) || 'Not recorded'),
      operational,
      patient: {
        id: candidate.patientId,
        name: nameFromResource(patientResource),
        mrn: identifierValue(patientResource),
        birthDate: text(patientResource.birthDate),
        gender: text(patientResource.gender),
      },
      reason,
      priority,
      prioritySource: priority === 'Not recorded' ? 'unavailable' : 'operational',
      location: location
        ? { id: location.id, name: location.name, type: location.type, fhirLocationId: location.fhirLocationId }
        : undefined,
      practitioner: assignedId ? { id: assignedId, name: 'Practitioner identity unavailable' } : undefined,
      appointment: text(workflow?.AppointmentID)
        ? { id: text(workflow?.AppointmentID)! }
        : undefined,
      arrivedAt,
      stateEnteredAt,
      finishedAt,
      waitMinutes: operational.category === 'waiting' ? waitDurationMinutes(arrivedAt, now) ?? undefined : undefined,
      lastUpdated: text(object(candidate.resource.meta)?.lastUpdated) || text(workflow?.UpdatedAt) || stateEnteredAt || arrivedAt,
      hasOperationalWorkflow: Boolean(workflow),
      workflowUpdatedAt: text(workflow?.UpdatedAt),
    };
    items.push({ ...base, needsAttention: attentionFor(base, thresholdMinutes) });
  }

  const visible = sortItems(items.filter((item) => matchesFilters(item, filters, zone)), filters.sort || 'clinical-priority');
  const pageSize = Math.min(Math.max(filters.pageSize || 25, 1), 100);
  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  const page = Math.min(Math.max(filters.page || 1, 1), pageCount);
  const waiting = items.filter((item) => item.operational.category === 'waiting');
  const waitValues = waiting
    .map((item) => item.waitMinutes)
    .filter((value): value is number => value !== undefined);
  const attention = items
    .flatMap((item) => item.needsAttention.map((entry) => ({ ...entry, encounterId: item.encounterId, patient: item.patient })))
    .sort((left, right) => priorityRank(left.priority === 'urgent' ? 'Urgent' : left.priority === 'high' ? 'High' : 'Normal') - priorityRank(right.priority === 'urgent' ? 'Urgent' : right.priority === 'high' ? 'High' : 'Normal'));
  const today = dateKey(now.toISOString(), zone);
  const completedToday = items.filter((item) => item.fhirStatus === 'finished' && dateKey(item.finishedAt, zone) === today).length;

  return {
    generatedAt: now.toISOString(),
    items: visible.slice((page - 1) * pageSize, page * pageSize),
    total: visible.length,
    page,
    pageSize,
    pageCount,
    metrics: {
      active: items.filter((item) => !isTerminalEncounterStatus(item.fhirStatus)).length,
      waiting: waiting.length,
      inProgress: items.filter((item) => item.fhirStatus === 'in-progress').length,
      procedures: items.filter((item) => item.operational.category === 'procedure').length,
      needsAttention: attention.length,
      completedToday,
      unassigned: items.filter((item) => item.needsAttention.some((entry) => entry.type === 'unassigned-practitioner')).length,
      longestWaitMinutes: waitValues.length ? Math.max(...waitValues) : null,
      averageWaitMinutes: waitValues.length ? Math.round(waitValues.reduce((sum, value) => sum + value, 0) / waitValues.length) : null,
    },
    attention,
    locations: [...locationById.values()],
    options: {
      types: [...new Set(items.map((item) => item.encounterType).filter((value) => value !== 'Not recorded'))].sort(),
      priorities: [...new Set(items.map((item) => item.priority).filter((value) => value !== 'Not recorded'))],
      locations: [...new Set(items.map((item) => item.location?.name).filter((value): value is string => Boolean(value)))].sort(),
      practitioners: [...new Set(items.map((item) => item.practitioner?.name).filter((value): value is string => Boolean(value && value !== 'Practitioner identity unavailable')))].sort(),
    },
    sources: {
      encounter: { state: 'ready', label: 'FHIR R4 Encounter service' },
      workflow: { state: 'ready', label: 'Cardiology operational workflow' },
      locations: roomResult.status === 'fulfilled'
        ? { state: 'ready', label: 'Cardiology location service' }
        : { state: 'partial', label: 'Cardiology location service', error: 'Location service is temporarily unavailable.' },
    },
    policy: { waitingThresholdMinutes: thresholdMinutes, source: 'ENCOUNTER_WAIT_THRESHOLD_MINUTES', timeZone: zone },
  };
}

function resourcePatientId(resource: JsonObject): string | undefined {
  return (
    referenceId(resource.subject, 'Patient') ||
    referenceId(resource.patient, 'Patient') ||
    referenceId(resource.for, 'Patient')
  );
}

function resourceMatchesEncounter(
  resource: JsonObject,
  encounterId: string,
): boolean {
  if (referenceId(resource.encounter, 'Encounter') === encounterId) return true;
  if (referenceId(resource.focus, 'Encounter') === encounterId) return true;
  const context = object(resource.context);
  return values(context?.encounter).some(
    (reference) => referenceId(reference, 'Encounter') === encounterId,
  );
}

function resourceDisplay(resource: JsonObject, fallback: string): string {
  const firstContent = object(values(resource.content)[0]);
  const attachment = object(firstContent?.attachment);
  return (
    conceptDisplay(resource.code, '') ||
    conceptDisplay(resource.type, '') ||
    text(resource.description) ||
    text(attachment?.title) ||
    fallback
  );
}

function clinicalResource(
  resource: JsonObject,
  type: EncounterClinicalResource['type'],
): EncounterClinicalResource | null {
  const id = text(resource.id);
  if (!id) return null;
  const quantity = object(resource.valueQuantity);
  const quantityValue = quantity && quantity.value !== undefined
    ? `${String(quantity.value)}${text(quantity.unit) ? ` ${text(quantity.unit)}` : ''}`
    : undefined;
  return {
    id,
    type,
    display: resourceDisplay(resource, `${type} ${id}`),
    status: text(resource.status),
    occurredAt:
      text(resource.effectiveDateTime) ||
      text(resource.issued) ||
      text(resource.date) ||
      text(resource.authoredOn) ||
      text(resource.created),
    summary:
      quantityValue ||
      text(resource.conclusion) ||
      text(resource.note) ||
      text(resource.statusReason),
  };
}

async function linkedResources(
  resourceType: EncounterClinicalResource['type'],
  patientId: string,
  encounterId: string,
): Promise<EncounterClinicalResource[]> {
  const resources = resourceType === 'Task'
    ? await fhirSearch(resourceType, { focus: `Encounter/${encounterId}` })
    : await fhirSearch(resourceType, { patient: patientId });
  return resources
    .filter(
      (resource) =>
        resourcePatientId(resource) === patientId &&
        resourceMatchesEncounter(resource, encounterId),
    )
    .map((resource) => clinicalResource(resource, resourceType))
    .filter((resource): resource is EncounterClinicalResource => Boolean(resource));
}

function sourceResult<T>(
  result: PromiseSettledResult<T>,
  label: string,
): EncounterSource {
  if (result.status === 'fulfilled') return { state: 'ready', label };
  return { state: 'unavailable', label, error: 'Source is temporarily unavailable.' };
}

export async function getEncounterDetail(
  actor: DoctorWorkspaceActor,
  encounterId: string,
): Promise<EncounterDetail | null> {
  const snapshot = await getEncounterWorkspace(actor, {
    q: encounterId,
    pageSize: 100,
  });
  const item = snapshot.items.find((candidate) => candidate.encounterId === encounterId);
  if (!item || snapshot.sources.encounter.state === 'unavailable') return null;

  const [resourceResult, visitResult, eventResult, transitionResult, practitionerResult] =
    await Promise.allSettled([
      fhirRead('Encounter', encounterId),
      fetchJson<CardiologyVisit>(cardiologyUrl(`/visits/${encodeURIComponent(encounterId)}`)),
      fetchJson<unknown[]>(cardiologyUrl(`/visits/${encodeURIComponent(encounterId)}/events`)),
      fetchJson<{ validTransitions?: EncounterTransition[] }>(
        cardiologyUrl(`/visits/${encodeURIComponent(encounterId)}/transitions`),
      ),
      fhirSearch('Practitioner'),
    ]);
  if (resourceResult.status !== 'fulfilled') return null;
  const resource = resourceResult.value;
  if (referenceId(resource.subject, 'Patient') !== item.patient.id) return null;
  if (
    visitResult.status === 'fulfilled' &&
    text(visitResult.value.PatientID) !== item.patient.id
  ) {
    return null;
  }

  const relatedResults = await Promise.allSettled([
    linkedResources('Observation', item.patient.id, encounterId),
    linkedResources('DiagnosticReport', item.patient.id, encounterId),
    linkedResources('ServiceRequest', item.patient.id, encounterId),
    linkedResources('Procedure', item.patient.id, encounterId),
    linkedResources('DocumentReference', item.patient.id, encounterId),
    linkedResources('MedicationRequest', item.patient.id, encounterId),
    linkedResources('Task', item.patient.id, encounterId),
    linkedResources('Communication', item.patient.id, encounterId),
  ]);
  const related = relatedResults.map((result) =>
    result.status === 'fulfilled' ? result.value : [],
  );
  const metadata = object(resource.meta);
  const profiles = values(metadata?.profile)
    .map(text)
    .filter((profile): profile is string => Boolean(profile));
  const appointmentIds = values(resource.appointment)
    .map((reference) => referenceId(reference, 'Appointment'))
    .filter((id): id is string => Boolean(id));
  const participantIds = values(resource.participant)
    .map(object)
    .map((participant) => referenceId(participant?.individual, 'Practitioner'))
    .filter((id): id is string => Boolean(id));
  const room = item.location;
  const references = [
    { type: 'Patient', id: item.patient.id, display: item.patient.name },
    ...appointmentIds.map((id) => ({ type: 'Appointment', id })),
    ...participantIds.map((id) => ({ type: 'Practitioner', id })),
    ...(room?.fhirLocationId
      ? [{ type: 'Location', id: room.fhirLocationId, display: room.name }]
      : []),
  ];
  const practitioners = practitionerResult.status === 'fulfilled'
    ? practitionerResult.value
        .map((practitioner) => {
          const id = text(practitioner.id);
          return id ? { id, name: nameFromResource(practitioner) } : null;
        })
        .filter((practitioner): practitioner is EncounterPractitioner => Boolean(practitioner))
    : [];
  const actorRole = cardiologyRoleFor(actor.role);
  const transitions = transitionResult.status === 'fulfilled'
    ? (transitionResult.value.validTransitions || []).map((transition) => ({
        ...transition,
        allowed: Boolean(actorRole && transition.allowedRoles.includes(actorRole)),
      }))
    : [];
  const activity = eventResult.status === 'fulfilled'
    ? eventResult.value
        .map(object)
        .filter((event): event is JsonObject => Boolean(event))
        .map((event, index) => ({
          id: text(event.ID) || `${encounterId}:event:${index}`,
          type: text(event.EventType) || 'Encounter event',
          occurredAt: text(event.OccurredAt),
          actor: text(event.ActorID),
          fromState: text(event.FromState),
          toState: text(event.ToState),
          locationId: text(event.RoomID),
          note: text(event.Notes),
          source: 'Cardiology operational workflow',
        }))
    : [];
  const sourceNames = [
    'Observation',
    'DiagnosticReport',
    'ServiceRequest',
    'Procedure',
    'DocumentReference',
    'MedicationRequest',
    'Task',
    'Communication',
  ];

  return {
    item,
    fhir: {
      resourceId: encounterId,
      versionId: text(metadata?.versionId),
      lastUpdated: text(metadata?.lastUpdated),
      profiles,
      references,
    },
    activity,
    transitions,
    rooms: snapshot.locations,
    practitioners,
    clinical: {
      observations: related[0],
      results: related[1],
      orders: related[2],
      procedures: related[3],
      documents: related[4],
      medications: related[5],
      tasks: related[6],
      communications: related[7],
    },
    sources: {
      encounter: snapshot.sources.encounter,
      workflow: sourceResult(visitResult, 'Cardiology operational workflow'),
      activity: sourceResult(eventResult, 'Cardiology workflow events'),
      transitions: sourceResult(transitionResult, 'Cardiology workflow transitions'),
      practitioners: sourceResult(practitionerResult, 'FHIR R4 Practitioner directory'),
      ...Object.fromEntries(
        relatedResults.map((result, index) => [
          sourceNames[index],
          sourceResult(result, `FHIR R4 ${sourceNames[index]} service`),
        ]),
      ),
    },
  };
}

export type EncounterTransitionCommand = {
  encounterId: string;
  event: string;
  expectedUpdatedAt: string;
  roomId?: string;
  assignedPractitionerId?: string;
  note?: string;
};

export type EncounterTransitionResult = {
  event: string;
  toState?: string;
  updatedAt?: string;
};

export class EncounterCommandError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly outcome: 'failure' | 'denied' = 'failure',
  ) {
    super(message);
  }
}

function commandText(value: string | undefined, maximum: number): string {
  return value?.trim().slice(0, maximum) || '';
}

async function postCardiologyTransition(
  encounterId: string,
  body: Record<string, string>,
): Promise<JsonObject> {
  const response = await fetch(
    cardiologyUrl(`/visits/${encodeURIComponent(encounterId)}/transition`),
    {
      method: 'POST',
      headers: { ...integrationHeaders(), 'content-type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    },
  );
  const payload = await response.json().catch(() => ({})) as JsonObject;
  if (!response.ok) {
    const message = text(payload.error) || 'The operational workflow rejected this encounter transition.';
    throw new EncounterCommandError(
      message,
      response.status === 401 || response.status === 403 ? response.status : 409,
      response.status === 401 || response.status === 403 ? 'denied' : 'failure',
    );
  }
  return payload;
}

export async function transitionEncounter(
  actor: DoctorWorkspaceActor,
  command: EncounterTransitionCommand,
): Promise<EncounterTransitionResult> {
  const actorRole = cardiologyRoleFor(actor.role);
  if (!actorRole) {
    throw new EncounterCommandError(
      'Your role is not permitted to perform encounter workflow actions.',
      403,
      'denied',
    );
  }
  const detail = await getEncounterDetail(actor, command.encounterId);
  if (!detail) {
    throw new EncounterCommandError(
      'Encounter not found or unavailable in your authorized scope.',
      404,
      'denied',
    );
  }
  const event = commandText(command.event, 80);
  const expectedUpdatedAt = commandText(command.expectedUpdatedAt, 80);
  const transition = detail.transitions.find((candidate) => candidate.event === event);
  if (!transition) {
    throw new EncounterCommandError(
      'This workflow action is not valid for the encounter state currently on record.',
      409,
    );
  }
  if (!transition.allowed) {
    throw new EncounterCommandError(
      'Your role is not permitted to perform this encounter workflow action.',
      403,
      'denied',
    );
  }
  if (!expectedUpdatedAt || expectedUpdatedAt !== detail.item.workflowUpdatedAt) {
    throw new EncounterCommandError(
      'This encounter changed since you opened it. Refresh the encounter before continuing.',
      409,
    );
  }

  const roomId = commandText(command.roomId, 160);
  if (transitionRequiresRoom(event)) {
    const room = detail.rooms.find((candidate) => candidate.id === roomId);
    const currentRoom = detail.item.location?.id;
    if (
      !room ||
      room.status === 'unavailable' ||
      (room.id !== currentRoom && room.occupancy >= room.capacity)
    ) {
      throw new EncounterCommandError(
        'Select an active, appropriate room with available capacity before continuing.',
        409,
      );
    }
  }

  const assignedPractitionerId = commandText(command.assignedPractitionerId, 160);
  if (
    transitionRequiresPractitioner(event) &&
    !detail.practitioners.some(
      (practitioner) => practitioner.id === assignedPractitionerId,
    )
  ) {
    throw new EncounterCommandError(
      'Select a practitioner from the configured FHIR Practitioner directory.',
      400,
    );
  }

  const updated = await postCardiologyTransition(command.encounterId, {
    event,
    actorId: actor.id,
    actorRole,
    expectedUpdatedAt,
    ...(roomId ? { roomId } : {}),
    ...(assignedPractitionerId ? { assignedPhysicianId: assignedPractitionerId } : {}),
    ...(commandText(command.note, 1000) ? { notes: commandText(command.note, 1000) } : {}),
  });
  return {
    event,
    toState: text(updated.CurrentState),
    updatedAt: text(updated.UpdatedAt),
  };
}

export function actorCanUseCardiologyWorkflow(actor: DoctorWorkspaceActor): boolean {
  return Boolean(cardiologyRoleFor(actor.role));
}