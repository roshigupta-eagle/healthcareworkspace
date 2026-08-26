import { getMockPatients, type AppointmentRecord, type Patient } from '@/app/dashboard/records/mockPatients';

export type HealthRecordAttention = {
  kind: 'critical-alert' | 'result-review' | 'care-gap' | 'pending-lab' | 'document-review' | 'upcoming-appointment';
  label: string;
  detail: string;
};

export type HealthRecordAppointment = {
  id: string;
  date: string;
  type: string;
  status: string;
  doctor: string;
  location?: string;
};

export type HealthRecordPatientSummary = {
  patientId: string;
  displayName: string;
  preferredName?: string;
  mrn: string;
  birthDate: string;
  age: number;
  gender?: string;
  status: string;
  riskLevel?: Patient['riskLevel'];
  phone?: string;
  email?: string;
  primaryPhysician?: string;
  organization?: string;
  lastSeenAt?: string;
  nextAppointment?: HealthRecordAppointment;
  topConditions: string[];
  openWork: { total: number; labs: number; tasks: number; documents: number; careGaps: number };
  criticalAlerts: number;
  pendingLabs: number;
  upcomingAppointments: number;
  careGaps: number;
  attention?: HealthRecordAttention;
  updatedAt?: string;
  chartHref: string;
};

export type HealthRecordMetrics = {
  patients: number;
  upcomingAppointments: number;
  pendingLabs: number;
  criticalAlerts: number;
  careGaps: number;
};

export type HealthRecordFilters = {
  q?: string;
  status?: string;
  risk?: string;
  appointment?: 'upcoming';
  pendingLab?: 'pending';
  careGap?: 'open';
  attention?: 'needs-attention';
  criticalAlert?: 'critical';
  physician?: string;
  organization?: string;
  sort?: 'clinical-priority' | 'recently-updated' | 'name' | 'upcoming' | 'last-seen';
  page?: number;
  pageSize?: number;
};

export type HealthRecordsResponse = {
  data: HealthRecordPatientSummary[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  metrics: HealthRecordMetrics;
  availableFilters: { physicians: string[]; organizations: string[] };
};

export type HealthRecordQuickView = HealthRecordPatientSummary & {
  conditions: Array<{ name: string; status?: string; severity?: string }>;
  medications: Array<{ name: string; dose?: string; frequency?: string }>;
  allergies: string[];
  recentResults: Array<{ id: string; name: string; date: string; result: string; unit?: string; interpretation?: string }>;
  openCareGaps: Array<{ id: string; item: string; dueDate: string; status?: string }>;
  recentDocuments: Array<{ id: string; name: string; date: string; status?: string }>;
  openTasks: Array<{ id: string; title: string; dueDate: string; status?: string }>;
};

const OPEN_TASK_STATUSES = new Set(['planned', 'requested', 'accepted', 'in-progress', 'in progress', 'on-hold', 'open']);
const PENDING_LAB_STATUSES = new Set(['pending', 'ordered', 'in-progress', 'in progress', 'awaiting-result', 'awaiting result']);
const OPEN_GAP_STATUSES = new Set(['open', 'active', 'overdue', 'due-soon', 'due soon', 'recommended']);
const CLOSED_APPOINTMENT_STATUSES = new Set(['cancelled', 'canceled', 'completed', 'entered-in-error']);

function normalized(value?: string) {
  return (value || '').trim().toLowerCase();
}

function dateValue(value?: string) {
  if (!value) return undefined;
  const timestamp = Date.parse(value.replace(' ', 'T'));
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

function ageFromBirthDate(value: string, now: Date) {
  const timestamp = dateValue(value);
  if (timestamp === undefined) return 0;
  const birthDate = new Date(timestamp);
  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDelta = now.getMonth() - birthDate.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < birthDate.getDate())) age -= 1;
  return Math.max(age, 0);
}

