import type { AppointmentRecord, Patient } from '@/app/dashboard/records/mockPatients';

export type VisitLifecycle = 'completed' | 'cancelled' | 'no-show' | 'in-progress' | 'entered-in-error' | 'other';
export type VisitSource = 'encounter' | 'completed-appointment';
export type VisitDocumentationStatus = 'signed' | 'draft' | 'pending-signature' | 'not-started' | 'addended' | 'not-documented';

export interface VisitHistoryItem {
  id: string;
  patientId: string;
  encounterId?: string;
  appointmentId?: string;
  date: string;
  start?: string;
  end?: string;
  type: string;
  reason?: string;
  provider?: { display: string };
  location?: string;
  department?: string;
  modality?: AppointmentRecord['modality'];
  lifecycle: VisitLifecycle;
  source: VisitSource;
  documentation: {
    status: VisitDocumentationStatus;
    noteId?: string;
    author?: string;
    signedAt?: string;
    lastSavedAt?: string;
  };
  followUp: {
    openTasks: number;
    tasks: Array<{ id: string; title: string; dueDate?: string; assignee?: string; status?: string }>;
    nextAppointment?: {
      id: string;
      date: string;
      end?: string;
      type: string;
      provider?: string;
    };
  };
  provenance: {
    recordedBy?: string;
    sourceSystem: string;
  };
  recordHref?: string;
}

export interface VisitHistorySummary {
  totalVisits: number;
  completedVisits: number;
  cancelledVisits: number;
  noShows: number;
  providersSeen: number;
  openFollowUps: number;
  lastVisit?: VisitHistoryItem;
}

export interface VisitHistoryFilters {
  query?: string;
  type?: string;
  provider?: string;
  status?: string;
  range?: string;
  sort?: 'newest' | 'oldest' | 'provider' | 'type' | 'updated';
}

export interface VisitHistoryModel {
  items: VisitHistoryItem[];
  allItems: VisitHistoryItem[];
  summary: VisitHistorySummary;
  filterOptions: { types: string[]; providers: string[] };
}

function normalizeLifecycle(status?: string): VisitLifecycle {
  const normalized = (status || '').toLowerCase().replace(/[_\s]+/g, '-');
  if (normalized === 'completed' || normalized === 'complete' || normalized === 'finished') return 'completed';
  if (normalized === 'cancelled' || normalized === 'canceled') return 'cancelled';
  if (normalized === 'no-show' || normalized === 'noshow') return 'no-show';
  if (normalized === 'in-progress' || normalized === 'inprogress') return 'in-progress';
  if (normalized === 'entered-in-error') return 'entered-in-error';
  return 'other';
}

function documentationFromAppointment(appointment: AppointmentRecord): VisitHistoryItem['documentation'] {
  const documentation = appointment.documentation;
  if (!documentation) return { status: 'not-documented' };
  return {
    status: documentation.status,
    noteId: documentation.noteId,
    author: documentation.author,
    signedAt: documentation.signedAt,
    lastSavedAt: documentation.lastSavedAt,
  };
}

function mapAppointment(patientId: string, appointment: AppointmentRecord, appointments: AppointmentRecord[]): VisitHistoryItem | null {
  const lifecycle = normalizeLifecycle(appointment.status);
  if (!['completed', 'cancelled', 'no-show', 'in-progress', 'entered-in-error'].includes(lifecycle)) return null;

  const nextAppointment = appointment.nextAppointmentId
    ? appointments.find((candidate) => candidate.id === appointment.nextAppointmentId && Date.parse(candidate.date) > Date.now())
    : undefined;
  const followUpTasks = (appointment.followUp || []).map((task) => ({
    id: task.id,
    title: task.title,
    dueDate: task.dueDate,
    assignee: task.assignee,
    status: task.status,
  }));

  return {
    id: `appointment-${appointment.id}`,
    patientId,
    appointmentId: appointment.id,
    date: appointment.date,
    start: appointment.date,
    end: appointment.end,
    type: appointment.type || 'Visit',
    reason: appointment.prep,
    provider: appointment.doctor ? { display: appointment.doctor } : undefined,
    location: appointment.location,
    department: appointment.department,
    modality: appointment.modality,
    lifecycle,
    source: 'completed-appointment',
    documentation: documentationFromAppointment(appointment),
    followUp: {
      openTasks: followUpTasks.filter((task) => task.status !== 'done').length,
      tasks: followUpTasks,
      nextAppointment: nextAppointment
        ? { id: nextAppointment.id, date: nextAppointment.date, end: nextAppointment.end, type: nextAppointment.type, provider: nextAppointment.doctor }
        : undefined,
    },
    provenance: { recordedBy: appointment.bookedBy, sourceSystem: 'EHR Scheduling' },
    recordHref: appointment.id ? `/dashboard/records/${patientId}/appointments/${encodeURIComponent(appointment.id)}` : undefined,
  };
}

