import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { resolveDataPath } from '@/lib/dataPath';
import { getPatientById } from '@/app/dashboard/records/mockPatients';

export const ORDER_CATEGORIES = ['Laboratory', 'Imaging', 'Diagnostics'] as const;
export type OrderCategory = (typeof ORDER_CATEGORIES)[number];

export const ORDER_PRIORITIES = ['Routine', 'Urgent', 'ASAP', 'STAT'] as const;
export type OrderPriority = (typeof ORDER_PRIORITIES)[number];

export const FHIR_ORDER_STATUSES = ['draft', 'active', 'on-hold', 'revoked', 'completed', 'entered-in-error', 'unknown'] as const;
export type FhirOrderStatus = (typeof FHIR_ORDER_STATUSES)[number];

export const ORDER_WORKFLOW_STATUSES = ['Draft', 'Needs Signature', 'Ordered', 'Sent', 'Accepted', 'Awaiting Scheduling', 'Scheduled', 'Awaiting Collection', 'Collected', 'In Progress', 'Partial Result', 'Completed', 'Cancelled', 'On Hold', 'Delivery Issue', 'Entered in Error'] as const;
export type OrderWorkflowStatus = (typeof ORDER_WORKFLOW_STATUSES)[number];

export type TransmissionState = 'not-sent' | 'queued' | 'sent' | 'accepted' | 'failed';
export type ResultStatus = 'no-result' | 'partial' | 'preliminary' | 'final' | 'corrected' | 'amended';
export type ResultReviewStatus = 'not-applicable' | 'needs-review' | 'reviewed';

export type OrderHistoryEntry = {
  id: string;
  event: string;
  at: string;
  actor: string;
  detail?: string;
};

export type OrderTransmission = {
  state: TransmissionState;
  destinationSystem?: string;
  sentAt?: string;
  acceptedAt?: string;
  lastAttemptAt?: string;
  attempts: number;
  failure?: string;
  nextRetryAt?: string;
  correlationId?: string;
};

export type OrderResult = {
  status: ResultStatus;
  reviewStatus: ResultReviewStatus;
  resourceType?: 'DiagnosticReport' | 'Observation';
  resourceId?: string;
  display?: string;
  collectedAt?: string;
  finalizedAt?: string;
};

export type ClinicalOrder = {
  id: string;
  version: number;
  patientId: string | null;
  patientName: string;
  patientMrn?: string;
  patientBirthDate?: string;
  orderName: string;
  orderCode?: string;
  category: OrderCategory;
  priority: OrderPriority;
  orderedAt: string;
  orderingProvider: string;
  destination: string;
  destinationType: 'LIMS' | 'RIS/PACS' | 'Hospital service' | 'Local';
  clinicalIndication?: string;
  instructions?: string;
  specimenType?: string;
  collectionLocation?: string;
  bodySite?: string;
  laterality?: string;
  contrast?: string;
  requestedDate?: string;
  fhirStatus: FhirOrderStatus;
  workflowStatus: OrderWorkflowStatus;
  transmission: OrderTransmission;
  result: OrderResult;
  nextStep: string;
  history: OrderHistoryEntry[];
  signedBy?: string;
  signedAt?: string;
  createdBy: string;
  source: 'baseline' | 'legacy-lab' | 'local';
  idempotencyKey?: string;
  updatedAt: string;
};

export type CreateOrderInput = {
  patientId: string;
  orderName: string;
  orderCode?: string;
  category: OrderCategory;
  priority: OrderPriority;
  orderingProvider: string;
  destination: string;
  destinationType: ClinicalOrder['destinationType'];
  clinicalIndication?: string;
  instructions?: string;
  specimenType?: string;
  collectionLocation?: string;
  bodySite?: string;
  laterality?: string;
  contrast?: string;
  requestedDate?: string;
  idempotencyKey?: string;
};

export type OrderPatientIdentity = {
  name: string;
  mrn?: string;
  birthDate?: string;
};

