import { getDoctorWorkSnapshot, type DoctorWorkItem, type DoctorWorkSnapshot } from '@/lib/doctorWorkStore';
import { getCommunicationHubSnapshot, type ConversationSummary } from '@/lib/clinicalCommunicationStore';
import { getSchedulingSnapshot, type SchedulingAppointment } from '@/lib/schedulingData';
import { getOrderSnapshot, type ClinicalOrder, type OrderSnapshot } from '@/lib/orderStore';
import { getPatientById } from '@/app/dashboard/records/mockPatients';

export type DashboardActor = { id: string; name: string; role: string };
export type DashboardSource = { state: 'ready' | 'partial' | 'unavailable'; label: string; error?: string };
export type DashboardPriority = 'critical' | 'high' | 'normal' | 'low';

export type DashboardPatient = {
  id: string;
  name: string;
  mrn?: string;
  href: string;
};

export type DashboardAttentionItem = {
  id: string;
  patient?: DashboardPatient;
  type: string;
  title: string;
  summary: string;
  priority: DashboardPriority;
  status: string;
  at?: string;
  dueAt?: string;
  owner?: string;
  href: string;
  actionLabel: string;
  source: 'task' | 'result' | 'note' | 'document' | 'communication' | 'order';
};

export type DashboardScheduleItem = {
  id: string;
  patient?: DashboardPatient;
  start: string;
  end?: string;
  type: string;
  status: string;
  provider?: string;
  location?: string;
  href: string;
};

export type DashboardCommunicationItem = {
  id: string;
  patient?: DashboardPatient;
  participant: string;
  organization?: string;
  topic: string;
  preview: string;
  priority: DashboardPriority;
  state: string;
  unread: boolean;
  actionRequired: boolean;
  deliveryIssue: boolean;
  lastActivityAt: string;
  href: string;
};

export type DashboardOrderItem = {
  id: string;
  patient?: DashboardPatient;
  orderName: string;
  category: string;
  priority: string;
  status: string;
  nextStep: string;
  result: string;
  destination: string;
  orderedAt: string;
  href: string;
};

export type DashboardSummary = {
  actor: DashboardActor;
  generatedAt: string;
  timeZone: string;
  greeting: 'morning' | 'afternoon' | 'evening';
  roleLabel: string;
  roleFocus: string;
  sources: {
    schedule: DashboardSource;
    work: DashboardSource;
    communications: DashboardSource;
    orders: DashboardSource;
  };
  capabilities: {
    schedule: boolean;
    patientFlow: boolean;
    work: boolean;
    results: boolean;
    communications: boolean;
    orders: boolean;
    documentation: boolean;
  };
  metrics: {
    patientsToday: number;
    checkedIn: number;
    waitingNow: number;
    needsAttention: number;
    unreviewedResults: number;
    urgentResults: number;
    tasksDueToday: number;
    overdueTasks: number;
    unreadCommunications: number;
    communicationNeedsResponse: number;
    activeOrders: number;
    ordersNeedsAction: number;
    orderDeliveryIssues: number;
    communicationDeliveryIssues: number;
    deliveryIssues: number;
    unsignedNotes: number;
    documentsToReview: number;
  };
  attention: { state: DashboardSource['state']; items: DashboardAttentionItem[] };
  schedule: { state: DashboardSource['state']; items: DashboardScheduleItem[]; next?: DashboardScheduleItem; waitingNow: number };
  work: { state: DashboardSource['state']; items: DashboardAttentionItem[] };
  results: { state: DashboardSource['state']; items: DashboardAttentionItem[] };
  communications: { state: DashboardSource['state']; items: DashboardCommunicationItem[] };
  orders: { state: DashboardSource['state']; items: DashboardOrderItem[] };
  documentation: { state: DashboardSource['state']; items: DashboardAttentionItem[] };
  systemStatus: { state: 'healthy' | 'attention' | 'unavailable'; label: string; detail: string; issues: string[] };
};

type SourceResult<T> = { value: T; source: DashboardSource };

const WAITING_APPOINTMENT_STATUSES = new Set(['arrived', 'checked-in']);
const CLOSED_APPOINTMENT_STATUSES = new Set(['cancelled', 'noshow', 'entered-in-error', 'fulfilled']);

