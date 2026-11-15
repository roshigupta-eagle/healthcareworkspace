import { getMockPatients, type Patient } from '@/app/dashboard/records/mockPatients';
import { getCommunicationHubSnapshot, type ConversationSummary } from '@/lib/clinicalCommunicationStore';
import { canAccessTaskPatient } from '@/lib/doctorWorkStore';
import { getOrderSnapshot, type ClinicalOrder } from '@/lib/orderStore';
import { getCanonicalPatientDirectory, type PatientDirectorySource } from '@/lib/patientDirectory';
import { listTasks } from '@/lib/tasksStore';
import type { ClinicalTask } from '@/types/clinicalTask';

export type LaboratoryActor = { id: string; name: string; role: string };
export type LaboratoryTab = 'patients' | 'results' | 'orders' | 'specimens';
export type LaboratoryFilter = 'all' | 'needs-review' | 'abnormal' | 'critical' | 'follow-up' | 'specimen-issue';
export type LaboratorySort = 'most-urgent' | 'newest' | 'updated' | 'name';
export type LaboratoryInterpretation = 'critical' | 'abnormal' | 'normal' | 'not-supplied';
export type LaboratoryReviewState = 'reviewed' | 'unreviewed' | 'not-applicable';
export type LaboratoryPatientState = 'critical' | 'needs-review' | 'abnormal' | 'follow-up' | 'specimen-issue' | 'normal';
export type LaboratorySourceState = 'ready' | 'partial' | 'unavailable' | 'not-reported';

export type LaboratoryDashboardFilters = {
  q?: string;
  filter?: LaboratoryFilter;
  sort?: LaboratorySort;
  page?: number;
  pageSize?: number;
};

export type LaboratoryPatient = {
  id: string;
  name: string;
  mrn: string;
  birthDate: string;
  age?: number;
  gender?: string;
  primaryClinician?: string;
  organization?: string;
  status: string;
  href: string;
};

export type LaboratoryResult = {
  id: string;
  patient: LaboratoryPatient;
  name: string;
  value: string;
  unit?: string;
  interpretation: string;
  interpretationState: LaboratoryInterpretation;
  reportStatus: string;
  reviewState: LaboratoryReviewState;
  date: string;
  reviewedBy?: string;
  reviewedAt?: string;
  laboratory?: string;
  specimen?: string;
  referenceRange?: string;
  code?: string;
  codeSystem?: string;
  accession?: string;
  href: string;
};

export type LaboratoryPatientSummary = {
  patient: LaboratoryPatient;
  latestResult?: LaboratoryResult;
  recentResults: LaboratoryResult[];
  needsReview: number;
  abnormal: number;
  critical: number;
  followUpDue: number;
  specimenIssues: number;
  state: LaboratoryPatientState;
  stateLabel: string;
  updatedAt?: string;
  openLabHref: string;
};

export type LaboratoryOrderSummary = {
  id: string;
  patient: LaboratoryPatient;
  orderName: string;
  orderCode?: string;
  priority: string;
  workflowStatus: string;
  fhirStatus: string;
  destination: string;
  specimenType?: string;
  collectionLocation?: string;
  orderedAt: string;
  nextStep: string;
  resultStatus: string;
  reviewStatus: string;
  href: string;
};

export type LaboratorySpecimenSummary = {
  id: string;
  patient: LaboratoryPatient;
  specimenType: string;
  collectionStatus: string;
  collectionLocation?: string;
  orderName: string;
  nextStep: string;
  href: string;
};

export type LaboratoryAttentionItem = {
  id: string;
  type: 'critical' | 'needs-review' | 'follow-up' | 'specimen-issue';
  patient?: LaboratoryPatient;
  title: string;
  detail: string;
  at?: string;
  href: string;
};

export type LaboratoryActivityItem = {
  id: string;
  patient: LaboratoryPatient;
  title: string;
  detail: string;
  at: string;
  tone: 'normal' | 'abnormal' | 'critical' | 'follow-up';
  href: string;
};

export type LaboratorySource = {
  state: LaboratorySourceState;
  label: string;
  detail: string;
};

export type LaboratoryDashboardSnapshot = {
  generatedAt: string;
  actor: LaboratoryActor;
  patients: LaboratoryPatientSummary[];
  patientTotal: number;
  page: number;
  pageSize: number;
  pageCount: number;
  metrics: {
    patientsWithActivity: number;
    needsReview: number;
    abnormal: number;
    critical: number;
    followUpDue: number;
    specimenIssues: number;
  };
  attention: LaboratoryAttentionItem[];
  results: LaboratoryResult[];
  orders: LaboratoryOrderSummary[];
  specimens: LaboratorySpecimenSummary[];
  recentActivity: LaboratoryActivityItem[];
  sources: {
    patientDirectory: LaboratorySource;
    laboratoryRecords: LaboratorySource;
    orderRegistry: LaboratorySource;
    specimenIssues: LaboratorySource;
  };
};