function isFutureAppointment(appointment: AppointmentRecord, now: Date) {
  const timestamp = dateValue(appointment.date);
  return timestamp !== undefined && timestamp > now.getTime() && !CLOSED_APPOINTMENT_STATUSES.has(normalized(appointment.status));
}

function isWithinNextSevenDays(appointment: AppointmentRecord, now: Date) {
  const timestamp = dateValue(appointment.date);
  return timestamp !== undefined && timestamp > now.getTime() && timestamp <= now.getTime() + 7 * 86400000 && !CLOSED_APPOINTMENT_STATUSES.has(normalized(appointment.status));
}

function isCompletedVisit(status?: string) {
  return normalized(status) === 'completed';
}

function isOpenTask(status?: string) {
  return OPEN_TASK_STATUSES.has(normalized(status));
}

function isPendingLab(status?: string) {
  return PENDING_LAB_STATUSES.has(normalized(status));
}

function isOpenCareGap(status?: string) {
  return OPEN_GAP_STATUSES.has(normalized(status));
}

function resultSeverity(value?: string) {
  const text = normalized(value);
  if (/^(critical|panic|hh|ll)$/.test(text)) return 'critical';
  if (/^(high|low|abnormal|h|l)$/.test(text)) return 'abnormal';
  return undefined;
}

function appointmentSummary(appointment: AppointmentRecord): HealthRecordAppointment {
  return { id: appointment.id, date: appointment.date, type: appointment.type, status: appointment.status || 'Scheduled', doctor: appointment.doctor, location: appointment.location };
}

function patientSummary(patient: Patient, now: Date): HealthRecordPatientSummary {
  const appointments = (patient.upcoming || []).filter((appointment) => isFutureAppointment(appointment, now)).sort((left, right) => (dateValue(left.date) || Infinity) - (dateValue(right.date) || Infinity));
  const completedAppointments = (patient.upcoming || []).filter((appointment) => isCompletedVisit(appointment.status) && (dateValue(appointment.date) || 0) <= now.getTime());
  const completedHistory = (patient.history || []).filter((visit) => isCompletedVisit(visit.status) && (dateValue(visit.date) || 0) <= now.getTime());
  const lastSeenAt = [...completedAppointments.map((appointment) => appointment.date), ...completedHistory.map((visit) => visit.date)].sort((left, right) => (dateValue(right) || 0) - (dateValue(left) || 0))[0];
  const pendingLabs = [...(patient.tests || []).filter((test) => isPendingLab(test.status)), ...(patient.labResults || []).filter((result) => isPendingLab(result.status))].length;
  const reviewableResults = (patient.labResults || []).filter((result) => !result.reviewed && resultSeverity(result.interpretation));
  const criticalAlerts = (patient.labResults || []).filter((result) => resultSeverity(result.interpretation) === 'critical').length;
  const tasks = (patient.clinicalTasks || []).filter((task) => isOpenTask(task.status));
  const documents = (patient.documents || []).filter((document) => ['needs-review', 'awaiting-signature', 'failed'].includes(normalized(document.status)));
  const careGaps = (patient.careGaps || []).filter((gap) => isOpenCareGap(gap.status));
  const upcomingAppointments = appointments.filter((appointment) => isWithinNextSevenDays(appointment, now)).length;
  const openWork = { total: tasks.length + reviewableResults.length + documents.length + careGaps.length, labs: reviewableResults.length, tasks: tasks.length, documents: documents.length, careGaps: careGaps.length };
  const nextAppointment = appointments[0];
  let attention: HealthRecordAttention | undefined;
  if (criticalAlerts > 0) attention = { kind: 'critical-alert', label: 'Critical alert', detail: `${criticalAlerts} authoritative alert${criticalAlerts === 1 ? '' : 's'} requires attention` };
  else if (reviewableResults.length > 0) attention = { kind: 'result-review', label: 'Result review', detail: `${reviewableResults.length} result${reviewableResults.length === 1 ? '' : 's'} awaiting review` };
  else if (careGaps.some((gap) => ['overdue'].includes(normalized(gap.status)))) attention = { kind: 'care-gap', label: 'Care gap overdue', detail: 'Open care gap requires follow-up' };
  else if (pendingLabs > 0) attention = { kind: 'pending-lab', label: 'Pending lab', detail: `${pendingLabs} lab${pendingLabs === 1 ? '' : 's'} awaiting result or review` };
  else if (documents.length > 0) attention = { kind: 'document-review', label: 'Document review', detail: `${documents.length} document${documents.length === 1 ? '' : 's'} needs review` };
  else if (upcomingAppointments > 0) attention = { kind: 'upcoming-appointment', label: 'Upcoming visit', detail: `${upcomingAppointments} appointment${upcomingAppointments === 1 ? '' : 's'} in the next 7 days` };
  const organization = patient.organization || nextAppointment?.location;
  const latestResourceDate = [...(patient.labResults || []).map((result) => result.date), ...(patient.notes || []).map((note) => note.date), ...(patient.documents || []).map((document) => document.date)].sort((left, right) => (dateValue(right) || 0) - (dateValue(left) || 0))[0];
  return {
    patientId: patient.id,
    displayName: patient.name,
    preferredName: patient.preferredName,
    mrn: patient.mrn,
    birthDate: patient.dob,
    age: patient.age ?? ageFromBirthDate(patient.dob, now),
    gender: patient.gender,
    status: patient.status || 'Unknown',
    riskLevel: patient.riskLevel,
    phone: patient.contact?.phone,
    email: patient.contact?.email,
    primaryPhysician: patient.lastAttendingDoctor,
    organization,
    lastSeenAt,
    nextAppointment: nextAppointment ? appointmentSummary(nextAppointment) : undefined,
    topConditions: (patient.conditions || []).slice(0, 3),
    openWork,
    criticalAlerts,
    pendingLabs,
    upcomingAppointments,
    careGaps: careGaps.length,
    attention,
    updatedAt: patient.dataUpdatedAt || latestResourceDate,
    chartHref: `/dashboard/records/${encodeURIComponent(patient.id)}`,
  };
}