export type OrderFilters = {
  q?: string;
  category?: OrderCategory;
  status?: string;
  priority?: OrderPriority;
  provider?: string;
  destination?: string;
  patientId?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type OrderSnapshot = {
  data: ClinicalOrder[];
  total: number;
  metrics: {
    open: number;
    needsAction: number;
    inProgress: number;
    completed: number;
    deliveryIssues: number;
    urgent: number;
  };
  availableFilters: {
    providers: string[];
    destinations: string[];
  };
  generatedAt: string;
};

const ORDER_FILE = resolveDataPath('clinical-orders.json');

const BASELINE_ORDERS: ClinicalOrder[] = [
  {
    id: 'order-legacy-ecg',
    version: 1,
    patientId: 'patient-002',
    patientName: 'Michael Thompson',
    patientMrn: '9922100',
    orderName: 'ECG',
    orderCode: 'ECG',
    category: 'Diagnostics',
    priority: 'Routine',
    orderedAt: '2026-06-10T09:00:00.000Z',
    orderingProvider: 'Doctor User',
    destination: 'Cardiology Diagnostics',
    destinationType: 'Hospital service',
    fhirStatus: 'active',
    workflowStatus: 'Awaiting Scheduling',
    transmission: { state: 'not-sent', attempts: 0 },
    result: { status: 'no-result', reviewStatus: 'not-applicable' },
    nextStep: 'Schedule diagnostic test',
    history: [{ id: 'history-legacy-ecg', event: 'Order created', at: '2026-06-10T09:00:00.000Z', actor: 'Doctor User' }],
    createdBy: 'Doctor User',
    source: 'baseline',
    updatedAt: '2026-06-10T09:00:00.000Z',
  },
  {
    id: 'order-legacy-blood-work',
    version: 1,
    patientId: 'patient-001',
    patientName: 'Sarah Jenkins',
    patientMrn: '8839201',
    orderName: 'Blood Work',
    orderCode: 'LAB-LEGACY',
    category: 'Laboratory',
    priority: 'Routine',
    orderedAt: '2026-06-02T09:00:00.000Z',
    orderingProvider: 'Doctor User',
    destination: 'Maple Health Laboratory',
    destinationType: 'LIMS',
    fhirStatus: 'completed',
    workflowStatus: 'Completed',
    transmission: { state: 'accepted', attempts: 1, sentAt: '2026-06-02T09:01:00.000Z', acceptedAt: '2026-06-02T09:01:00.000Z', destinationSystem: 'Maple Health LIMS' },
    result: { status: 'no-result', reviewStatus: 'not-applicable' },
    nextStep: 'No further order action',
    history: [{ id: 'history-legacy-blood-work', event: 'Order completed', at: '2026-06-02T09:00:00.000Z', actor: 'Doctor User' }],
    createdBy: 'Doctor User',
    source: 'baseline',
    updatedAt: '2026-06-02T09:00:00.000Z',
  },
];

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function isCategory(value: unknown): value is OrderCategory {
  return typeof value === 'string' && ORDER_CATEGORIES.includes(value as OrderCategory);
}

function isPriority(value: unknown): value is OrderPriority {
  return typeof value === 'string' && ORDER_PRIORITIES.includes(value as OrderPriority);
}

function isFhirStatus(value: unknown): value is FhirOrderStatus {
  return typeof value === 'string' && FHIR_ORDER_STATUSES.includes(value as FhirOrderStatus);
}

function isWorkflowStatus(value: unknown): value is OrderWorkflowStatus {
  return typeof value === 'string' && ORDER_WORKFLOW_STATUSES.includes(value as OrderWorkflowStatus);
}

function isTransmissionState(value: unknown): value is TransmissionState {
  return ['not-sent', 'queued', 'sent', 'accepted', 'failed'].includes(String(value));
}

function isResultStatus(value: unknown): value is ResultStatus {
  return ['no-result', 'partial', 'preliminary', 'final', 'corrected', 'amended'].includes(String(value));
}

function isReviewStatus(value: unknown): value is ResultReviewStatus {
  return ['not-applicable', 'needs-review', 'reviewed'].includes(String(value));
}

function isHistory(value: unknown): value is OrderHistoryEntry {
  if (!isObject(value)) return false;
  return typeof value.id === 'string' && typeof value.event === 'string' && typeof value.at === 'string' && typeof value.actor === 'string';
}

function isClinicalOrder(value: unknown): value is ClinicalOrder {
  if (!isObject(value)) return false;
  const transmission = isObject(value.transmission) ? value.transmission : undefined;
  const result = isObject(value.result) ? value.result : undefined;
  return typeof value.id === 'string'
    && typeof value.version === 'number'
    && (typeof value.patientId === 'string' || value.patientId === null)
    && typeof value.patientName === 'string'
    && typeof value.orderName === 'string'
    && isCategory(value.category)
    && isPriority(value.priority)
    && typeof value.orderedAt === 'string'
    && typeof value.orderingProvider === 'string'
    && typeof value.destination === 'string'
    && isFhirStatus(value.fhirStatus)
    && isWorkflowStatus(value.workflowStatus)
    && Boolean(transmission && isTransmissionState(transmission.state) && typeof transmission.attempts === 'number')
    && Boolean(result && isResultStatus(result.status) && isReviewStatus(result.reviewStatus))
    && typeof value.nextStep === 'string'
    && Array.isArray(value.history)
    && value.history.every(isHistory)
    && typeof value.createdBy === 'string'
    && typeof value.updatedAt === 'string';
}

function readJsonSync(filePath: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
  } catch {
    return undefined;
  }
}

