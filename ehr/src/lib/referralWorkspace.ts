import { getPatientById } from '@/app/dashboard/records/mockPatients';
import { canAccessTaskPatient } from '@/lib/doctorWorkStore';
import type { DoctorWorkspaceActor } from '@/lib/doctorWorkspaceAuth';
import { getCanonicalPatientDirectory } from '@/lib/patientDirectory';
import { getReferral, listReferrals, type Referral, type ReferralBusinessState, type ReferralPriority } from '@/lib/referralStore';
import { isReferralTerminal, nextReferralTransition, referralAwaitingSpecialist, referralNeedsAction, referralPriorityRank } from '@/lib/referralWorkflow';

export type ReferralFilter = 'all' | 'needs-action' | 'urgent' | 'pending' | 'awaiting-specialist' | 'scheduled' | 'overdue' | 'completed';
export type ReferralSort = 'most-urgent' | 'newest' | 'oldest' | 'recently-updated' | 'patient' | 'due';

export type ReferralPatientSummary = {
  id: string;
  name: string;
  mrn: string;
  birthDate: string;
  age: number | null;
  gender?: string;
  riskLevel?: 'Low' | 'Moderate' | 'High';
  href: string;
};

export type ReferralLinkedRecord = {
  type: string;
  id: string;
  display: string;
  href?: string;
};

export type ReferralWorklistItem = {
  referralId: string;
  patient: ReferralPatientSummary;
  referralReason: string;
  serviceCode?: string;
  specialty: string;
  destination: string;
  priority: ReferralPriority;
  status: ReferralBusinessState;
  fhirStatus: string;
  createdAt: string;
  updatedAt?: string;
  dueAt?: string;
  scheduledAt?: string;
  nextAction?: { action: string; label: string };
  requester: string;
  performer?: string;
  note?: string;
  events: NonNullable<Referral['events']>;
  linkedRecords: ReferralLinkedRecord[];
  version: number;
};

