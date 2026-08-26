import type { Patient, ChartActivityRecord } from '@/app/dashboard/records/mockPatients';

export type ActivityCategory = 'note' | 'document' | 'result' | 'appointment' | 'medication' | 'task' | 'condition' | 'care-gap' | 'care-plan' | 'order' | 'referral' | 'message' | 'encounter' | 'other';
export type ActivitySort = 'newest' | 'oldest' | 'updated' | 'category' | 'actor' | 'actionable';

export interface ChartActivityEvent {
  id: string;
  patientId: string;
  occurredAt: string;
  category: ActivityCategory;
  action: string;
  title: string;
  actor?: { display: string; role?: string };
  sourceRecord?: { type: string; id: string; display?: string };
  organization?: string;
  status?: string;
  isActionable: boolean;
  attentionReason?: string;
  sourceSystem: string;
  recordHref?: string;
  correlationKey?: string;
}

export interface ChartActivityFilters {
  query?: string;
  category?: string;
  actor?: string;
  range?: string;
  sinceLastVisit?: boolean;
  sort?: ActivitySort;
}

export interface ChartActivityModel {
  items: ChartActivityEvent[];
  allItems: ChartActivityEvent[];
  summary: {
    recentActivity: number;
    needsAction: number;
    documentChanges: number;
    latestActivity?: ChartActivityEvent;
  };
  filterOptions: { categories: ActivityCategory[]; actors: string[] };
  lastVisit?: string;
}

function categoryFromResource(resourceType?: string): ActivityCategory {
  const value = (resourceType || '').toLowerCase().replace(/[^a-z-]/g, '');
  if (value.includes('note') || value.includes('documentreference')) return value.includes('document') ? 'document' : 'note';
  if (value.includes('result') || value.includes('observation') || value.includes('diagnostic')) return 'result';
  if (value.includes('appointment')) return 'appointment';
  if (value.includes('medication')) return 'medication';
  if (value.includes('task')) return 'task';
  if (value.includes('condition')) return 'condition';
  if (value.includes('caregap')) return 'care-gap';
  if (value.includes('careplan')) return 'care-plan';
  if (value.includes('order') || value.includes('servicerequest')) return 'order';
  if (value.includes('referral')) return 'referral';
  if (value.includes('message') || value.includes('communication')) return 'message';
  if (value.includes('encounter')) return 'encounter';
  return 'other';
}

function cleanTitle(action: string) {
  return action.trim().replace(/[.!?]+$/, '') || 'Chart activity recorded';
}

function sourceHref(patientId: string, category: ActivityCategory, sourceId?: string) {
  if (category === 'document' && sourceId) return `/dashboard/records/${encodeURIComponent(patientId)}/documents?documentId=${encodeURIComponent(sourceId)}`;
  if (category === 'note' && sourceId) return `/dashboard/records/${encodeURIComponent(patientId)}/doctor-notes?noteId=${encodeURIComponent(sourceId)}`;
  if (category === 'result' && sourceId) return `/dashboard/records/${encodeURIComponent(patientId)}/labs/${encodeURIComponent(sourceId)}`;
  if (category === 'appointment' && sourceId) return `/dashboard/records/${encodeURIComponent(patientId)}/appointments/${encodeURIComponent(sourceId)}`;
  if (category === 'medication') return `/dashboard/records/${encodeURIComponent(patientId)}/medications`;
  if (category === 'task') return `/dashboard/records/${encodeURIComponent(patientId)}/tasks`;
  if (category === 'condition' || category === 'care-gap') return `/dashboard/records/${encodeURIComponent(patientId)}/${category === 'condition' ? 'conditions' : 'care-gaps'}`;
  return undefined;
}

function parseTime(value?: string) {
  const time = value ? Date.parse(value) : NaN;
  return Number.isFinite(time) ? time : 0;
}

function lastCompletedVisit(patient: Patient) {
  const dates = [
    ...(patient.history || []).filter((item) => (item.status || 'Completed').toLowerCase() === 'completed').map((item) => item.date),
    ...(patient.upcoming || []).filter((item) => (item.status || '').toLowerCase() === 'completed').map((item) => item.date),
  ];
  return dates.sort((left, right) => parseTime(right) - parseTime(left))[0];
}