function matchesQuery(patient: HealthRecordPatientSummary, query: string) {
  if (!query) return true;
  const source = [patient.displayName, patient.mrn, patient.phone, patient.email].filter(Boolean).join(' ').toLowerCase();
  return source.includes(query.toLowerCase());
}

function sortPatients(items: HealthRecordPatientSummary[], sort: HealthRecordFilters['sort']) {
  return items.sort((left, right) => {
    if (sort === 'name') return left.displayName.localeCompare(right.displayName);
    if (sort === 'recently-updated') return (dateValue(right.updatedAt) || 0) - (dateValue(left.updatedAt) || 0);
    if (sort === 'upcoming') return (dateValue(left.nextAppointment?.date) || Infinity) - (dateValue(right.nextAppointment?.date) || Infinity);
    if (sort === 'last-seen') return (dateValue(right.lastSeenAt) || 0) - (dateValue(left.lastSeenAt) || 0);
    const priorityLeft = (left.criticalAlerts > 0 ? 4 : 0) + (left.riskLevel === 'High' ? 3 : left.riskLevel === 'Moderate' ? 2 : 0) + (left.attention ? 1 : 0);
    const priorityRight = (right.criticalAlerts > 0 ? 4 : 0) + (right.riskLevel === 'High' ? 3 : right.riskLevel === 'Moderate' ? 2 : 0) + (right.attention ? 1 : 0);
    return priorityRight - priorityLeft || right.openWork.total - left.openWork.total || left.displayName.localeCompare(right.displayName);
  });
}