function mapLegacyEncounter(patientId: string, patient: Patient, history: NonNullable<Patient['history']>[number]): VisitHistoryItem {
  const matchingNote = (patient.notes || []).find((note) => note.date === history.date && note.author === history.provider);
  return {
    id: `encounter-${history.id}`,
    patientId,
    date: history.date,
    type: history.reason || 'Clinical visit',
    reason: history.reason,
    provider: history.provider ? { display: history.provider } : undefined,
    lifecycle: normalizeLifecycle(history.status || 'completed'),
    source: 'encounter',
    documentation: matchingNote
      ? {
          status: matchingNote.status?.toLowerCase() === 'signed' ? 'signed' : 'draft',
          noteId: matchingNote.id,
          author: matchingNote.author,
          signedAt: matchingNote.status?.toLowerCase() === 'signed' ? matchingNote.date : undefined,
        }
      : { status: 'not-documented' },
    followUp: { openTasks: 0, tasks: [] },
    provenance: { recordedBy: history.provider, sourceSystem: 'EHR Encounters' },
    recordHref: `/dashboard/records/${patientId}/history?visit=${encodeURIComponent(history.id)}`,
  };
}

function dateValue(value?: string) {
  const parsed = value ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

function sortItems(items: VisitHistoryItem[], sort: VisitHistoryFilters['sort'] = 'newest') {
  return items.sort((left, right) => {
    if (sort === 'oldest') return dateValue(left.date) - dateValue(right.date);
    if (sort === 'provider') return (left.provider?.display || '').localeCompare(right.provider?.display || '') || dateValue(right.date) - dateValue(left.date);
    if (sort === 'type') return left.type.localeCompare(right.type) || dateValue(right.date) - dateValue(left.date);
    if (sort === 'updated') return dateValue(right.documentation.lastSavedAt || right.documentation.signedAt || right.date) - dateValue(left.documentation.lastSavedAt || left.documentation.signedAt || left.date);
    return dateValue(right.date) - dateValue(left.date);
  });
}

function isWithinRange(date: string, range?: string) {
  if (!range || range === 'all') return true;
  const days = { '30d': 30, '90d': 90, '6m': 183, '1y': 365, '2y': 730 }[range as '30d' | '90d' | '6m' | '1y' | '2y'];
  if (!days) return true;
  return dateValue(date) >= Date.now() - days * 24 * 60 * 60 * 1000;
}

export function buildVisitHistory(patientId: string, patient: Patient, filters: VisitHistoryFilters = {}): VisitHistoryModel {
  const appointments = patient.upcoming || [];
  const appointmentItems = appointments.map((appointment) => mapAppointment(patientId, appointment, appointments)).filter((item): item is VisitHistoryItem => Boolean(item));
  const legacyItems = (patient.history || []).map((history) => mapLegacyEncounter(patientId, patient, history));
  const byId = new Map<string, VisitHistoryItem>();
  [...legacyItems, ...appointmentItems].forEach((item) => byId.set(item.id, item));
  const allItems = sortItems(Array.from(byId.values()));
  const completed = allItems.filter((item) => item.lifecycle === 'completed');
  const providers = Array.from(new Set(allItems.map((item) => item.provider?.display).filter((value): value is string => Boolean(value)))).sort();
  const types = Array.from(new Set(allItems.map((item) => item.type))).sort();
  const summary: VisitHistorySummary = {
    totalVisits: allItems.length,
    completedVisits: completed.length,
    cancelledVisits: allItems.filter((item) => item.lifecycle === 'cancelled').length,
    noShows: allItems.filter((item) => item.lifecycle === 'no-show').length,
    providersSeen: providers.length,
    openFollowUps: allItems.reduce((count, item) => count + item.followUp.openTasks, 0),
    lastVisit: completed[0],
  };

  const query = filters.query?.trim().toLowerCase();
  const filtered = allItems.filter((item) => {
    const haystack = [item.type, item.reason, item.provider?.display, item.location, item.department, item.documentation.author].filter(Boolean).join(' ').toLowerCase();
    return (!query || haystack.includes(query))
      && (!filters.type || filters.type === 'all' || item.type === filters.type)
      && (!filters.provider || filters.provider === 'all' || item.provider?.display === filters.provider)
      && (!filters.status || filters.status === 'all' || item.lifecycle === filters.status)
      && isWithinRange(item.date, filters.range);
  });

  return { items: sortItems(filtered, filters.sort), allItems, summary, filterOptions: { types, providers } };
}