function mapLegacyActivity(patientId: string, activity: ChartActivityRecord): ChartActivityEvent {
  const category = categoryFromResource(activity.resourceType);
  const sourceId = activity.sourceRecordId;
  return {
    id: activity.id,
    patientId,
    occurredAt: activity.date,
    category,
    action: activity.action,
    title: cleanTitle(activity.action),
    actor: activity.user ? { display: activity.user, role: activity.actorRole } : undefined,
    sourceRecord: sourceId ? { id: sourceId, type: activity.sourceRecordType || activity.resourceType || 'Chart record', display: activity.sourceRecordDisplay } : undefined,
    organization: activity.organization,
    status: activity.status || (category === 'result' ? 'Reviewed' : category === 'appointment' ? 'Scheduled' : category === 'medication' ? 'Reconciled' : 'Updated'),
    isActionable: Boolean(activity.isActionable),
    attentionReason: activity.attentionReason,
    sourceSystem: 'EHR Chart Activity',
    recordHref: sourceHref(patientId, category, sourceId),
  };
}

function sortEvents(items: ChartActivityEvent[], sort: ActivitySort = 'newest') {
  return items.sort((left, right) => {
    if (sort === 'oldest') return parseTime(left.occurredAt) - parseTime(right.occurredAt);
    if (sort === 'category') return left.category.localeCompare(right.category) || parseTime(right.occurredAt) - parseTime(left.occurredAt);
    if (sort === 'actor') return (left.actor?.display || '').localeCompare(right.actor?.display || '') || parseTime(right.occurredAt) - parseTime(left.occurredAt);
    if (sort === 'actionable') return Number(right.isActionable) - Number(left.isActionable) || parseTime(right.occurredAt) - parseTime(left.occurredAt);
    if (sort === 'updated') return parseTime(right.occurredAt) - parseTime(left.occurredAt);
    return parseTime(right.occurredAt) - parseTime(left.occurredAt);
  });
}

function inRange(value: string, range?: string) {
  if (!range || range === 'all') return true;
  const days = ({ today: 1, '7d': 7, '30d': 30, '90d': 90, '6m': 183, '1y': 365 } as Record<string, number>)[range];
  return !days || parseTime(value) >= Date.now() - days * 86400000;
}

export function buildChartActivity(patientId: string, patient: Patient, stored: ChartActivityEvent[] = [], filters: ChartActivityFilters = {}): ChartActivityModel {
  const seeded = (patient.chartActivity || []).map((activity) => mapLegacyActivity(patientId, activity));
  const byId = new Map<string, ChartActivityEvent>();
  [...seeded, ...stored].forEach((event) => byId.set(event.id, event));
  const allItems = sortEvents(Array.from(byId.values()));
  const lastVisit = lastCompletedVisit(patient);
  const recentCutoff = Date.now() - 30 * 86400000;
  const summary = {
    recentActivity: allItems.filter((event) => parseTime(event.occurredAt) >= recentCutoff).length,
    needsAction: allItems.filter((event) => event.isActionable).length,
    documentChanges: allItems.filter((event) => event.category === 'document').length,
    latestActivity: allItems[0],
  };
  const categories = Array.from(new Set(allItems.map((event) => event.category))).sort() as ActivityCategory[];
  const actors = Array.from(new Set(allItems.map((event) => event.actor?.display).filter((actor): actor is string => Boolean(actor)))).sort();
  const query = filters.query?.trim().toLowerCase();
  const items = sortEvents(allItems.filter((event) => {
    const haystack = [event.title, event.action, event.actor?.display, event.sourceRecord?.display, event.sourceRecord?.type, event.category, event.organization].filter(Boolean).join(' ').toLowerCase();
    return (!query || haystack.includes(query))
      && (!filters.category || filters.category === 'all' || event.category === filters.category)
      && (!filters.actor || filters.actor === 'all' || event.actor?.display === filters.actor)
      && inRange(event.occurredAt, filters.range)
      && (!filters.sinceLastVisit || !lastVisit || parseTime(event.occurredAt) >= parseTime(lastVisit));
  }), filters.sort);
  return { items, allItems, summary, filterOptions: { categories, actors }, lastVisit };
}

export function activityFromDocument(patientId: string, document: { id: string; title: string; type: string; source: string; status: string; uploadedAt?: string; author?: string; organization?: string }, action: string, actor: string, actionable = false): ChartActivityEvent {
  const isReview = action.toLowerCase().includes('review');
  return {
    id: `document-${document.id}-${isReview ? 'reviewed' : 'created'}`,
    patientId,
    occurredAt: document.uploadedAt || new Date().toISOString(),
    category: 'document',
    action,
    title: `${document.title} ${action.toLowerCase()}`,
    actor: { display: actor },
    sourceRecord: { id: document.id, type: document.type, display: document.title },
    organization: document.organization,
    status: document.status,
    isActionable: actionable,
    attentionReason: actionable ? 'Document workflow requires review.' : undefined,
    sourceSystem: 'EHR Documents',
    recordHref: sourceHref(patientId, 'document', document.id),
    correlationKey: `document:${document.id}:${isReview ? 'reviewed' : 'created'}`,
  };
}