export function getHealthRecordsResponse(filters: HealthRecordFilters = {}, now = new Date()): HealthRecordsResponse {
  const all = getMockPatients().map((patient) => patientSummary(patient, now));
  const filtered = all.filter((patient) => {
    if (!matchesQuery(patient, filters.q?.trim() || '')) return false;
    if (filters.status && normalized(patient.status) !== normalized(filters.status)) return false;
    if (filters.risk && normalized(patient.riskLevel) !== normalized(filters.risk)) return false;
    if (filters.appointment === 'upcoming' && patient.upcomingAppointments === 0) return false;
    if (filters.pendingLab === 'pending' && patient.pendingLabs === 0) return false;
    if (filters.careGap === 'open' && patient.careGaps === 0) return false;
    if (filters.attention === 'needs-attention' && !patient.attention) return false;
    if (filters.criticalAlert === 'critical' && patient.criticalAlerts === 0) return false;
    if (filters.physician && patient.primaryPhysician !== filters.physician) return false;
    if (filters.organization && patient.organization !== filters.organization) return false;
    return true;
  });
  const physicians = [...new Set(all.map((patient) => patient.primaryPhysician).filter((value): value is string => Boolean(value)))].sort();
  const organizations = [...new Set(all.map((patient) => patient.organization).filter((value): value is string => Boolean(value)))].sort();
  sortPatients(filtered, filters.sort || 'clinical-priority');
  const pageSize = Math.min(Math.max(filters.pageSize || 25, 1), 100);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(Math.max(filters.page || 1, 1), pageCount);
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);
  const metrics = {
    patients: filtered.filter((patient) => normalized(patient.status) === 'active').length,
    upcomingAppointments: filtered.reduce((total, patient) => total + patient.upcomingAppointments, 0),
    pendingLabs: filtered.reduce((total, patient) => total + patient.pendingLabs, 0),
    criticalAlerts: filtered.reduce((total, patient) => total + patient.criticalAlerts, 0),
    careGaps: filtered.reduce((total, patient) => total + patient.careGaps, 0),
  };
  return { data: pageItems, total: filtered.length, page, pageSize, pageCount, metrics, availableFilters: { physicians, organizations } };
}

export function getHealthRecordPatient(patientId: string, now = new Date()) {
  const patient = getMockPatients().find((candidate) => candidate.id === patientId);
  return patient ? patientSummary(patient, now) : null;
}

export function getHealthRecordQuickView(patientId: string, now = new Date()): HealthRecordQuickView | null {
  const patient = getMockPatients().find((candidate) => candidate.id === patientId);
  const summary = patient ? patientSummary(patient, now) : null;
  if (!patient || !summary) return null;
  return {
    ...summary,
    conditions: (patient.conditionDetails || patient.conditions?.map((name) => ({ name })) || []).slice(0, 3),
    medications: (patient.medications || []).filter((medication) => !/(inactive|stopped|discontinued)/i.test(medication.status || '')).slice(0, 4).map((medication) => ({ name: medication.name, dose: medication.dose, frequency: medication.freq })),
    allergies: patient.allergies || [],
    recentResults: (patient.labResults || []).slice().sort((left, right) => (dateValue(right.date) || 0) - (dateValue(left.date) || 0)).slice(0, 4).map((result) => ({ id: result.id, name: result.name, date: result.date, result: result.result, unit: result.unit, interpretation: result.interpretation })),
    openCareGaps: (patient.careGaps || []).filter((gap) => isOpenCareGap(gap.status)).slice(0, 4).map((gap) => ({ id: gap.id, item: gap.item, dueDate: gap.dueDate, status: gap.status })),
    recentDocuments: (patient.documents || []).slice().sort((left, right) => (dateValue(right.date) || 0) - (dateValue(left.date) || 0)).slice(0, 4).map((document) => ({ id: document.id, name: document.name, date: document.date, status: document.status })),
    openTasks: (patient.clinicalTasks || []).filter((task) => isOpenTask(task.status)).slice(0, 4).map((task) => ({ id: task.id, title: task.title, dueDate: task.dueDate, status: task.status })),
  };
}