type StoredLabResult = NonNullable<Patient['labResults']>[number] & {
  accession?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reportStatus?: string;
};

function normalized(value?: string) {
  return (value || '').trim().toLowerCase();
}

function dateValue(value?: string) {
  const timestamp = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function formatStatus(value?: string) {
  const text = value?.trim();
  return text || 'Not supplied';
}

function isCurrentResult(result: StoredLabResult) {
  return !['cancelled', 'entered-in-error'].includes(normalized(result.status));
}

export function classifyLaboratoryInterpretation(value?: string): LaboratoryInterpretation {
  const flag = normalized(value).replace(/[\s_]+/g, '-');
  if (['critical', 'critical-high', 'critical-low', 'panic', 'hh', 'll'].includes(flag)) return 'critical';
  if (['high', 'low', 'abnormal', 'h', 'l', 'a', 'aa'].includes(flag)) return 'abnormal';
  if (['normal', 'n', 'within-target', 'within-range'].includes(flag)) return 'normal';
  return 'not-supplied';
}

export function laboratoryReviewState(result: StoredLabResult): LaboratoryReviewState {
  return result.reviewed || Boolean(result.reviewedAt) ? 'reviewed' : 'unreviewed';
}

function patientReference(patient: Patient): LaboratoryPatient {
  return {
    id: patient.id,
    name: patient.name,
    mrn: patient.mrn,
    birthDate: patient.dob,
    age: patient.age,
    gender: patient.gender,
    primaryClinician: patient.lastAttendingDoctor,
    organization: patient.organization,
    status: patient.status || 'Unknown',
    href: `/dashboard/records/${encodeURIComponent(patient.id)}`,
  };
}

function resultReference(patient: LaboratoryPatient, result: StoredLabResult): LaboratoryResult {
  return {
    id: result.id,
    patient,
    name: result.name,
    value: result.result,
    unit: result.unit,
    interpretation: formatStatus(result.interpretation),
    interpretationState: classifyLaboratoryInterpretation(result.interpretation),
    reportStatus: formatStatus(result.reportStatus || result.status),
    reviewState: laboratoryReviewState(result),
    date: result.date,
    reviewedBy: result.reviewedBy,
    reviewedAt: result.reviewedAt,
    laboratory: result.laboratory,
    specimen: result.specimen,
    referenceRange: result.referenceRange || result.normalRange,
    code: result.code,
    codeSystem: result.codeSystem,
    accession: result.accession,
    href: `${patient.href}/labs?selected=${encodeURIComponent(result.id)}`,
  };
}

function isOpenTask(task: ClinicalTask) {
  return !['completed', 'cancelled', 'entered-in-error', 'failed', 'rejected'].includes(normalized(task.status));
}

function labLinkedFollowUp(task: ClinicalTask, resultIds: ReadonlySet<string>) {
  return isOpenTask(task) && Boolean(task.relatedResources?.some((resource) => resource.type === 'Observation' && resultIds.has(resource.id)));
}

function stateFor(summary: Pick<LaboratoryPatientSummary, 'critical' | 'needsReview' | 'abnormal' | 'followUpDue' | 'specimenIssues'>): { state: LaboratoryPatientState; stateLabel: string } {
  if (summary.critical > 0) return { state: 'critical', stateLabel: 'Critical result' };
  if (summary.specimenIssues > 0) return { state: 'specimen-issue', stateLabel: 'Specimen issue' };
  if (summary.needsReview > 0) return { state: 'needs-review', stateLabel: 'Needs review' };
  if (summary.abnormal > 0) return { state: 'abnormal', stateLabel: 'Abnormal result' };
  if (summary.followUpDue > 0) return { state: 'follow-up', stateLabel: 'Follow-up due' };
  return { state: 'normal', stateLabel: 'No active result flags' };
}

function sortByUrgency(items: LaboratoryPatientSummary[]) {
  const rank: Record<LaboratoryPatientState, number> = { critical: 0, 'specimen-issue': 1, 'needs-review': 2, abnormal: 3, 'follow-up': 4, normal: 5 };
  return items.sort((left, right) => rank[left.state] - rank[right.state]
    || right.critical - left.critical
    || right.abnormal - left.abnormal
    || right.needsReview - left.needsReview
    || right.followUpDue - left.followUpDue
    || left.patient.name.localeCompare(right.patient.name));
}

function sortPatients(items: LaboratoryPatientSummary[], sort: LaboratorySort) {
  if (sort === 'name') return items.sort((left, right) => left.patient.name.localeCompare(right.patient.name));
  if (sort === 'newest') return items.sort((left, right) => dateValue(right.latestResult?.date) - dateValue(left.latestResult?.date));
  if (sort === 'updated') return items.sort((left, right) => dateValue(right.updatedAt) - dateValue(left.updatedAt));
  return sortByUrgency(items);
}

function matchesQuery(summary: LaboratoryPatientSummary, orders: LaboratoryOrderSummary[], query: string) {
  if (!query) return true;
  const search = [
    summary.patient.name,
    summary.patient.mrn,
    summary.patient.birthDate,
    summary.patient.id,
    summary.patient.primaryClinician,
    ...summary.recentResults.flatMap((result) => [result.name, result.code, result.accession, result.specimen, result.laboratory]),
    ...orders.flatMap((order) => [order.orderName, order.orderCode, order.id, order.specimenType, order.destination]),
  ].filter(Boolean).join(' ').toLowerCase();
  return search.includes(query.toLowerCase());
}

function matchesFilter(summary: LaboratoryPatientSummary, filter: LaboratoryFilter) {
  if (filter === 'needs-review') return summary.needsReview > 0;
  if (filter === 'abnormal') return summary.abnormal > 0;
  if (filter === 'critical') return summary.critical > 0;
  if (filter === 'follow-up') return summary.followUpDue > 0;
  if (filter === 'specimen-issue') return summary.specimenIssues > 0;
  return true;
}

function toOrderSummary(order: ClinicalOrder, patient: LaboratoryPatient): LaboratoryOrderSummary {
  return {
    id: order.id,
    patient,
    orderName: order.orderName,
    orderCode: order.orderCode,
    priority: order.priority,
    workflowStatus: order.workflowStatus,
    fhirStatus: order.fhirStatus,
    destination: order.destination,
    specimenType: order.specimenType,
    collectionLocation: order.collectionLocation,
    orderedAt: order.orderedAt,
    nextStep: order.nextStep,
    resultStatus: order.result.status,
    reviewStatus: order.result.reviewStatus,
    href: `/dashboard/orders?orderId=${encodeURIComponent(order.id)}`,
  };
}

function isSpecimenIssue(conversation: ConversationSummary) {
  const text = `${conversation.topic} ${conversation.preview}`.toLowerCase();
  return normalized(conversation.category) === 'lab'
    && /(specimen|sample|recollection|collection)/.test(text)
    && (conversation.actionRequired || conversation.awaitingResponse || conversation.state === 'awaiting_action');
}

function sourceFromDirectory(source: PatientDirectorySource): LaboratorySource {
  return source.state === 'ready'
    ? { state: 'ready', label: source.label, detail: 'Authorized patient identities are available.' }
    : { state: 'unavailable', label: source.label, detail: source.error || 'Patient identity source is unavailable.' };
}

export async function getLaboratoryDashboardSnapshot(
  actor: LaboratoryActor,
  filters: LaboratoryDashboardFilters = {},
): Promise<LaboratoryDashboardSnapshot> {
  const generatedAt = new Date().toISOString();
  const directoryResult = await getCanonicalPatientDirectory().catch((error: unknown) => ({ patients: [], source: { state: 'unavailable' as const, label: 'Patient directory', error: error instanceof Error ? error.message : 'Patient directory is unavailable.' } }));
  const patientDirectory = sourceFromDirectory(directoryResult.source);
  const localPatients = new Map(getMockPatients().map((patient) => [patient.id, patient]));
  const authorizedPatients = directoryResult.patients
    .map((directoryPatient) => localPatients.get(directoryPatient.id))
    .filter((patient): patient is Patient => Boolean(patient && canAccessTaskPatient(patient.id, actor)));
  const patientById = new Map(authorizedPatients.map((patient) => [patient.id, patientReference(patient)]));

  const orderResult = (() => {
    try {
      return getOrderSnapshot().data.filter((order) => order.category === 'Laboratory' && Boolean(order.patientId && patientById.has(order.patientId)));
    } catch {
      return [] as ClinicalOrder[];
    }
  })();
  const orders = orderResult.flatMap((order) => {
    const patient = order.patientId ? patientById.get(order.patientId) : undefined;
    return patient ? [toOrderSummary(order, patient)] : [];
  });
  const ordersByPatient = new Map<string, LaboratoryOrderSummary[]>();
  for (const order of orders) ordersByPatient.set(order.patient.id, [...(ordersByPatient.get(order.patient.id) || []), order]);

  const communicationsResult = await getCommunicationHubSnapshot(actor).then((snapshot) => ({ value: snapshot.conversations.filter((conversation) => !conversation.patientId || patientById.has(conversation.patientId)), ready: true })).catch(() => ({ value: [] as ConversationSummary[], ready: false }));
  const specimenIssues = communicationsResult.value.filter(isSpecimenIssue);
  const specimenIssuesByPatient = new Map<string, ConversationSummary[]>();
  for (const issue of specimenIssues) {
    if (issue.patientId) specimenIssuesByPatient.set(issue.patientId, [...(specimenIssuesByPatient.get(issue.patientId) || []), issue]);
  }

  const patientTasks = await Promise.all(authorizedPatients.map(async (patient) => ({ patientId: patient.id, tasks: await listTasks(patient.id).catch(() => [] as ClinicalTask[]) })));
  const tasksByPatient = new Map(patientTasks.map((entry) => [entry.patientId, entry.tasks]));
  const allResults: LaboratoryResult[] = [];
  const summaries = authorizedPatients.map((patient) => {
    const patientRef = patientReference(patient);
    const results = (patient.labResults || []).filter((result) => isCurrentResult(result)).map((result) => resultReference(patientRef, result)).sort((left, right) => dateValue(right.date) - dateValue(left.date));
    allResults.push(...results);
    const resultIds = new Set(results.map((result) => result.id));
    const followUpDue = (tasksByPatient.get(patient.id) || []).filter((task) => labLinkedFollowUp(task, resultIds)).length;
    const needsReview = results.filter((result) => result.reviewState === 'unreviewed').length;
    const abnormal = results.filter((result) => result.interpretationState === 'abnormal').length;
    const critical = results.filter((result) => result.interpretationState === 'critical' && result.reviewState === 'unreviewed').length;
    const issueCount = (specimenIssuesByPatient.get(patient.id) || []).length;
    const draft: Omit<LaboratoryPatientSummary, 'state' | 'stateLabel'> = {
      patient: patientRef,
      latestResult: results[0],
      recentResults: results.slice(0, 5),
      needsReview,
      abnormal,
      critical,
      followUpDue,
      specimenIssues: issueCount,
      updatedAt: [patient.dataUpdatedAt, results[0]?.reviewedAt, results[0]?.date].filter(Boolean).sort((left, right) => dateValue(right) - dateValue(left))[0],
      openLabHref: `${patientRef.href}/labs`,
    };
    return { ...draft, ...stateFor(draft) };
  }).filter((summary) => summary.recentResults.length > 0 || (ordersByPatient.get(summary.patient.id) || []).length > 0);

  const filter = filters.filter || 'all';
  const sort = filters.sort || 'most-urgent';
  const query = filters.q?.trim() || '';
  const filteredPatients = sortPatients(summaries.filter((summary) => matchesFilter(summary, filter) && matchesQuery(summary, ordersByPatient.get(summary.patient.id) || [], query)), sort);
  const pageSize = Math.min(Math.max(filters.pageSize || 30, 1), 100);
  const pageCount = Math.max(1, Math.ceil(filteredPatients.length / pageSize));
  const page = Math.min(Math.max(filters.page || 1, 1), pageCount);
  const patients = filteredPatients.slice((page - 1) * pageSize, page * pageSize);
  const allowedFilteredIds = new Set(filteredPatients.map((summary) => summary.patient.id));
  const results = allResults.filter((result) => allowedFilteredIds.has(result.patient.id) && (filter === 'all' || filter === 'needs-review' ? filter !== 'needs-review' || result.reviewState === 'unreviewed' : filter === 'abnormal' ? result.interpretationState === 'abnormal' : filter === 'critical' ? result.interpretationState === 'critical' : true)).sort((left, right) => dateValue(right.date) - dateValue(left.date)).slice(0, 100);
  const visibleOrders = orders.filter((order) => allowedFilteredIds.has(order.patient.id)).sort((left, right) => dateValue(right.orderedAt) - dateValue(left.orderedAt));
  const specimens = visibleOrders.filter((order) => Boolean(order.specimenType)).map((order) => ({ id: order.id, patient: order.patient, specimenType: order.specimenType || 'Not documented', collectionStatus: order.workflowStatus, collectionLocation: order.collectionLocation, orderName: order.orderName, nextStep: order.nextStep, href: order.href }));
  const attention: LaboratoryAttentionItem[] = [
    ...allResults.filter((result) => result.interpretationState === 'critical' && result.reviewState === 'unreviewed').map((result) => ({ id: `critical:${result.patient.id}:${result.id}`, type: 'critical' as const, patient: result.patient, title: `${result.name} requires immediate review`, detail: `${result.value}${result.unit ? ` ${result.unit}` : ''} · ${result.interpretation} · ${result.reportStatus}`, at: result.date, href: result.href })),
    ...allResults.filter((result) => result.interpretationState === 'abnormal' && result.reviewState === 'unreviewed').map((result) => ({ id: `review:${result.patient.id}:${result.id}`, type: 'needs-review' as const, patient: result.patient, title: `Review ${result.name}`, detail: `${result.value}${result.unit ? ` ${result.unit}` : ''} · ${result.interpretation} · ${result.reportStatus}`, at: result.date, href: result.href })),
    ...specimenIssues.map((issue) => ({ id: `specimen:${issue.id}`, type: 'specimen-issue' as const, patient: issue.patientId ? patientById.get(issue.patientId) : undefined, title: issue.topic, detail: issue.preview, at: issue.lastActivityAt, href: `/communication?conversationId=${encodeURIComponent(issue.id)}` })),
    ...patientTasks.flatMap(({ patientId, tasks }) => tasks.filter((task) => labLinkedFollowUp(task, new Set((localPatients.get(patientId)?.labResults || []).map((result) => result.id)))).map((task) => ({ id: `follow-up:${patientId}:${task.id}`, type: 'follow-up' as const, patient: patientById.get(patientId), title: task.title, detail: task.description || 'Lab-linked follow-up action is open.', at: task.dueDate || task.updatedAt || task.createdAt, href: `${patientById.get(patientId)?.href || '/dashboard/records'}/tasks?taskId=${encodeURIComponent(task.id)}` }))),
  ].sort((left, right) => ({ critical: 0, 'specimen-issue': 1, 'needs-review': 2, 'follow-up': 3 }[left.type] - { critical: 0, 'specimen-issue': 1, 'needs-review': 2, 'follow-up': 3 }[right.type] || dateValue(left.at) - dateValue(right.at))).slice(0, 8);
  const recentActivity: LaboratoryActivityItem[] = allResults.slice().sort((left, right) => dateValue(right.reviewedAt || right.date) - dateValue(left.reviewedAt || left.date)).slice(0, 5).map((result) => ({ id: `result:${result.patient.id}:${result.id}`, patient: result.patient, title: result.reviewState === 'reviewed' ? `${result.name} reviewed` : `${result.name} available`, detail: `${result.reportStatus} · ${result.interpretation}`, at: result.reviewedAt || result.date, tone: result.interpretationState === 'critical' ? 'critical' : result.interpretationState === 'abnormal' ? 'abnormal' : 'normal', href: result.href }));
  const metrics = {
    patientsWithActivity: summaries.length,
    needsReview: allResults.filter((result) => result.reviewState === 'unreviewed').length,
    abnormal: allResults.filter((result) => result.interpretationState === 'abnormal').length,
    critical: allResults.filter((result) => result.interpretationState === 'critical' && result.reviewState === 'unreviewed').length,
    followUpDue: summaries.reduce((total, summary) => total + summary.followUpDue, 0),
    specimenIssues: specimenIssues.length,
  };
  const localRecordState: LaboratorySourceState = patientDirectory.state === 'ready' ? 'ready' : 'unavailable';
  return {
    generatedAt,
    actor,
    patients,
    patientTotal: filteredPatients.length,
    page,
    pageSize,
    pageCount,
    metrics,
    attention,
    results,
    orders: visibleOrders,
    specimens,
    recentActivity,
    sources: {
      patientDirectory,
      laboratoryRecords: { state: localRecordState, label: 'Roshi laboratory result read model', detail: localRecordState === 'ready' ? 'Source result status, interpretation, units, and local review state are available.' : 'Laboratory records cannot be reconciled without the authorized patient directory.' },
      orderRegistry: { state: 'ready', label: 'Roshi laboratory order registry', detail: 'Order, collection, delivery, result, and review states remain distinct.' },
      specimenIssues: communicationsResult.ready ? { state: 'ready', label: 'Laboratory communication workflow', detail: 'Specimen issue messages are derived from authorized laboratory communications.' } : { state: 'unavailable', label: 'Laboratory communication workflow', detail: 'Specimen-related communication status is temporarily unavailable.' },
    },
  };
}