function source(state: DashboardSource['state'], label: string, error?: unknown): DashboardSource {
  return { state, label, ...(error ? { error: error instanceof Error ? error.message : 'Source unavailable.' } : {}) };
}

function settled<T>(result: PromiseSettledResult<T>, label: string): SourceResult<T | null> {
  return result.status === 'fulfilled' ? { value: result.value, source: source('ready', label) } : { value: null, source: source('unavailable', label, result.reason) };
}

function validDate(value?: string) {
  if (!value) return undefined;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

function formatTimeZone(candidate: string) {
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: candidate }).format();
    return candidate;
  } catch {
    return 'America/Toronto';
  }
}

function greetingFor(now: Date, timeZone: string): DashboardSummary['greeting'] {
  const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', hourCycle: 'h23' }).format(now));
  return hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
}

function dayKey(value: string | undefined, timeZone: string) {
  const timestamp = validDate(value);
  return timestamp === undefined ? '' : new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(timestamp));
}

function sameDay(value: string | undefined, now: Date, timeZone: string) {
  return Boolean(value) && dayKey(value, timeZone) === dayKey(now.toISOString(), timeZone);
}

function normalized(value?: string) {
  return (value || '').trim().toLowerCase().replace(/[\s_]+/g, '-');
}

function roleInfo(role: string) {
  const normalizedRole = role.toUpperCase();
  if (['PHARMACIST', 'PHARMACY', 'PHARMACY_USER'].includes(normalizedRole)) return { label: 'Pharmacy', focus: 'pharmacy operations', schedule: false, patientFlow: false, work: true, results: false, communications: true, orders: false, documentation: false };
  if (['LAB_TECH', 'LABORATORY', 'LAB_USER', 'LIMS'].includes(normalizedRole)) return { label: 'Laboratory', focus: 'laboratory operations', schedule: false, patientFlow: false, work: true, results: true, communications: true, orders: true, documentation: false };
  if (['HOSPITAL', 'HOSPITAL_USER'].includes(normalizedRole)) return { label: 'Hospital', focus: 'hospital operations', schedule: true, patientFlow: true, work: true, results: true, communications: true, orders: true, documentation: true };
  if (['ADMIN', 'CLINIC_ADMIN', 'CLINIC_ADMINISTRATOR'].includes(normalizedRole)) return { label: 'Clinic Administration', focus: 'clinic operations', schedule: true, patientFlow: true, work: true, results: true, communications: true, orders: true, documentation: true };
  return { label: 'Clinical', focus: 'clinical priorities', schedule: true, patientFlow: true, work: true, results: true, communications: true, orders: true, documentation: true };
}

function patientReference(patientId?: string, fallbackName?: string, fallbackMrn?: string): DashboardPatient | undefined {
  if (!patientId) return undefined;
  const patient = getPatientById(patientId);
  return { id: patientId, name: patient?.name || fallbackName || 'Patient information unavailable', mrn: patient?.mrn || fallbackMrn, href: `/dashboard/records/${encodeURIComponent(patientId)}` };
}

function workPriority(priority: DoctorWorkItem['priority']): DashboardPriority {
  return priority;
}

function workItem(item: DoctorWorkItem): DashboardAttentionItem {
  const taskId = item.id.startsWith('task:') ? item.id.split(':').slice(2).join(':') : undefined;
  const source = item.kind === 'result-review' ? 'result' : item.kind === 'note-signature' ? 'note' : item.kind === 'document-review' ? 'document' : 'task';
  const href = source === 'task' && taskId ? `${item.patient.href}/tasks?taskId=${encodeURIComponent(taskId)}` : item.sourceHref || item.patient.href;
  return { id: item.id, patient: patientReference(item.patient.id, item.patient.name, item.patient.mrn), type: item.type, title: item.title, summary: item.summary, priority: workPriority(item.priority), status: item.status, at: item.updatedAt || item.createdAt, dueAt: item.dueAt, owner: item.assignedTo, href, actionLabel: item.kind === 'result-review' ? 'Review Result' : item.kind === 'note-signature' ? 'Open Note' : item.kind === 'document-review' ? 'Review Document' : 'Open Task', source };
}

function communicationPriority(priority: ConversationSummary['priority']): DashboardPriority {
  if (priority === 'stat' || priority === 'urgent') return 'critical';
  if (priority === 'asap') return 'high';
  return 'normal';
}