async function readJson(filePath: string): Promise<unknown> {
  try {
    return JSON.parse(await fsPromises.readFile(filePath, 'utf8')) as unknown;
  } catch {
    return undefined;
  }
}

function recordsFromFile(value: unknown): ClinicalOrder[] {
  const items = Array.isArray(value) ? value : isObject(value) && Array.isArray(value.items) ? value.items : [];
  return items.filter(isClinicalOrder);
}

function legacyOrderFromValue(value: unknown, index: number): ClinicalOrder | null {
  if (!isObject(value) || !Array.isArray(value.tests)) return null;
  const firstTest = value.tests.find(isObject);
  const orderName = text(firstTest?.name) || 'Laboratory Order';
  const timestamp = typeof value.ts === 'number' ? new Date(value.ts).toISOString() : text(value.orderDate) ? `${value.orderDate}T09:00:00.000Z` : new Date(0).toISOString();
  const priority = isPriority(value.priority) ? value.priority : 'Routine';
  const sourcePatientId = text(value.patientId);
  const patient = sourcePatientId ? getPatientById(sourcePatientId) : undefined;
  const patientId = patient?.id || sourcePatientId || null;
  const destination = text(value.location) || 'Destination not configured';
  return {
    id: text(value.orderId) || `order-legacy-lab-${index}`,
    version: 1,
    patientId,
    patientName: patient?.name || patientId || 'Patient reference unavailable',
    patientMrn: patient?.mrn,
    patientBirthDate: patient?.dob,
    orderName,
    orderCode: text(firstTest?.code),
    category: 'Laboratory',
    priority,
    orderedAt: timestamp,
    orderingProvider: 'Legacy lab composer',
    destination,
    destinationType: 'LIMS',
    clinicalIndication: text(value.reason),
    instructions: text(value.instructions),
    specimenType: text(value.collectionType),
    collectionLocation: destination,
    requestedDate: text(value.collectBy),
    fhirStatus: 'active',
    workflowStatus: 'Awaiting Collection',
    transmission: { state: 'not-sent', attempts: 0 },
    result: { status: 'no-result', reviewStatus: 'not-applicable' },
    nextStep: 'Collect specimen',
    history: [{ id: `history-${text(value.orderId) || index}`, event: 'Legacy laboratory order imported', at: timestamp, actor: 'Legacy lab composer' }],
    createdBy: 'Legacy lab composer',
    source: 'legacy-lab',
    updatedAt: timestamp,
  };
}

