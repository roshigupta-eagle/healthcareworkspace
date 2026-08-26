import { getPatientById, mockPatients, type Patient } from '@/app/dashboard/records/mockPatients';
import { listDocuments, type PatientDocument } from '@/lib/documentStore';
import { listNotes } from '@/lib/doctorNotesStore';
import { listTasks } from '@/lib/tasksStore';
import { canAccessTaskPatient, getDoctorWorkSnapshot } from '@/lib/doctorWorkStore';
import { listAlertAcknowledgements } from '@/lib/doctorAlertStore';
import type { DoctorNote } from '@/types/doctorNote';
import type { ClinicalTask } from '@/types/clinicalTask';

export type DoctorViewSourceState = 'ready' | 'partial' | 'unavailable';
export type DoctorViewPriority = 'critical' | 'urgent' | 'high' | 'normal' | 'low';
export type DoctorViewActionCategory = 'critical-results' | 'abnormal-results' | 'unsigned-notes' | 'refills' | 'orders' | 'documents' | 'open-work' | 'messages';

export interface DoctorViewSourceHealth {
  state: DoctorViewSourceState;
  source: string;
  asOf: string;
  error?: string;
}

export interface DoctorViewPatient {
  displayName: string;
  birthDate?: string;
  age?: number;
  mrn?: string;
  sourceSystem: 'FHIR' | 'Local EHR';
  sourceId: string;
  localPatientId?: string;
  chartHref?: string;
  clinicalContext?: {
    allergies: string[];
    conditions: string[];
    medications: string[];
    recentResult?: string;
    openTasks: number;
    recentDocuments: number;
    riskLevel?: string;
  };
}

export interface DoctorViewVisit {
  id: string;
  encounterId?: string;
  appointmentId?: string;
  patient: DoctorViewPatient;
  state: string;
  visitType?: string;
  priority: DoctorViewPriority;
  chiefComplaint?: string;
  room?: string;
  arrivedAt?: string;
  stateEnteredAt?: string;
  updatedAt?: string;
  waitMinutes?: number;
  waitTimeStale?: boolean;
  sourceHref?: string;
}

export interface DoctorViewQueueItem {
  id: string;
  queueName: string;
  patient: DoctorViewPatient;
  title: string;
  description?: string;
  priority: DoctorViewPriority;
  status: string;
  dueAt?: string;
  createdAt?: string;
  sourceHref?: string;
  canComplete?: boolean;
}

export interface DoctorViewScheduleItem {
  id: string;
  patient: DoctorViewPatient;
  start: string;
  end?: string;
  status: string;
  visitType?: string;
  description?: string;
  sourceHref?: string;
}

export interface DoctorViewAlert {
  id: string;
  patient: DoctorViewPatient;
  title: string;
  reason: string;
  severity: 'urgent' | 'high';
  status: 'unacknowledged' | 'acknowledged';
  triggeredAt: string;
  assignedTo?: string;
  sourceSystem: string;
  sourceHref?: string;
  context?: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
}

export interface DoctorViewActionItem {
  id: string;
  category: DoctorViewActionCategory;
  patient: DoctorViewPatient;
  title: string;
  subtitle?: string;
  priority: DoctorViewPriority;
  status: string;
  dueAt?: string;
  sourceHref?: string;
  sourceSystem: string;
}

export interface DoctorViewActionBucket {
  category: DoctorViewActionCategory;
  label: string;
  description: string;
  count: number | null;
  available: boolean;
  source: DoctorViewSourceHealth;
  items: DoctorViewActionItem[];
}

export interface DoctorViewSnapshot {
  generatedAt: string;
  actor: { id: string; name: string; role: string; specialty: string; clinic: string; timeZone: string };
  clinicPulse: {
    patientsToday: number | null;
    checkedIn: number | null;
    seen: number | null;
    waitingNow: number | null;
    longestWaitMinutes: number | null;
    urgentAttention: number | null;
    unacknowledgedUrgent: number | null;
    completedToday: number | null;
    source: DoctorViewSourceHealth;
  };
  urgentAttention: { items: DoctorViewAlert[]; source: DoctorViewSourceHealth };
  nextPatient: { item: DoctorViewVisit | null; source: DoctorViewSourceHealth };
  schedule: { date: string; items: DoctorViewScheduleItem[]; source: DoctorViewSourceHealth };
  clinicalWork: { items: DoctorViewQueueItem[]; source: DoctorViewSourceHealth };
  rooms: { name: string; roomType?: string; occupancy: number; capacity?: number; available: boolean }[];
  actionCenter: DoctorViewActionBucket[];
  patients: DoctorViewPatient[];
  sources: DoctorViewSourceHealth[];
}