function communicationItem(item: ConversationSummary): DashboardCommunicationItem {
  return { id: item.id, patient: patientReference(item.patientId, item.patientName), participant: item.participantName, organization: item.organizationName, topic: item.topic, preview: item.preview, priority: communicationPriority(item.priority), state: item.state, unread: item.unread, actionRequired: item.actionRequired, deliveryIssue: item.deliveryIssue, lastActivityAt: item.lastActivityAt, href: `/communication?conversationId=${encodeURIComponent(item.id)}` };
}

function orderPriority(priority: ClinicalOrder['priority']): DashboardPriority {
  if (priority === 'STAT' || priority === 'Urgent') return 'critical';
  if (priority === 'ASAP') return 'high';
  return 'normal';
}

function orderAction(order: ClinicalOrder) {
  if (order.workflowStatus === 'Needs Signature') return 'Sign order';
  if (order.workflowStatus === 'Delivery Issue' || order.transmission.state === 'failed') return 'Retry transmission';
  if (order.result.reviewStatus === 'needs-review') return 'Review result';
  return order.nextStep;
}

function orderItem(order: ClinicalOrder): DashboardAttentionItem {
  return { id: `order:${order.id}`, patient: patientReference(order.patientId, order.patientName, order.patientMrn), type: `${order.category} Order`, title: order.orderName, summary: `${order.workflowStatus} · ${order.destination}`, priority: orderPriority(order.priority), status: order.workflowStatus, at: order.updatedAt || order.orderedAt, owner: order.orderingProvider, href: `/dashboard/orders?orderId=${encodeURIComponent(order.id)}`, actionLabel: orderAction(order), source: 'order' };
}

function orderProjection(order: ClinicalOrder): DashboardOrderItem {
  return { id: order.id, patient: patientReference(order.patientId, order.patientName, order.patientMrn), orderName: order.orderName, category: order.category, priority: order.priority, status: order.workflowStatus, nextStep: order.nextStep, result: order.result.reviewStatus === 'needs-review' ? `${order.result.status} · Needs Review` : order.result.status === 'no-result' ? 'No Result Yet' : order.result.status, destination: order.destination, orderedAt: order.orderedAt, href: `/dashboard/orders?orderId=${encodeURIComponent(order.id)}` };
}

function scheduleProjection(appointment: SchedulingAppointment): DashboardScheduleItem {
  const patient = patientReference(appointment.patientId, appointment.patientName, appointment.patientMrn);
  return { id: appointment.id, patient, start: appointment.start, end: appointment.end, type: appointment.appointmentType || appointment.serviceType || 'Appointment', status: appointment.status, provider: appointment.providerName, location: [appointment.locationName, appointment.room].filter(Boolean).join(' · ') || undefined, href: `/dashboard/appointments/${encodeURIComponent(appointment.id)}` };
}

function isOpenWorkItem(item: DashboardAttentionItem) {
  return !['completed', 'cancelled', 'failed', 'closed'].includes(normalized(item.status));
}

function sortAttention(left: DashboardAttentionItem, right: DashboardAttentionItem) {
  const priorityRank: Record<DashboardPriority, number> = { critical: 0, high: 1, normal: 2, low: 3 };
  return priorityRank[left.priority] - priorityRank[right.priority] || (validDate(left.dueAt || left.at) || Number.MAX_SAFE_INTEGER) - (validDate(right.dueAt || right.at) || Number.MAX_SAFE_INTEGER);
}

function visibleOrders(snapshot: OrderSnapshot, work: DoctorWorkSnapshot | null, actor: DashboardActor) {
  if (actor.role === 'DEV' || actor.role === 'ADMIN' || process.env.NODE_ENV !== 'production') return snapshot.data;
  const allowedPatients = new Set(work?.patients.map((patient) => patient.id) || []);
  return snapshot.data.filter((order) => order.patientId && allowedPatients.has(order.patientId));
}