function legacyOrderFiles(): string[] {
  const candidates = [
    path.resolve(process.cwd(), 'ehr', 'data', 'orders.json'),
    path.resolve(process.cwd(), 'ehr', 'ehr', 'data', 'orders.json'),
    resolveDataPath('orders.json'),
  ];
  return [...new Set(candidates)].filter((candidate) => candidate !== ORDER_FILE);
}

function readLegacyOrdersSync(): ClinicalOrder[] {
  for (const filePath of legacyOrderFiles()) {
    const value = readJsonSync(filePath);
    const items = Array.isArray(value) ? value : isObject(value) && Array.isArray(value.items) ? value.items : [];
    const migrated = items.map((item, index) => legacyOrderFromValue(item, index)).filter((item): item is ClinicalOrder => Boolean(item));
    if (migrated.length) return migrated;
  }
  return [];
}

async function readLegacyOrders(): Promise<ClinicalOrder[]> {
  for (const filePath of legacyOrderFiles()) {
    const value = await readJson(filePath);
    const items = Array.isArray(value) ? value : isObject(value) && Array.isArray(value.items) ? value.items : [];
    const migrated = items.map((item, index) => legacyOrderFromValue(item, index)).filter((item): item is ClinicalOrder => Boolean(item));
    if (migrated.length) return migrated;
  }
  return [];
}

function mergeOrders(...groups: ClinicalOrder[][]): ClinicalOrder[] {
  const merged = new Map<string, ClinicalOrder>();
  for (const group of groups) for (const order of group) if (!merged.has(order.id)) merged.set(order.id, order);
  return [...merged.values()].sort((left, right) => Date.parse(right.orderedAt) - Date.parse(left.orderedAt));
}

export function readOrdersSync(): ClinicalOrder[] {
  return mergeOrders(BASELINE_ORDERS, readLegacyOrdersSync(), recordsFromFile(readJsonSync(ORDER_FILE)));
}

export async function readOrders(): Promise<ClinicalOrder[]> {
  return mergeOrders(BASELINE_ORDERS, await readLegacyOrders(), recordsFromFile(await readJson(ORDER_FILE)));
}

async function writeOrders(items: ClinicalOrder[]) {
  await fsPromises.mkdir(path.dirname(ORDER_FILE), { recursive: true });
  const temporaryPath = `${ORDER_FILE}.${process.pid}.tmp`;
  await fsPromises.writeFile(temporaryPath, JSON.stringify({ items }, null, 2), 'utf8');
  await fsPromises.rename(temporaryPath, ORDER_FILE);
}

function nowIso() {
  return new Date().toISOString();
}

function history(event: string, actor: string, at: string, detail?: string): OrderHistoryEntry {
  return { id: `history-${randomUUID()}`, event, at, actor, ...(detail ? { detail } : {}) };
}

function destinationTypeForCategory(category: OrderCategory): ClinicalOrder['destinationType'] {
  if (category === 'Laboratory') return 'LIMS';
  if (category === 'Imaging') return 'RIS/PACS';
  return 'Hospital service';
}

function normalized(value?: string) {
  return (value || '').trim().toLowerCase();
}

function dateValue(value?: string) {
  const parsed = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : undefined;
}

function isOpen(order: ClinicalOrder) {
  return !['completed', 'revoked', 'entered-in-error'].includes(order.fhirStatus);
}

function needsAction(order: ClinicalOrder) {
  return order.workflowStatus === 'Needs Signature' || order.workflowStatus === 'Delivery Issue' || order.result.reviewStatus === 'needs-review';
}

function inProgress(order: ClinicalOrder) {
  return ['Scheduled', 'Awaiting Collection', 'Collected', 'In Progress', 'Partial Result'].includes(order.workflowStatus);
}