type JsonObject = Record<string, unknown>;

type UpstreamBundle = { resourceType?: string; type?: string; entry?: Array<{ resource?: JsonObject }> };

function object(value: unknown): JsonObject | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : null;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return undefined;
}

function field(record: JsonObject, ...names: string[]): unknown {
  for (const name of names) if (record[name] !== undefined && record[name] !== null) return record[name];
  return undefined;
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asIso(value: unknown): string | undefined {
  const text = stringValue(value);
  if (!text || Number.isNaN(Date.parse(text))) return undefined;
  return new Date(text).toISOString();
}

function ageFromBirthDate(birthDate?: string, now = new Date()) {
  if (!birthDate) return undefined;
  const parsed = new Date(birthDate);
  if (Number.isNaN(parsed.getTime())) return undefined;
  let age = now.getUTCFullYear() - parsed.getUTCFullYear();
  const monthDelta = now.getUTCMonth() - parsed.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getUTCDate() < parsed.getUTCDate())) age -= 1;
  return age >= 0 ? age : undefined;
}

function localDateKey(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

function formatLocalDate(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(date);
}

function priorityFromValue(value: unknown): DoctorViewPriority {
  const text = typeof value === 'string' ? value.toUpperCase() : '';
  if (text === 'URGENT' || text === 'CRITICAL') return 'urgent';
  if (text === 'HIGH') return 'high';
  if (text === 'LOW') return 'low';
  if (typeof value === 'number') {
    if (value <= 0) return 'urgent';
    if (value <= 25) return 'high';
    if (value >= 75) return 'low';
  }
  return 'normal';
}

function normalizeState(value: unknown) {
  return stringValue(value) || 'UNKNOWN';
}

function sourceHealth(source: string, state: DoctorViewSourceState, error?: string): DoctorViewSourceHealth {
  return { source, state, asOf: new Date().toISOString(), ...(error ? { error } : {}) };
}

function sharedWorkActionItem(item: import('@/lib/doctorWorkStore').DoctorWorkItem): DoctorViewActionItem {
  const category: DoctorViewActionCategory = item.kind === 'result-review'
    ? item.priority === 'critical' ? 'critical-results' : 'abnormal-results'
    : item.kind === 'note-signature' ? 'unsigned-notes'
      : item.kind === 'document-review' ? 'documents' : 'open-work';
  const priority: DoctorViewPriority = item.priority === 'critical' ? 'urgent' : item.priority;
  const localPatient = getPatientById(item.patient.id);
  const patient = localPatient ? localPatientReference(localPatient) : { displayName: item.patient.name, mrn: item.patient.mrn, sourceSystem: 'Local EHR' as const, sourceId: item.patient.id, localPatientId: item.patient.id, chartHref: item.patient.href };
  return { id: item.id, category, patient, title: item.title, subtitle: item.summary, priority, status: item.status, dueAt: item.dueAt, sourceHref: item.sourceHref, sourceSystem: item.sourceLabel };
}

function sharedWorkQueueItem(item: import('@/lib/doctorWorkStore').DoctorWorkItem): DoctorViewQueueItem {
  const actionItem = sharedWorkActionItem(item);
  return { id: item.id, queueName: 'SHARED_DOCTOR_WORK', patient: actionItem.patient, title: item.title, description: item.summary, priority: item.priority, status: item.status, dueAt: item.dueAt, createdAt: item.createdAt, sourceHref: item.sourceHref, canComplete: item.canComplete };
}

async function fetchJson(url: string, source: string, token?: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const headers: Record<string, string> = { accept: 'application/json' };
    if (token) headers.authorization = `Bearer ${token}`;
    const response = await fetch(url, { headers, cache: 'no-store', signal: controller.signal });
    if (!response.ok) throw new Error(`${source} returned HTTP ${response.status}`);
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function fhirPatientMap(payload: unknown) {
  const bundle = object(payload) as UpstreamBundle | null;
  if (!bundle || bundle.resourceType !== 'Bundle' || bundle.type !== 'searchset' || !Array.isArray(bundle.entry)) throw new Error('FHIR Patient response was not a searchset Bundle');
  const patients = new Map<string, DoctorViewPatient>();
  for (const entry of bundle.entry) {
    const resource = object(entry?.resource);
    if (!resource || resource.resourceType !== 'Patient') continue;
    const id = stringValue(resource.id);
    if (!id) continue;
    const names = arrayValue(resource.name).map(object).filter((name): name is JsonObject => Boolean(name));
    const name = names[0];
    const given = arrayValue(name?.given).map(stringValue).filter((value): value is string => Boolean(value));
    const family = stringValue(name?.family);
    const displayName = [...given, family].filter(Boolean).join(' ') || 'Patient name unavailable';
    const birthDate = stringValue(resource.birthDate);
    const identifiers = arrayValue(resource.identifier).map(object).filter((identifier): identifier is JsonObject => Boolean(identifier));
    const mrn = identifiers.map((identifier) => stringValue(identifier.value)).find(Boolean);
    patients.set(id, { displayName, birthDate, age: ageFromBirthDate(birthDate), mrn, sourceSystem: 'FHIR', sourceId: id });
  }
  return patients;
}

function patientReference(fhirPatients: Map<string, DoctorViewPatient>, fhirId: string | undefined): DoctorViewPatient {
  if (fhirId && fhirPatients.has(fhirId)) return fhirPatients.get(fhirId)!;
  return { displayName: 'Patient record unavailable', sourceSystem: 'FHIR', sourceId: fhirId || 'unresolved' };
}

function localPatientReference(patient: Patient): DoctorViewPatient {
  const recentResult = patient.labResults?.slice().sort((left, right) => Date.parse(right.date) - Date.parse(left.date))[0];
  const openTasks = patient.clinicalTasks?.filter((task) => !['completed', 'cancelled', 'entered-in-error'].includes((task.status || '').toLowerCase().replace(/[\s_]+/g, '-'))).length || 0;
  return { displayName: patient.name, birthDate: patient.dob, age: patient.age, mrn: patient.mrn, sourceSystem: 'Local EHR', sourceId: patient.id, localPatientId: patient.id, chartHref: `/dashboard/records/${encodeURIComponent(patient.id)}`, clinicalContext: { allergies: patient.allergies || [], conditions: patient.conditions || [], medications: (patient.medications || []).filter((medication) => !/(inactive|stopped|discontinued)/i.test(medication.status || '')).map((medication) => `${medication.name}${medication.dose ? ` ${medication.dose}` : ''}`), ...(recentResult ? { recentResult: `${recentResult.name}: ${recentResult.result}${recentResult.unit ? ` ${recentResult.unit}` : ''}` } : {}), openTasks, recentDocuments: patient.documents?.length || 0, riskLevel: patient.riskLevel } };
}

function parseVisits(payload: unknown, fhirPatients: Map<string, DoctorViewPatient>): DoctorViewVisit[] {
  if (!Array.isArray(payload)) throw new Error('cardiology visit response was not an array');
  const now = Date.now();
  return payload.map(object).filter((visit): visit is JsonObject => Boolean(visit)).flatMap((visit) => {
    const id = stringValue(field(visit, 'ID', 'id'));
    if (!id) return [];
    const encounterId = stringValue(field(visit, 'EncounterID', 'encounterId'));
    const patientId = stringValue(field(visit, 'PatientID', 'patientId'));
    const arrivedAt = asIso(field(visit, 'ArrivedAt', 'arrivedAt'));
    const stateEnteredAt = asIso(field(visit, 'StateEnteredAt', 'stateEnteredAt'));
    const updatedAt = asIso(field(visit, 'UpdatedAt', 'updatedAt'));
    const ageStart = Date.parse(arrivedAt || stateEnteredAt || updatedAt || '');
    const calculatedWaitMinutes = Number.isFinite(ageStart) && ageStart <= now ? Math.max(0, Math.floor((now - ageStart) / 60000)) : undefined;
    const waitTimeStale = calculatedWaitMinutes !== undefined && calculatedWaitMinutes > 24 * 60;
    const waitMinutes = waitTimeStale ? undefined : calculatedWaitMinutes;
    const patient = patientReference(fhirPatients, patientId);
    return [{ id, encounterId, appointmentId: stringValue(field(visit, 'AppointmentID', 'appointmentId')), patient, state: normalizeState(field(visit, 'CurrentState', 'currentState')), visitType: stringValue(field(visit, 'VisitType', 'visitType')), priority: priorityFromValue(field(visit, 'Priority', 'priority')), chiefComplaint: stringValue(field(visit, 'ChiefComplaint', 'chiefComplaint')), room: stringValue(field(visit, 'CurrentRoomID', 'currentRoomId')), arrivedAt, stateEnteredAt, updatedAt, waitMinutes, waitTimeStale, sourceHref: encounterId ? `/doctor/health-records/${encodeURIComponent(encounterId)}` : undefined }];
  }).sort((left, right) => {
    const priorityDelta = ['urgent', 'high', 'normal', 'low'].indexOf(left.priority) - ['urgent', 'high', 'normal', 'low'].indexOf(right.priority);
    return priorityDelta || (Date.parse(left.stateEnteredAt || '') || Infinity) - (Date.parse(right.stateEnteredAt || '') || Infinity);
  });
}

function parseQueueItems(payload: unknown, queueName: string, fhirPatients: Map<string, DoctorViewPatient>): DoctorViewQueueItem[] {
  if (!Array.isArray(payload)) throw new Error(`cardiology ${queueName} response was not an array`);
  return payload.map(object).filter((item): item is JsonObject => Boolean(item)).flatMap((item) => {
    const id = stringValue(field(item, 'ID', 'id'));
    if (!id) return [];
    const encounterId = stringValue(field(item, 'EncounterID', 'encounterId'));
    const patientId = stringValue(field(item, 'PatientID', 'patientId'));
    return [{ id, queueName: stringValue(field(item, 'QueueName', 'queueName')) || queueName, patient: patientReference(fhirPatients, patientId), title: stringValue(field(item, 'Title', 'title')) || 'Clinical work item', description: stringValue(field(item, 'Description', 'description')), priority: priorityFromValue(field(item, 'Priority', 'priority')), status: stringValue(field(item, 'Status', 'status')) || 'UNKNOWN', dueAt: asIso(field(item, 'DueAt', 'dueAt')), createdAt: asIso(field(item, 'CreatedAt', 'createdAt')), sourceHref: encounterId ? `/doctor/health-records/${encodeURIComponent(encounterId)}` : undefined }];
  });
}

function parseAppointments(payload: unknown, fhirPatients: Map<string, DoctorViewPatient>, timeZone: string, now: Date): DoctorViewScheduleItem[] {
  const bundle = object(payload) as UpstreamBundle | null;
  if (!bundle || bundle.resourceType !== 'Bundle' || bundle.type !== 'searchset' || !Array.isArray(bundle.entry)) throw new Error('FHIR Appointment response was not a searchset Bundle');
  const today = localDateKey(now, timeZone);
  return bundle.entry.map((entry) => object(entry?.resource)).filter((resource): resource is JsonObject => Boolean(resource)).flatMap((appointment) => {
    const id = stringValue(appointment.id);
    const start = asIso(appointment.start);
    if (!id || !start || localDateKey(new Date(start), timeZone) !== today) return [];
    const participants = arrayValue(appointment.participant).map(object).filter((participant): participant is JsonObject => Boolean(participant));
    const patientReferenceValue = participants.map((participant) => object(participant.actor)).map((actor) => stringValue(actor?.reference)).find((reference) => reference?.startsWith('Patient/'));
    const fhirPatientId = patientReferenceValue?.slice('Patient/'.length);
    const appointmentPatient = patientReference(fhirPatients, fhirPatientId);
    return [{ id, patient: appointmentPatient, start, end: asIso(appointment.end), status: stringValue(appointment.status) || 'unknown', visitType: stringValue(appointment.serviceType) || undefined, description: stringValue(appointment.description), sourceHref: `/doctor/appointments?appointmentId=${encodeURIComponent(id)}` }];
  }).sort((left, right) => Date.parse(left.start) - Date.parse(right.start));
}

function countStates(states: unknown, names: string[]) {
  const record = object(states);
  if (!record) return null;
  return names.reduce((sum, name) => sum + (numberValue(record[name]) || 0), 0);
}

async function buildLocalActions(actorId: string, actorName: string, actorRole: string): Promise<{ buckets: DoctorViewActionBucket[]; work: DoctorViewQueueItem[]; patients: DoctorViewPatient[]; source: DoctorViewSourceHealth }> {
  const source = sourceHealth('Local EHR stores', 'ready');
  const actor = { id: actorId, name: actorName, role: actorRole };
  const accessiblePatients = mockPatients.filter((patient) => canAccessTaskPatient(patient.id, actor));
  const localPatients = accessiblePatients.map(localPatientReference);
  const noteResults = await Promise.all(accessiblePatients.map(async (patient) => ({ patient, notes: await listNotes(patient.id, patient) })));
  const taskResults = await Promise.all(accessiblePatients.map(async (patient) => ({ patient, tasks: await listTasks(patient.id) })));
  const documentResults = await Promise.all(accessiblePatients.map(async (patient) => ({ patient, documents: await listDocuments(patient.id, patient) })));
  const notes: DoctorViewActionItem[] = noteResults.flatMap(({ patient, notes }) => notes.filter((note) => ['draft', 'pending-signature'].includes(note.status)).map((note) => ({ id: `note:${patient.id}:${note.id}`, category: 'unsigned-notes', patient: localPatientReference(patient), title: `${note.type} note`, subtitle: `Last updated ${new Date(note.updatedAt).toLocaleDateString()}`, priority: 'normal', status: note.status, sourceHref: `/dashboard/records/${encodeURIComponent(patient.id)}/doctor-notes?noteId=${encodeURIComponent(note.id)}`, sourceSystem: 'Local EHR notes' })));
  const documents: DoctorViewActionItem[] = documentResults.flatMap(({ patient, documents }) => documents.filter((document) => ['needs-review', 'awaiting-signature', 'failed'].includes(document.status)).map((document) => ({ id: `document:${patient.id}:${document.id}`, category: 'documents', patient: localPatientReference(patient), title: document.title, subtitle: `${document.type} · ${document.status}`, priority: document.status === 'failed' ? 'high' : 'normal', status: document.status, sourceHref: `/dashboard/records/${encodeURIComponent(patient.id)}/documents?documentId=${encodeURIComponent(document.id)}`, sourceSystem: 'Local EHR documents' })));
  const openTasks = taskResults.flatMap(({ patient, tasks }) => tasks.filter((task) => !['completed', 'cancelled', 'entered-in-error'].includes(task.status || '') && (!task.assignee || task.assignee.id === actorId || task.assignee.name?.toLowerCase() === actorName.toLowerCase())).map((task) => ({ id: `task:${patient.id}:${task.id}`, category: 'open-work' as const, patient: localPatientReference(patient), title: task.title, subtitle: task.category, priority: priorityFromValue(task.priority), status: task.status || 'requested', dueAt: asIso(task.dueDate), sourceHref: `/dashboard/records/${encodeURIComponent(patient.id)}/tasks?taskId=${encodeURIComponent(task.id)}`, sourceSystem: 'Local EHR tasks' })));
  const labActions: DoctorViewActionItem[] = accessiblePatients.flatMap((patient) => (patient.labResults || []).flatMap((result) => {
    const category: DoctorViewActionCategory | null = /^(hh|ll|critical)/i.test(result.interpretation || '') ? 'critical-results' : /^(h|l|high|low|abnormal)/i.test(result.interpretation || '') ? 'abnormal-results' : null;
    if (!category) return [];
    return [{ id: `result:${patient.id}:${result.id}`, category, patient: localPatientReference(patient), title: result.name, subtitle: `${result.result}${result.unit ? ` ${result.unit}` : ''} · ${result.interpretation}`, priority: category === 'critical-results' ? 'critical' : 'high', status: result.status || 'final', dueAt: asIso(result.date), sourceHref: `/dashboard/records/${encodeURIComponent(patient.id)}/labs/${encodeURIComponent(result.id)}`, sourceSystem: 'Local EHR results' }];
  }));
  const unavailable = (category: DoctorViewActionCategory, label: string, description: string, error: string): DoctorViewActionBucket => ({ category, label, description, count: null, available: false, source: sourceHealth('No authoritative source configured', 'unavailable', error), items: [] });
  const available = (category: DoctorViewActionCategory, label: string, description: string, items: DoctorViewActionItem[]): DoctorViewActionBucket => ({ category, label, description, count: items.length, available: true, source, items });
  const buckets = [available('critical-results', 'Critical Results', 'Explicitly classified critical results requiring review.', labActions.filter((item) => item.category === 'critical-results')), available('abnormal-results', 'Abnormal Results', 'Results with an explicit abnormal interpretation.', labActions.filter((item) => item.category === 'abnormal-results')), available('unsigned-notes', 'Unsigned Notes', 'Notes still in draft or pending signature.', notes), unavailable('refills', 'Refill Requests', 'Medication refill worklist.', 'No authoritative refill worklist is configured.'), unavailable('orders', 'Orders Awaiting Signature', 'Orders requiring clinician signature.', 'No authoritative order-signature worklist is configured.'), available('documents', 'Documents Needing Review', 'Documents with a review or signature state.', documents), available('open-work', 'Open Care Work', 'Open clinical tasks assigned to the current clinician.', openTasks)];
  const work: DoctorViewQueueItem[] = openTasks.map((item) => ({ id: item.id, queueName: 'LOCAL_CLINICAL_WORK', patient: item.patient, title: item.title, description: item.subtitle, priority: item.priority, status: item.status, dueAt: item.dueAt, sourceHref: item.sourceHref }));
  return { buckets, work, patients: localPatients, source };
}

export async function getDoctorViewSnapshot(input: { actorId: string; actorName: string; actorRole: string; timeZone?: string; clinic?: string; specialty?: string }): Promise<DoctorViewSnapshot> {
  const timeZone = input.timeZone || process.env.DOCTOR_VIEW_TIME_ZONE || 'America/Toronto';
  const clinic = input.clinic || process.env.DOCTOR_VIEW_CLINIC || 'Clinical workspace';
  const specialty = input.specialty || process.env.DOCTOR_VIEW_SPECIALTY || 'Cardiology';
  const cardiologyBase = (process.env.CARDIOLOGY_API_URL || 'http://localhost:8081/cardiology').replace(/\/$/, '');
  const fhirBase = (process.env.FHIR_BASE_URL || process.env.NEXT_PUBLIC_FHIR_API_URL || 'http://localhost:8081/fhir').replace(/\/$/, '');
  const token = process.env.CARDIOLOGY_SERVICE_TOKEN;
  const now = new Date();
  const [dashboardResult, visitsResult, physicianQueueResult, resultsQueueResult, roomsResult, patientsResult, appointmentsResult, localResult, sharedWorkResult] = await Promise.allSettled([
    fetchJson(`${cardiologyBase}/dashboard`, 'Cardiology dashboard', token),
    fetchJson(`${cardiologyBase}/visits`, 'Cardiology visits', token),
    fetchJson(`${cardiologyBase}/queues/PHYSICIAN_CONSULT`, 'Physician queue', token),
    fetchJson(`${cardiologyBase}/queues/RESULTS_REVIEW`, 'Results queue', token),
    fetchJson(`${cardiologyBase}/rooms`, 'Cardiology rooms', token),
    fetchJson(`${fhirBase}/R4/Patient?_count=100`, 'FHIR patients', token),
    fetchJson(`${fhirBase}/R4/Appointment?_count=100`, 'FHIR appointments', token),
    buildLocalActions(input.actorId, input.actorName, input.actorRole),
    getDoctorWorkSnapshot(input.actorId, input.actorName, input.actorRole),
  ]);
  const fulfilled = <T,>(result: PromiseSettledResult<T>): result is PromiseFulfilledResult<T> => result.status === 'fulfilled';
  const healthFor = (name: string, result: PromiseSettledResult<unknown>) => result.status === 'fulfilled' ? sourceHealth(name, 'ready') : sourceHealth(name, 'unavailable', result.reason instanceof Error ? result.reason.message : 'Source unavailable');
  const fhirHealth = healthFor('FHIR R4', patientsResult);
  const cardiologyHealth = healthFor('Cardiology service', dashboardResult);
  const patientMap = fulfilled(patientsResult) ? fhirPatientMap(patientsResult.value) : new Map<string, DoctorViewPatient>();
  const visits = fulfilled(visitsResult) ? parseVisits(visitsResult.value, patientMap) : [];
  const physicianQueue = fulfilled(physicianQueueResult) ? parseQueueItems(physicianQueueResult.value, 'PHYSICIAN_CONSULT', patientMap) : [];
  const resultsQueue = fulfilled(resultsQueueResult) ? parseQueueItems(resultsQueueResult.value, 'RESULTS_REVIEW', patientMap) : [];
  const nextPatient = visits.find((visit) => ['PHYSICIAN_PENDING', 'IN_EXAM_ROOM', 'IN_WAITING_ROOM', 'NURSING_ASSESSMENT', 'PATIENT_ARRIVED'].includes(visit.state)) || null;
  const alertAcknowledgements = await listAlertAcknowledgements();
  const acknowledgementsByKey = new Map(alertAcknowledgements.map((acknowledgement) => [acknowledgement.key, acknowledgement]));
  const alerts: DoctorViewAlert[] = visits.filter((visit) => ['urgent', 'high'].includes(visit.priority) && visit.patient.sourceId !== 'unresolved').map((visit) => {
    const id = `cardiology-visit:${visit.encounterId || visit.id}`;
    const acknowledgement = acknowledgementsByKey.get(`Cardiology service:${id}`);
    return { id, patient: visit.patient, title: visit.priority === 'urgent' ? 'Urgent patient flow' : 'High-priority patient flow', reason: visit.chiefComplaint || `Visit is in ${visit.state.replace(/_/g, ' ').toLowerCase()}.`, severity: visit.priority === 'urgent' ? 'urgent' : 'high', status: acknowledgement ? 'acknowledged' : 'unacknowledged', triggeredAt: visit.stateEnteredAt || visit.updatedAt || visit.arrivedAt || new Date().toISOString(), sourceSystem: 'Cardiology service', sourceHref: visit.sourceHref, context: 'Operational visit priority from the cardiology workflow. This is not a diagnostic result.', ...(acknowledgement ? { acknowledgedAt: acknowledgement.acknowledgedAt, acknowledgedBy: acknowledgement.acknowledgedBy.name } : {}) };
  });
  const local = fulfilled(localResult) ? localResult.value : { buckets: [], work: [], patients: [], source: sourceHealth('Local EHR stores', 'unavailable', 'Local work sources unavailable.') };
  const sharedWork = fulfilled(sharedWorkResult) ? sharedWorkResult.value : null;
  const dashboard = fulfilled(dashboardResult) ? object(dashboardResult.value) : null;
  const visitsByState = object(dashboard?.visitsByState);
  const schedule = fulfilled(appointmentsResult) ? parseAppointments(appointmentsResult.value, patientMap, timeZone, now) : [];
  const roomItems = fulfilled(roomsResult) && Array.isArray(roomsResult.value) ? roomsResult.value.map(object).filter((room): room is JsonObject => Boolean(room)).map((room) => {
    const occupants = arrayValue(field(room, 'Occupants', 'occupants'));
    return { name: stringValue(field(room, 'Name', 'name')) || 'Room', roomType: stringValue(field(room, 'RoomType', 'roomType')), occupancy: occupants.length, capacity: numberValue(field(room, 'Capacity', 'capacity')), available: occupants.length === 0 };
  }) : [];
  const completedStates = ['CONSULTATION_COMPLETE', 'CHECKOUT_COMPLETE', 'DISCHARGED', 'PROCEDURE_COMPLETE'];
  const waitingStates = ['PATIENT_ARRIVED', 'CHECKING_IN', 'CHECKED_IN', 'IN_WAITING_ROOM', 'NURSING_ASSESSMENT', 'IN_EXAM_ROOM', 'PHYSICIAN_PENDING'];
  const checkedInStates = ['CHECKED_IN', 'IN_WAITING_ROOM', 'NURSING_ASSESSMENT', 'IN_EXAM_ROOM', 'PHYSICIAN_PENDING', 'PHYSICIAN_WITH_PATIENT', 'ORDERS_PLACED', 'PROCEDURE_QUEUED', 'IN_PROCEDURE', 'PROCEDURE_COMPLETE', 'RESULTS_READY', 'RESULTS_REVIEW'];
  const seenStates = ['PHYSICIAN_WITH_PATIENT', 'ORDERS_PLACED', 'PROCEDURE_QUEUED', 'IN_PROCEDURE', 'PROCEDURE_COMPLETE', 'RESULTS_READY', 'RESULTS_REVIEW', ...completedStates];
  const pulse = { patientsToday: numberValue(field(dashboard || {}, 'totalVisitsToday', 'TotalVisitsToday')) ?? (visits.length || null), checkedIn: countStates(visitsByState, checkedInStates), seen: countStates(visitsByState, seenStates), waitingNow: visits.filter((visit) => waitingStates.includes(visit.state)).length || (countStates(visitsByState, waitingStates) ?? null), longestWaitMinutes: visits.reduce((max, visit) => Math.max(max, visit.waitMinutes || 0), 0) || null, urgentAttention: alerts.length, unacknowledgedUrgent: alerts.filter((alert) => alert.status === 'unacknowledged').length, completedToday: countStates(visitsByState, completedStates), source: cardiologyHealth };
  const sharedActionItems = sharedWork?.items.map(sharedWorkActionItem) || [];
  const sharedClinicalWork = sharedWork?.items.map(sharedWorkQueueItem) || [];
  const sharedBuckets = new Map<DoctorViewActionCategory, DoctorViewActionItem[]>();
  for (const item of sharedActionItems) sharedBuckets.set(item.category, [...(sharedBuckets.get(item.category) || []), item]);
  const messageItems = sharedWork?.messages.conversations.filter((conversation) => conversation.unreadCount > 0 || conversation.requiresFollowUp).map((conversation) => ({ id: `message:${conversation.id}`, category: 'messages' as const, patient: { displayName: conversation.patientName || conversation.participant.name, mrn: 'Not documented', sourceSystem: 'Local EHR' as const, sourceId: conversation.patientId || conversation.id, localPatientId: conversation.patientId, chartHref: conversation.patientId ? `/dashboard/records/${encodeURIComponent(conversation.patientId)}` : undefined }, title: conversation.subject, subtitle: conversation.preview, priority: 'normal' as const, status: conversation.requiresFollowUp ? 'follow-up' : 'unread', dueAt: conversation.lastMessageAt, sourceHref: `/dashboard/messages?conversation=${encodeURIComponent(conversation.id)}`, sourceSystem: 'Secure messages' }));
  const messageBucket: DoctorViewActionBucket = { category: 'messages', label: 'Unread Clinical Messages', description: 'Secure messages requiring response or follow-up.', count: messageItems?.length || 0, available: true, source: sourceHealth('Secure message store', 'ready'), items: messageItems || [] };
  const actionCenter = [...local.buckets.map((bucket) => sharedBuckets.has(bucket.category) ? { ...bucket, count: sharedBuckets.get(bucket.category)!.length, items: sharedBuckets.get(bucket.category)! } : bucket), messageBucket].sort((left, right) => {
    const order: DoctorViewActionCategory[] = ['critical-results', 'abnormal-results', 'orders', 'unsigned-notes', 'messages', 'documents', 'open-work', 'refills'];
    return order.indexOf(left.category) - order.indexOf(right.category);
  });
  const allSources = [cardiologyHealth, fhirHealth, healthFor('FHIR appointments', appointmentsResult), healthFor('Cardiology queues', physicianQueueResult), healthFor('Cardiology rooms', roomsResult), local.source, ...(sharedWork ? [sourceHealth('Shared doctor work read model', 'ready')] : [])];
  const clinicalWorkItems = [...physicianQueue, ...resultsQueue, ...sharedClinicalWork];
  return { generatedAt: new Date().toISOString(), actor: { id: input.actorId, name: input.actorName, role: input.actorRole, specialty, clinic, timeZone }, clinicPulse: pulse, urgentAttention: { items: alerts, source: cardiologyHealth }, nextPatient: { item: nextPatient, source: cardiologyHealth }, schedule: { date: formatLocalDate(now, timeZone), items: schedule, source: healthFor('FHIR appointments', appointmentsResult) }, clinicalWork: { items: clinicalWorkItems, source: sharedWork ? sourceHealth('Shared doctor work read model', 'ready') : physicianQueueResult.status === 'fulfilled' || resultsQueueResult.status === 'fulfilled' ? cardiologyHealth : local.source }, rooms: roomItems, actionCenter, patients: [...Array.from(patientMap.values()), ...local.patients], sources: allSources };
}

export function sourceErrorMessage(source: DoctorViewSourceHealth) {
  return source.error || `${source.source} is unavailable.`;
}

export function doctorViewTodayLabel(timeZone = process.env.DOCTOR_VIEW_TIME_ZONE || 'America/Toronto') {
  return formatLocalDate(new Date(), timeZone);
}

export function localPatientFromId(id: string) {
  const patient = getPatientById(id);
  return patient ? localPatientReference(patient) : null;
}

export type DoctorViewLocalDocument = PatientDocument;
export type DoctorViewLocalNote = DoctorNote;
export type DoctorViewLocalTask = ClinicalTask;