export async function getDashboardSummary(actor: DashboardActor, now = new Date(), options: { preview?: boolean } = {}): Promise<DashboardSummary> {
  const timeZone = formatTimeZone(process.env.DOCTOR_VIEW_TIME_ZONE || process.env.NEXT_PUBLIC_CLINIC_TIME_ZONE || 'America/Toronto');
  const [scheduleResult, workResult, communicationResult] = await Promise.allSettled([getSchedulingSnapshot('', { preview: options.preview }), getDoctorWorkSnapshot(actor.id, actor.name, actor.role), getCommunicationHubSnapshot({ id: actor.id, name: actor.name, role: actor.role })]);
  const schedule = settled(scheduleResult, 'FHIR R4 Appointment and scheduling directory');
  const work = settled(workResult, 'Roshi clinical work read model');
  const communications = settled(communicationResult, 'Roshi Communication Hub');
  if (schedule.value) {
    const appointmentSource = schedule.value.sources.appointments;
    schedule.source = source(appointmentSource.state, appointmentSource.source, appointmentSource.error);
  }
  const orderSnapshot = getOrderSnapshot();
  const orderSource = source('ready', 'Roshi order registry');
  const profile = roleInfo(actor.role);

  const allowedSchedulePatients = new Set(work.value?.patients.map((patient) => patient.id) || []);
  const scheduleAppointments = (schedule.value?.appointments || []).filter((appointment) => process.env.NODE_ENV !== 'production' ? Boolean(appointment.patientId && allowedSchedulePatients.has(appointment.patientId)) : actor.role === 'ADMIN' || Boolean(appointment.patientId && allowedSchedulePatients.has(appointment.patientId)));
  const todayAppointments = scheduleAppointments.filter((appointment) => sameDay(appointment.start, now, timeZone) && !CLOSED_APPOINTMENT_STATUSES.has(normalized(appointment.status))).sort((left, right) => (validDate(left.start) || 0) - (validDate(right.start) || 0));
  const scheduleItems = todayAppointments.map(scheduleProjection);
  const next = scheduleItems.find((appointment) => (validDate(appointment.end || appointment.start) || 0) >= now.getTime()) || scheduleItems[0];
  const waitingNow = todayAppointments.filter((appointment) => WAITING_APPOINTMENT_STATUSES.has(normalized(appointment.status))).length;

  const workItems = (work.value?.items || []).map(workItem);
  const openWork = workItems.filter(isOpenWorkItem);
  const resultItems = workItems.filter((item) => item.source === 'result' && isOpenWorkItem(item));
  const documentationItems = workItems.filter((item) => (item.source === 'note' || item.source === 'document') && isOpenWorkItem(item));
  const taskItems = workItems.filter((item) => item.source === 'task' && isOpenWorkItem(item));
  const communicationsItems = (communications.value?.conversations || []).map(communicationItem);
  const visibleOrderRecords = visibleOrders(orderSnapshot, work.value, actor);
  const orderItems = visibleOrderRecords.map(orderProjection);
  const openOrders = visibleOrderRecords.filter((order) => !['completed', 'revoked', 'entered-in-error'].includes(order.fhirStatus));
  const actionOrders = visibleOrderRecords.filter((order) => order.workflowStatus === 'Needs Signature' || order.workflowStatus === 'Delivery Issue' || order.result.reviewStatus === 'needs-review');
  const orderAttention = actionOrders.map(orderItem);
  const communicationAttention = communicationsItems.filter((item) => item.actionRequired || item.deliveryIssue || item.priority === 'critical').map((item) => ({ id: `communication:${item.id}`, patient: item.patient, type: 'Communication', title: item.topic, summary: item.preview, priority: item.priority, status: item.state, at: item.lastActivityAt, owner: item.participant, href: item.href, actionLabel: item.deliveryIssue ? 'Open Delivery Issue' : 'Open Conversation', source: 'communication' as const }));
  const allAttention = [...openWork.filter((item) => item.priority === 'critical' || item.priority === 'high' || item.status === 'overdue'), ...communicationAttention, ...orderAttention].sort(sortAttention);
  const attention = allAttention.slice(0, 8);
  const activeTaskItems = taskItems.sort(sortAttention).slice(0, 6);
  const recentResultItems = resultItems.sort(sortAttention).slice(0, 5);
  const recentDocumentationItems = documentationItems.sort(sortAttention).slice(0, 5);
  const recentCommunicationItems = communicationsItems.filter((item) => item.unread || item.actionRequired || item.deliveryIssue).sort((left, right) => (validDate(right.lastActivityAt) || 0) - (validDate(left.lastActivityAt) || 0)).slice(0, 5);
  const relevantOrders = orderItems.filter((item) => item.status !== 'Completed' || item.result !== 'No Result Yet').slice(0, 5);
  const dueToday = taskItems.filter((item) => sameDay(item.dueAt, now, timeZone)).length;
  const overdue = taskItems.filter((item) => item.status === 'overdue').length;
  const urgentResults = resultItems.filter((item) => item.priority === 'critical').length;
  const deliveryIssues = visibleOrderRecords.filter((order) => order.transmission.state === 'failed' || order.workflowStatus === 'Delivery Issue').length + (communications.value?.folders.deliveryIssues || 0);

  const issues: string[] = [];
  if (schedule.source.state !== 'ready') issues.push('Today\'s schedule source is temporarily unavailable.');
  if (work.source.state !== 'ready') issues.push('Clinical work source is temporarily unavailable.');
  if (communications.source.state !== 'ready') issues.push('Communication Hub source is temporarily unavailable.');
  if (deliveryIssues > 0) issues.push(`${deliveryIssues} delivery issue${deliveryIssues === 1 ? '' : 's'} require attention.`);
  const systemStatus = issues.length ? { state: issues.some((issue) => issue.includes('unavailable')) ? 'unavailable' as const : 'attention' as const, label: issues.some((issue) => issue.includes('unavailable')) ? 'Some clinical data is unavailable' : 'Integration attention required', detail: issues[0], issues } : { state: 'healthy' as const, label: 'Clinical systems connected', detail: 'Available clinical sources are responding normally.', issues: [] };

  return {
    actor,
    generatedAt: now.toISOString(),
    timeZone,
    greeting: greetingFor(now, timeZone),
    roleLabel: profile.label,
    roleFocus: profile.focus,
    sources: { schedule: schedule.source, work: work.source, communications: communications.source, orders: orderSource },
    capabilities: { schedule: profile.schedule, patientFlow: profile.patientFlow, work: profile.work, results: profile.results, communications: profile.communications, orders: profile.orders, documentation: profile.documentation },
    metrics: {
      patientsToday: profile.schedule ? todayAppointments.length : 0,
      checkedIn: profile.schedule ? todayAppointments.filter((appointment) => WAITING_APPOINTMENT_STATUSES.has(normalized(appointment.status))).length : 0,
      waitingNow: profile.patientFlow ? waitingNow : 0,
      needsAttention: profile.work ? allAttention.length : 0,
      unreviewedResults: profile.results ? resultItems.length : 0,
      urgentResults: profile.results ? urgentResults : 0,
      tasksDueToday: profile.work ? dueToday : 0,
      overdueTasks: profile.work ? overdue : 0,
      unreadCommunications: profile.communications ? communications.value?.folders.inbox || 0 : 0,
      communicationNeedsResponse: profile.communications ? communications.value?.folders.needsAction || 0 : 0,
      activeOrders: profile.orders ? openOrders.length : 0,
      ordersNeedsAction: profile.orders ? actionOrders.length : 0,
      orderDeliveryIssues: profile.orders ? visibleOrderRecords.filter((order) => order.transmission.state === 'failed' || order.workflowStatus === 'Delivery Issue').length : 0,
      communicationDeliveryIssues: profile.communications ? communications.value?.folders.deliveryIssues || 0 : 0,
      deliveryIssues: profile.communications || profile.orders ? deliveryIssues : 0,
      unsignedNotes: profile.documentation ? (work.value?.counts.notes || 0) : 0,
      documentsToReview: profile.documentation ? (work.value?.counts.documents || 0) : 0,
    },
    attention: { state: work.source.state === 'ready' || communications.source.state === 'ready' || orderSource.state === 'ready' ? 'ready' : 'unavailable', items: profile.work ? attention : [] },
    schedule: { state: schedule.source.state, items: profile.schedule ? scheduleItems.slice(0, 8) : [], next: profile.schedule ? next : undefined, waitingNow: profile.patientFlow ? waitingNow : 0 },
    work: { state: work.source.state, items: profile.work ? activeTaskItems : [] },
    results: { state: work.source.state, items: profile.results ? recentResultItems : [] },
    communications: { state: communications.source.state, items: profile.communications ? recentCommunicationItems : [] },
    orders: { state: orderSource.state, items: profile.orders ? relevantOrders : [] },
    documentation: { state: work.source.state, items: profile.documentation ? recentDocumentationItems : [] },
    systemStatus,
  };
}