function matchesStatus(order: ClinicalOrder, status?: string) {
  if (!status || status === 'all') return true;
  if (status === 'needs-action') return needsAction(order);
  if (status === 'pending') return ['Draft', 'Needs Signature', 'Ordered', 'Sent', 'Accepted', 'Awaiting Scheduling', 'Awaiting Collection', 'On Hold'].includes(order.workflowStatus);
  if (status === 'in-progress') return inProgress(order);
  if (status === 'completed') return order.fhirStatus === 'completed' || order.workflowStatus === 'Completed';
  if (status === 'cancelled') return ['revoked', 'entered-in-error'].includes(order.fhirStatus) || ['Cancelled', 'Entered in Error'].includes(order.workflowStatus);
  if (status === 'delivery-issues') return order.transmission.state === 'failed' || order.workflowStatus === 'Delivery Issue';
  return order.workflowStatus.toLowerCase() === status.toLowerCase() || order.fhirStatus === status;
}

export function filterOrders(orders: ClinicalOrder[], filters: OrderFilters = {}) {
  const query = normalized(filters.q);
  const dateFrom = dateValue(filters.dateFrom);
  const dateTo = dateValue(filters.dateTo);
  return orders.filter((order) => {
    if (filters.category && order.category !== filters.category) return false;
    if (!matchesStatus(order, filters.status)) return false;
    if (filters.priority && order.priority !== filters.priority) return false;
    if (filters.provider && order.orderingProvider !== filters.provider) return false;
    if (filters.destination && order.destination !== filters.destination) return false;
    if (filters.patientId && order.patientId !== filters.patientId) return false;
    if (dateFrom !== undefined && (dateValue(order.orderedAt) || 0) < dateFrom) return false;
    if (dateTo !== undefined && (dateValue(order.orderedAt) || 0) > dateTo + 86400000 - 1) return false;
    if (query) {
      const searchable = [order.patientName, order.patientMrn, order.orderName, order.orderCode, order.orderingProvider, order.destination, order.id, order.clinicalIndication].filter(Boolean).join(' ').toLowerCase();
      if (!searchable.includes(query)) return false;
    }
    return true;
  });
}

export function getOrderSnapshot(filters: OrderFilters = {}, now = new Date()): OrderSnapshot {
  const all = readOrdersSync();
  const filtered = filterOrders(all, filters);
  const providers = [...new Set(all.map((order) => order.orderingProvider))].sort();
  const destinations = [...new Set(all.map((order) => order.destination))].sort();
  const metrics = {
    open: filtered.filter(isOpen).length,
    needsAction: filtered.filter(needsAction).length,
    inProgress: filtered.filter(inProgress).length,
    completed: filtered.filter((order) => order.fhirStatus === 'completed').length,
    deliveryIssues: filtered.filter((order) => order.transmission.state === 'failed' || order.workflowStatus === 'Delivery Issue').length,
    urgent: filtered.filter((order) => ['Urgent', 'ASAP', 'STAT'].includes(order.priority)).length,
  };
  return { data: filtered, total: filtered.length, metrics, availableFilters: { providers, destinations }, generatedAt: now.toISOString() };
}

export async function createClinicalOrder(input: CreateOrderInput, actor: { id: string; name: string }, patient: OrderPatientIdentity) {
  const items = await readOrders();
  if (input.idempotencyKey) {
    const existing = items.find((order) => order.idempotencyKey === input.idempotencyKey);
    if (existing) return { order: existing, reused: true };
  }
  const timestamp = nowIso();
  const order: ClinicalOrder = {
    id: `order-${randomUUID()}`,
    version: 1,
    patientId: input.patientId,
    patientName: patient.name,
    patientMrn: patient.mrn,
    patientBirthDate: patient.birthDate,
    orderCode: input.orderCode?.trim() || undefined,
    orderName: input.orderName.trim(),
    category: input.category,
    priority: input.priority,
    orderedAt: timestamp,
    orderingProvider: input.orderingProvider.trim(),
    destination: input.destination.trim(),
    destinationType: input.destinationType || destinationTypeForCategory(input.category),
    clinicalIndication: input.clinicalIndication?.trim() || undefined,
    instructions: input.instructions?.trim() || undefined,
    specimenType: input.specimenType?.trim() || undefined,
    collectionLocation: input.collectionLocation?.trim() || undefined,
    bodySite: input.bodySite?.trim() || undefined,
    laterality: input.laterality?.trim() || undefined,
    contrast: input.contrast?.trim() || undefined,
    requestedDate: input.requestedDate?.trim() || undefined,
    fhirStatus: 'draft',
    workflowStatus: 'Needs Signature',
    transmission: { state: 'not-sent', attempts: 0 },
    result: { status: 'no-result', reviewStatus: 'not-applicable' },
    nextStep: 'Needs clinician signature',
    history: [history('Order created', actor.name, timestamp, 'FHIR ServiceRequest draft prepared')],
    createdBy: actor.name,
    source: 'local',
    idempotencyKey: input.idempotencyKey,
    updatedAt: timestamp,
  };
  await writeOrders(mergeOrders(items, [order]));
  return { order, reused: false };
}