export type ReferralWorkspaceSnapshot = {
  generatedAt: string;
  items: ReferralWorklistItem[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  metrics: {
    open: number;
    needsAction: number;
    urgent: number;
    awaitingSpecialist: number;
    patientsWithReferrals: number;
    overdue: number;
  };
  patients: ReferralPatientSummary[];
  source: { state: 'ready' | 'unavailable'; label: string; error?: string };
};

export type ReferralWorkspaceFilters = {
  q?: string;
  filter?: ReferralFilter;
  sort?: ReferralSort;
  patientId?: string;
  businessState?: ReferralBusinessState;
  page?: number;
  pageSize?: number;
};

const PENDING_STATES = new Set<ReferralBusinessState>(['Routing', 'Delivered', 'Received', 'Waitlisted', 'Scheduling']);
const COMPLETED_STATES = new Set<ReferralBusinessState>(['ConsultCompleted', 'OutcomeReceived', 'Closed']);

function timestamp(value?: string) {
  const parsed = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

function isOverdue(referral: Referral, now: Date) {
  return Boolean(referral.dueAt && !isReferralTerminal(referral.businessState) && timestamp(referral.dueAt) < now.getTime());
}

function ageFromBirthDate(birthDate: string, now: Date) {
  const parsed = Date.parse(`${birthDate}T12:00:00`);
  if (!Number.isFinite(parsed)) return null;
  const birth = new Date(parsed);
  let age = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age -= 1;
  return age >= 0 ? age : null;
}

function linkedRecordHref(patientId: string, type: string, id: string) {
  const patientHref = `/dashboard/records/${encodeURIComponent(patientId)}`;
  if (type === 'Observation' || type === 'DiagnosticReport') return `${patientHref}/labs?selected=${encodeURIComponent(id)}`;
  if (type === 'DocumentReference') return `${patientHref}/documents?documentId=${encodeURIComponent(id)}`;
  if (type === 'Communication') return `/communication?conversationId=${encodeURIComponent(id)}`;
  if (type === 'Appointment') return `/dashboard/appointments/${encodeURIComponent(id)}`;
  if (type === 'Encounter') return `/dashboard/encounters/${encodeURIComponent(id)}`;
  if (type === 'MedicationRequest' || type === 'MedicationStatement') return `${patientHref}/medications`;
  if (type === 'Condition' || type === 'HealthConcern') return `${patientHref}/conditions`;
  return undefined;
}

function matchesQuery(item: ReferralWorklistItem, query?: string) {
  const normalized = query?.trim().toLowerCase();
  if (!normalized) return true;
  return [item.referralId, item.patient.name, item.patient.mrn, item.patient.birthDate, item.referralReason, item.serviceCode, item.specialty, item.destination, item.requester, item.performer, ...item.linkedRecords.map((record) => record.display)].filter(Boolean).join(' ').toLowerCase().includes(normalized);
}

function matchesFilter(referral: Referral, filter: ReferralFilter, now: Date) {
  if (filter === 'all') return true;
  if (filter === 'needs-action') return referralNeedsAction(referral);
  if (filter === 'urgent') return referral.priority === 'urgent';
  if (filter === 'pending') return PENDING_STATES.has(referral.businessState);
  if (filter === 'awaiting-specialist') return referralAwaitingSpecialist(referral);
  if (filter === 'scheduled') return referral.businessState === 'Scheduled';
  if (filter === 'overdue') return isOverdue(referral, now);
  return COMPLETED_STATES.has(referral.businessState);
}

function sortItems(items: ReferralWorklistItem[], sort: ReferralSort, now: Date) {
  return items.sort((left, right) => {
    const leftReferral: Referral = { id: left.referralId, patientId: left.patient.id, subject: left.referralReason, businessState: left.status, priority: left.priority, createdAt: left.createdAt, dueAt: left.dueAt };
    const rightReferral: Referral = { id: right.referralId, patientId: right.patient.id, subject: right.referralReason, businessState: right.status, priority: right.priority, createdAt: right.createdAt, dueAt: right.dueAt };
    if (sort === 'newest') return timestamp(right.createdAt) - timestamp(left.createdAt);
    if (sort === 'oldest') return timestamp(left.createdAt) - timestamp(right.createdAt);
    if (sort === 'recently-updated') return timestamp(right.updatedAt || right.createdAt) - timestamp(left.updatedAt || left.createdAt);
    if (sort === 'patient') return left.patient.name.localeCompare(right.patient.name);
    if (sort === 'due') return (timestamp(left.dueAt) || Number.MAX_SAFE_INTEGER) - (timestamp(right.dueAt) || Number.MAX_SAFE_INTEGER);
    const urgency = referralPriorityRank(left.priority) - referralPriorityRank(right.priority);
    if (urgency !== 0) return urgency;
    const overdue = Number(isOverdue(rightReferral, now)) - Number(isOverdue(leftReferral, now));
    if (overdue !== 0) return overdue;
    const action = Number(referralNeedsAction(rightReferral)) - Number(referralNeedsAction(leftReferral));
    if (action !== 0) return action;
    return timestamp(left.dueAt) - timestamp(right.dueAt) || timestamp(right.createdAt) - timestamp(left.createdAt);
  });
}

function referralItem(referral: Referral, patient: ReferralPatientSummary): ReferralWorklistItem {
  const next = nextReferralTransition(referral.businessState);
  return {
    referralId: referral.id,
    patient,
    referralReason: referral.subject || referral.serviceCode || 'Referral reason not specified',
    serviceCode: referral.serviceCode,
    specialty: referral.specialty || 'Specialty not specified',
    destination: referral.destination || referral.performer?.name || 'Destination not specified',
    priority: referral.priority || 'routine',
    status: referral.businessState,
    fhirStatus: referral.status || 'active',
    createdAt: referral.authoredOn || referral.createdAt,
    updatedAt: referral.updatedAt,
    dueAt: referral.dueAt,
    scheduledAt: referral.scheduledAt,
    nextAction: next ? { action: next.action, label: next.label } : undefined,
    requester: referral.requester?.name || 'Requester not specified',
    performer: referral.performer?.name,
    note: referral.note,
    events: referral.events || [],
    linkedRecords: (referral.supportingInfo || []).map((record) => ({ type: record.type, id: record.id, display: record.display || `${record.type} ${record.id}`, href: linkedRecordHref(referral.patientId, record.type, record.id) })),
    version: referral.version || 1,
  };
}

export async function getReferralWorkspace(actor: DoctorWorkspaceActor, filters: ReferralWorkspaceFilters = {}, now = new Date()): Promise<ReferralWorkspaceSnapshot> {
  const directory = await getCanonicalPatientDirectory();
  if (directory.source.state !== 'ready') {
    return { generatedAt: now.toISOString(), items: [], total: 0, page: 1, pageSize: 25, pageCount: 1, metrics: { open: 0, needsAction: 0, urgent: 0, awaitingSpecialist: 0, patientsWithReferrals: 0, overdue: 0 }, patients: [], source: { state: 'unavailable', label: directory.source.label, error: directory.source.error } };
  }

  const patients = directory.patients.filter((candidate) => canAccessTaskPatient(candidate.id, actor)).map((candidate) => {
    const patient = getPatientById(candidate.id);
    return {
      id: candidate.id,
      name: candidate.name,
      mrn: candidate.mrn,
      birthDate: candidate.birthDate,
      age: ageFromBirthDate(candidate.birthDate, now),
      gender: candidate.gender,
      riskLevel: patient?.riskLevel,
      href: `/dashboard/records/${encodeURIComponent(candidate.id)}`,
    };
  });
  const patientById = new Map(patients.map((patient) => [patient.id, patient]));
  const authorized = (await listReferrals()).filter((referral) => patientById.has(referral.patientId));
  const metrics = {
    open: authorized.filter((referral) => !isReferralTerminal(referral.businessState)).length,
    needsAction: authorized.filter(referralNeedsAction).length,
    urgent: authorized.filter((referral) => referral.priority === 'urgent' && !isReferralTerminal(referral.businessState)).length,
    awaitingSpecialist: authorized.filter(referralAwaitingSpecialist).length,
    patientsWithReferrals: new Set(authorized.filter((referral) => !isReferralTerminal(referral.businessState)).map((referral) => referral.patientId)).size,
    overdue: authorized.filter((referral) => isOverdue(referral, now)).length,
  };
  const visible = authorized.filter((referral) => !filters.patientId || referral.patientId === filters.patientId).filter((referral) => !filters.businessState || referral.businessState === filters.businessState).filter((referral) => matchesFilter(referral, filters.filter || 'all', now)).map((referral) => referralItem(referral, patientById.get(referral.patientId)!)).filter((item) => matchesQuery(item, filters.q));
  sortItems(visible, filters.sort || 'most-urgent', now);
  const pageSize = Math.min(Math.max(filters.pageSize || 25, 1), 100);
  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  const page = Math.min(Math.max(filters.page || 1, 1), pageCount);
  return { generatedAt: now.toISOString(), items: visible.slice((page - 1) * pageSize, page * pageSize), total: visible.length, page, pageSize, pageCount, metrics, patients, source: { state: 'ready', label: 'Roshi referral registry' } };
}

export async function getAuthorizedReferral(referralId: string, actor: DoctorWorkspaceActor) {
  const referral = await getReferral(referralId);
  if (!referral || !canAccessTaskPatient(referral.patientId, actor)) return null;
  return referral;
}