export class OrderConflictError extends Error {
  constructor() {
    super('This order was updated by another user. Refresh the order and try again.');
    this.name = 'OrderConflictError';
  }
}

export class OrderActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OrderActionError';
  }
}

export type OrderAction = 'sign' | 'send' | 'resend' | 'schedule' | 'collect' | 'start' | 'complete' | 'review-result' | 'hold' | 'resume' | 'cancel';

export type OrderExternalEvent = {
  event: 'accepted' | 'failed' | 'scheduled' | 'collected' | 'in-progress' | 'completed' | 'result' | 'result-reviewed';
  eventId?: string;
  at?: string;
  patientId?: string;
  failure?: string;
  resourceType?: 'DiagnosticReport' | 'Observation';
  resourceId?: string;
  resultStatus?: ResultStatus;
  resultDisplay?: string;
  collectedAt?: string;
  finalizedAt?: string;
};

export async function applyOrderAction(orderId: string, action: OrderAction, actor: { id: string; name: string }, expectedVersion?: number) {
  const items = await readOrders();
  const index = items.findIndex((order) => order.id === orderId);
  if (index < 0) throw new OrderActionError('Order not found.');
  const current = items[index];
  if (expectedVersion !== undefined && expectedVersion !== current.version) throw new OrderConflictError();
  if (action === 'sign' && current.fhirStatus !== 'draft') throw new OrderActionError('Only draft orders can be signed.');
  if (action === 'review-result' && !['final', 'corrected', 'amended'].includes(current.result.status)) throw new OrderActionError('There is no final result available to review.');
  if (action === 'cancel' && current.fhirStatus === 'completed') throw new OrderActionError('Completed orders cannot be cancelled.');
  if (action === 'send' && current.fhirStatus === 'draft') throw new OrderActionError('Sign the order before sending it.');
  if (action === 'resend' && current.transmission.state !== 'failed') throw new OrderActionError('Only failed transmissions can be resent.');

  const timestamp = nowIso();
  const next: ClinicalOrder = { ...current, version: current.version + 1, transmission: { ...current.transmission }, result: { ...current.result }, history: [...current.history], updatedAt: timestamp };
  if (action === 'sign') {
    next.fhirStatus = 'active';
    next.workflowStatus = 'Ordered';
    next.signedBy = actor.name;
    next.signedAt = timestamp;
    next.transmission = { ...next.transmission, state: 'queued', attempts: next.transmission.attempts, destinationSystem: next.destination, correlationId: next.transmission.correlationId || `corr-${randomUUID()}` };
    next.nextStep = 'Awaiting destination acceptance';
    next.history.push(history('Order signed', actor.name, timestamp, 'FHIR ServiceRequest activated'));
  } else if (action === 'send' || action === 'resend') {
    next.fhirStatus = next.fhirStatus === 'draft' ? 'active' : next.fhirStatus;
    next.workflowStatus = 'Sent';
    next.transmission = { ...next.transmission, state: 'queued', attempts: next.transmission.attempts + 1, lastAttemptAt: timestamp, nextRetryAt: undefined, failure: undefined, destinationSystem: next.destination, correlationId: next.transmission.correlationId || `corr-${randomUUID()}` };
    next.nextStep = 'Awaiting destination acceptance';
    next.history.push(history(action === 'resend' ? 'Transmission retry queued' : 'Order transmission queued', actor.name, timestamp, `${next.destinationType} destination`));
  } else if (action === 'schedule') {
    if (next.fhirStatus !== 'active') throw new OrderActionError('Only active orders can be scheduled.');
    next.workflowStatus = 'Scheduled';
    next.nextStep = next.category === 'Imaging' ? 'Await scheduled imaging appointment' : 'Await scheduled procedure';
    next.history.push(history('Order scheduled', actor.name, timestamp));
  } else if (action === 'collect') {
    if (next.category !== 'Laboratory') throw new OrderActionError('Only laboratory orders can have specimens collected.');
    if (next.fhirStatus !== 'active') throw new OrderActionError('Only active laboratory orders can be collected.');
    next.workflowStatus = 'Collected';
    next.nextStep = 'Processing';
    next.history.push(history('Specimen collected', actor.name, timestamp));
  } else if (action === 'start') {
    next.workflowStatus = 'In Progress';
    next.nextStep = 'Await result';
    next.history.push(history('Processing started', actor.name, timestamp));
  } else if (action === 'complete') {
    next.fhirStatus = 'completed';
    next.workflowStatus = 'Completed';
    next.nextStep = next.result.status === 'no-result' ? 'No result linked' : next.result.reviewStatus === 'needs-review' ? 'Review result' : 'No further order action';
    next.history.push(history('Order completed', actor.name, timestamp));
  } else if (action === 'review-result') {
    next.result.reviewStatus = 'reviewed';
    next.nextStep = 'No further result review action';
    next.history.push(history('Result reviewed', actor.name, timestamp));
  } else if (action === 'hold') {
    if (!isOpen(next)) throw new OrderActionError('Closed orders cannot be placed on hold.');
    next.fhirStatus = 'on-hold';
    next.workflowStatus = 'On Hold';
    next.nextStep = 'Resolve hold before continuing';
    next.history.push(history('Order placed on hold', actor.name, timestamp));
  } else if (action === 'resume') {
    if (next.fhirStatus !== 'on-hold') throw new OrderActionError('Only on-hold orders can be resumed.');
    next.fhirStatus = 'active';
    next.workflowStatus = 'Ordered';
    next.nextStep = 'Resume destination workflow';
    next.history.push(history('Order resumed', actor.name, timestamp));
  } else if (action === 'cancel') {
    next.fhirStatus = 'revoked';
    next.workflowStatus = 'Cancelled';
    next.nextStep = 'No further order action';
    next.history.push(history('Order cancelled', actor.name, timestamp));
  }
  items[index] = next;
  await writeOrders(items);
  return next;
}

export async function applyOrderExternalEvent(orderId: string, payload: OrderExternalEvent, actor: { id: string; name: string }) {
  const items = await readOrders();
  const index = items.findIndex((order) => order.id === orderId);
  if (index < 0) throw new OrderActionError('Order not found.');
  const current = items[index];
  if (payload.patientId && payload.patientId !== current.patientId) throw new OrderActionError('The external event belongs to a different patient.');
  if (payload.eventId && current.history.some((entry) => entry.detail?.includes(`eventId:${payload.eventId}`))) return current;
  if (payload.event === 'result' && (!payload.resourceType || !payload.resourceId || !payload.resultStatus || payload.resultStatus === 'no-result')) throw new OrderActionError('A linked result requires a resource type, resource ID, and result status.');
  if (payload.event === 'collected' && current.category !== 'Laboratory') throw new OrderActionError('Only laboratory orders can receive a collection event.');
  const eventAt = payload.at && dateValue(payload.at) !== undefined ? payload.at : nowIso();
  const eventDetail = payload.eventId ? `eventId:${payload.eventId}` : undefined;
  const next: ClinicalOrder = { ...current, version: current.version + 1, transmission: { ...current.transmission }, result: { ...current.result }, history: [...current.history], updatedAt: eventAt };
  if (payload.event === 'accepted') {
    next.transmission = { ...next.transmission, state: 'accepted', attempts: Math.max(1, next.transmission.attempts), acceptedAt: eventAt, destinationSystem: next.destination, failure: undefined, nextRetryAt: undefined };
    next.workflowStatus = 'Accepted';
    next.nextStep = next.category === 'Laboratory' ? 'Collect specimen' : next.category === 'Imaging' ? 'Schedule imaging' : 'Perform diagnostic test';
  } else if (payload.event === 'failed') {
    next.transmission = { ...next.transmission, state: 'failed', failure: payload.failure || 'Destination reported a delivery failure.', lastAttemptAt: eventAt, nextRetryAt: undefined };
    next.workflowStatus = 'Delivery Issue';
    next.nextStep = 'Retry transmission';
  } else if (payload.event === 'scheduled') {
    next.workflowStatus = 'Scheduled';
    next.nextStep = 'Await scheduled appointment';
  } else if (payload.event === 'collected') {
    next.workflowStatus = 'Collected';
    next.nextStep = 'Processing';
  } else if (payload.event === 'in-progress') {
    next.workflowStatus = 'In Progress';
    next.nextStep = 'Await result';
  } else if (payload.event === 'completed') {
    next.fhirStatus = 'completed';
    next.workflowStatus = 'Completed';
    next.nextStep = next.result.reviewStatus === 'needs-review' ? 'Review result' : next.result.status === 'no-result' ? 'No result linked' : 'No further order action';
  } else if (payload.event === 'result') {
    const resultStatus = payload.resultStatus!;
    next.result = { ...next.result, status: resultStatus, reviewStatus: ['final', 'corrected', 'amended'].includes(resultStatus) ? 'needs-review' : 'not-applicable', resourceType: payload.resourceType, resourceId: payload.resourceId, display: payload.resultDisplay, collectedAt: payload.collectedAt, finalizedAt: payload.finalizedAt };
    if (['final', 'corrected', 'amended'].includes(resultStatus)) {
      next.fhirStatus = 'completed';
      next.workflowStatus = 'Completed';
      next.nextStep = 'Review result';
    } else {
      next.workflowStatus = 'Partial Result';
      next.nextStep = 'Await final result';
    }
  } else if (payload.event === 'result-reviewed') {
    if (next.result.status === 'no-result') throw new OrderActionError('There is no result available to review.');
    next.result.reviewStatus = 'reviewed';
    next.nextStep = 'No further result review action';
  }
  next.history.push(history(payload.event === 'result' ? 'Result linked' : payload.event === 'result-reviewed' ? 'Result review recorded' : `Destination event: ${payload.event}`, actor.name, eventAt, eventDetail));
  items[index] = next;
  await writeOrders(items);
  return next;
}

export function buildServiceRequest(order: ClinicalOrder) {
  return {
    resourceType: 'ServiceRequest',
    id: `sr-${order.id}`,
    status: order.fhirStatus,
    intent: 'order',
    priority: order.priority.toLowerCase() === 'routine' ? 'routine' : order.priority.toLowerCase() === 'stat' ? 'stat' : 'urgent',
    subject: order.patientId ? { reference: `Patient/${order.patientId}`, display: order.patientName } : undefined,
    code: { coding: order.orderCode ? [{ system: 'urn:roshi:order-catalog', code: order.orderCode, display: order.orderName }] : undefined, text: order.orderName },
    authoredOn: order.orderedAt,
    requester: { display: order.orderingProvider },
    reasonCode: order.clinicalIndication ? [{ text: order.clinicalIndication }] : undefined,
    note: order.instructions ? [{ text: order.instructions }] : undefined,
  };
}

export function orderPatientReference(order: ClinicalOrder) {
  return order.patientId ? `Patient/${order.patientId}` : undefined;
}
