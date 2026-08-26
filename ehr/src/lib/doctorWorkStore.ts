import { getMockPatients, getPatientById, type Patient } from '@/app/dashboard/records/mockPatients';
import { listDocuments, type PatientDocument } from '@/lib/documentStore';
import { listNotes } from '@/lib/doctorNotesStore';
import { listConcerns } from '@/lib/healthConcernsStore';
import { listTasks } from '@/lib/tasksStore';
import { listConversations, messageCounts, summarizeConversation } from '@/lib/messageStore';
import type { ClinicalTask } from '@/types/clinicalTask';
import type { DoctorNote } from '@/types/doctorNote';

export type DoctorWorkPriority = 'critical' | 'high' | 'normal' | 'low';
export type DoctorWorkStatus = 'open' | 'in-progress' | 'blocked' | 'failed' | 'completed' | 'cancelled' | 'overdue';
export type DoctorWorkKind = 'task' | 'result-review' | 'note-signature' | 'document-review';

export type DoctorWorkPatient = {
  id: string;
  name: string;
  mrn: string;
  href: string;
};

export type DoctorWorkItem = {
  id: string;
  kind: DoctorWorkKind;
  patient: DoctorWorkPatient;
  type: string;
  title: string;
  summary: string;
  priority: DoctorWorkPriority;
  status: DoctorWorkStatus;
  dueAt?: string;
  createdAt?: string;
  updatedAt?: string;
  assignedTo?: string;
  assignedBy?: string;
  sourceLabel: string;
  sourceHref?: string;
  sourceRecord?: { type: string; id: string; display?: string };
  relatedEncounter?: string;
  instructions?: string;
  history: Array<{ action: string; actor?: string; timestamp?: string }>;
  canonicalTask: boolean;
  canComplete: boolean;
};

export type DoctorDocumentWorkItem = {
  id: string;
  patient: DoctorWorkPatient;
  title: string;
  type: string;
  clinicalDate?: string;
  addedAt?: string;
  source: string;
  status: PatientDocument['status'];
  reviewStatus: 'needs-review' | 'reviewed' | 'restricted' | 'entered-in-error';
  href: string;
  author?: string;
  organization?: string;
  encounterDisplay?: string;
  version: number;
  reviewedBy?: string;
  reviewedAt?: string;
  restricted: boolean;
};

export type DoctorWorkSnapshot = {
  actor: { id: string; name: string; role: string };
  generatedAt: string;
  items: DoctorWorkItem[];
  counts: { open: number; urgent: number; dueToday: number; overdue: number; results: number; notes: number; documents: number; followUps: number };
  messages: { conversations: ReturnType<typeof summarizeConversation>[]; counts: Awaited<ReturnType<typeof messageCounts>> };
  documents: { items: DoctorDocumentWorkItem[]; counts: { needsReview: number; recentlyAdded: number; unread: number; restricted: number } };
  patients: DoctorWorkPatient[];
};

function patientReference(patientId: string): DoctorWorkPatient {
  const patient = getPatientById(patientId);
  return { id: patientId, name: patient?.name || 'Patient record unavailable', mrn: patient?.mrn || 'Not documented', href: `/dashboard/records/${encodeURIComponent(patientId)}` };
}

function dateTime(value?: string) {
  if (!value) return 0;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function sameDay(value: string | undefined, now: Date) {
  if (!value) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toDateString() === now.toDateString();
}

function openStatus(status?: string) {
  return !['completed', 'complete', 'cancelled', 'canceled', 'entered-in-error', 'resolved', 'closed', 'failed', 'rejected'].includes((status || '').toLowerCase().replace(/[\s_]+/g, '-'));
}

function priority(value?: string): DoctorWorkPriority {
  const normalized = (value || '').toLowerCase();
  if (normalized === 'urgent' || normalized === 'critical') return 'critical';
  if (normalized === 'high') return 'high';
  if (normalized === 'low' || normalized === 'routine') return 'low';
  return 'normal';
}

function status(value?: string, dueAt?: string, now = new Date()): DoctorWorkStatus {
  const normalized = (value || 'open').toLowerCase().replace(/[\s_]+/g, '-');
  if (['completed', 'complete'].includes(normalized)) return 'completed';
  if (['cancelled', 'canceled'].includes(normalized)) return 'cancelled';
  if (['failed', 'rejected'].includes(normalized)) return 'failed';
  if (normalized === 'blocked' || normalized === 'on-hold') return 'blocked';
  if (dueAt && dateTime(dueAt) < now.getTime() && openStatus(normalized)) return 'overdue';
  if (normalized === 'in-progress') return 'in-progress';
  return 'open';
}

function sourceHref(patientId: string, type: string, id: string) {
  const base = patientReference(patientId).href;
  const encoded = encodeURIComponent(id);
  if (type === 'Observation') return `${base}/labs?selected=${encoded}`;
  if (type === 'ClinicalNote' || type === 'DoctorNote') return `${base}/doctor-notes?noteId=${encoded}`;
  if (type === 'DocumentReference') return `${base}/documents?documentId=${encoded}`;
  if (type === 'Condition' || type === 'HealthConcern') return `${base}/conditions`;
  if (type === 'MedicationStatement') return `${base}/medications`;
  if (type === 'Condition') return `${base}/conditions`;
  if (type === 'CareGap') return `${base}/care-gaps`;
  return base;
}

function taskSource(task: ClinicalTask, patientId: string) {
  const resource = task.relatedResources?.[0];
  if (!resource) return undefined;
  return { type: resource.type, id: resource.id, display: resource.display, href: sourceHref(patientId, resource.type, resource.id) };
}

export function taskCanComplete(task: ClinicalTask) {
  const sourceLocked = Boolean(task.relatedResources?.length);
  return openStatus(task.status) && !sourceLocked;
}

export async function canCompleteTask(task: ClinicalTask) {
  if (!openStatus(task.status)) return false;
  if (!task.relatedResources?.length) return true;
  const patient = getPatientById(task.patientId);
  if (!patient) return false;
  for (const resource of task.relatedResources) {
    if (resource.type === 'Observation') {
      if (!(patient.labResults || []).some((lab) => lab.id === resource.id && Boolean(lab.reviewed))) return false;
    } else if (resource.type === 'ClinicalNote' || resource.type === 'DoctorNote') {
      const note = (await listNotes(task.patientId, patient)).find((item) => item.id === resource.id);
      if (!note || !['signed', 'amended', 'corrected'].includes(note.status)) return false;
    } else if (resource.type === 'DocumentReference') {
      const document = (await listDocuments(task.patientId, patient)).find((item) => item.id === resource.id);
      if (!document || ['needs-review', 'awaiting-signature', 'processing', 'failed', 'entered-in-error'].includes(document.status)) return false;
    } else if (resource.type === 'Condition' || resource.type === 'HealthConcern') {
      const concern = (await listConcerns(task.patientId, patient)).find((item) => item.id === resource.id);
      if (!concern || concern.clinicalStatus !== 'resolved') return false;
    } else {
      return false;
    }
  }
  return true;
}

export function canActorUpdateTask(task: ClinicalTask, actor: { id: string; name: string; role: string }) {
  if (actor.role === 'ADMIN' || actor.role === 'DEV') return true;
  if (!task.assignee) return false;
  return task.assignee.id === actor.id || task.assignee.name?.toLowerCase() === actor.name.toLowerCase();
}

export function canAccessTaskPatient(patientId: string, actor?: { id: string; name: string; role: string }) {
  const configured = (process.env.TASK_WORKSPACE_PATIENT_IDS || '').split(',').map((value) => value.trim()).filter(Boolean);
  if (configured.length && !configured.includes(patientId)) return false;
  if (actor?.role === 'ADMIN') return true;
  if (actor?.role === 'DEV' && process.env.NODE_ENV !== 'production') return true;
  const patient = getPatientById(patientId);
  if (!patient) return false;
  const actorMatches = (member?: { id?: string; name?: string } | null) => Boolean(member && (member.id === actor?.id || (member.name && member.name.toLowerCase() === actor?.name.toLowerCase())));
  if (actor && ((patient.careTeam || []).some(actorMatches) || actorMatches({ name: patient.lastAttendingDoctor }))) return true;
  return process.env.NODE_ENV === 'test' && !patient.careTeam?.length;
}

export async function validateTaskSources(patientId: string, resources: ClinicalTask['relatedResources']) {
  if (!resources?.length) return true;
  const patient = getPatientById(patientId);
  if (!patient) return false;
  for (const resource of resources) {
    if (resource.type === 'Observation') {
      if (!(patient.labResults || []).some((lab) => lab.id === resource.id)) return false;
    } else if (resource.type === 'ClinicalNote' || resource.type === 'DoctorNote') {
      if (!(await listNotes(patientId, patient)).some((note) => note.id === resource.id)) return false;
    } else if (resource.type === 'DocumentReference') {
      if (!(await listDocuments(patientId, patient)).some((document) => document.id === resource.id)) return false;
    } else if (resource.type === 'Condition' || resource.type === 'HealthConcern') {
      if (!(await listConcerns(patientId, patient)).some((concern) => concern.id === resource.id)) return false;
    } else {
      return false;
    }
  }
  return true;
}

async function taskItem(task: ClinicalTask, now: Date): Promise<DoctorWorkItem> {
  const patient = patientReference(task.patientId);
  const related = taskSource(task, task.patientId);
  return { id: `task:${task.patientId}:${task.id}`, kind: 'task', patient, type: task.category || 'Clinical Task', title: task.title, summary: task.description || 'No instructions documented.', priority: priority(task.priority), status: status(task.status, task.dueDate || undefined, now), dueAt: task.dueDate || undefined, createdAt: task.createdAt, updatedAt: task.updatedAt, assignedTo: task.assignee?.name, assignedBy: task.requester?.name, sourceLabel: related?.display || task.category || 'Clinical task', sourceHref: related?.href || `${patient.href}/tasks?taskId=${encodeURIComponent(task.id)}`, sourceRecord: related ? { type: related.type, id: related.id, display: related.display } : undefined, relatedEncounter: undefined, instructions: task.description, history: (task.history || []).map((entry) => ({ action: entry.action, actor: entry.userName || entry.userId, timestamp: entry.timestamp })), canonicalTask: true, canComplete: await canCompleteTask(task) };
}

function derivedSourceIds(tasks: ClinicalTask[]) {
  return new Set(tasks.flatMap((task) => (task.relatedResources || []).map((resource) => resource.id)));
}

function resultItems(patient: Patient, tasks: ClinicalTask[], now: Date): DoctorWorkItem[] {
  const taskSources = derivedSourceIds(tasks);
  return (patient.labResults || []).filter((lab) => !lab.reviewed && /(critical|panic|high|low|abnormal|hh|ll)/i.test(lab.interpretation || '') && !taskSources.has(lab.id)).map((lab) => ({ id: `result:${patient.id}:${lab.id}`, kind: 'result-review', patient: patientReference(patient.id), type: 'Result Review', title: `Review ${lab.name}`, summary: `${lab.result}${lab.unit ? ` ${lab.unit}` : ''}${lab.interpretation ? ` · ${lab.interpretation}` : ''}`, priority: priority(lab.interpretation), status: status('open', lab.date, now), dueAt: lab.date, createdAt: lab.date, sourceLabel: lab.name, sourceHref: sourceHref(patient.id, 'Observation', lab.id), sourceRecord: { type: 'Observation', id: lab.id, display: lab.name }, history: [], canonicalTask: false, canComplete: false }));
}

function noteItems(patient: Patient, notes: DoctorNote[], tasks: ClinicalTask[], now: Date): DoctorWorkItem[] {
  const taskSources = derivedSourceIds(tasks);
  return notes.filter((note) => ['draft', 'pending-signature'].includes(note.status) && !taskSources.has(note.id)).map((note) => ({ id: `note:${patient.id}:${note.id}`, kind: 'note-signature', patient: patientReference(patient.id), type: 'Note Signature', title: `${note.type} note requires signature`, summary: 'Clinical note is not signed.', priority: 'normal', status: status('open', note.updatedAt, now), dueAt: note.updatedAt, createdAt: note.createdAt, assignedTo: note.signer?.name || note.author.name, assignedBy: note.author.name, sourceLabel: note.author.name, sourceHref: sourceHref(patient.id, 'ClinicalNote', note.id), sourceRecord: { type: 'ClinicalNote', id: note.id, display: `${note.type} note` }, relatedEncounter: note.encounterId || undefined, history: (note.history || []).map((entry) => ({ action: entry.action, actor: entry.actor.name, timestamp: entry.timestamp })), canonicalTask: false, canComplete: false }));
}

function documentItems(patient: Patient, documents: PatientDocument[]): DoctorDocumentWorkItem[] {
  return documents.map((document) => ({ id: document.id, patient: patientReference(patient.id), title: document.title, type: document.type, clinicalDate: document.clinicalDate, addedAt: document.uploadedAt || document.createdAt, source: document.organization || document.source, status: document.status, reviewStatus: document.status === 'entered-in-error' ? 'entered-in-error' : ['needs-review', 'awaiting-signature', 'failed'].includes(document.status) ? 'needs-review' : 'reviewed', href: `${patientReference(patient.id).href}/documents?documentId=${encodeURIComponent(document.id)}`, author: document.author, organization: document.organization, encounterDisplay: document.encounterDisplay, version: document.version, reviewedBy: document.reviewedBy, reviewedAt: document.reviewedAt, restricted: false }));
}

function documentWorkItems(documents: DoctorDocumentWorkItem[]): DoctorWorkItem[] {
  return documents.filter((document) => document.reviewStatus === 'needs-review').map((document) => ({ id: `document:${document.patient.id}:${document.id}`, kind: 'document-review', patient: document.patient, type: 'Document Review', title: `Review ${document.title}`, summary: `${document.type} requires review.`, priority: document.status === 'failed' ? 'high' : 'normal', status: 'open', dueAt: document.clinicalDate, createdAt: document.clinicalDate, sourceLabel: document.title, sourceHref: document.href, sourceRecord: { type: 'DocumentReference', id: document.id, display: document.title }, history: [], canonicalTask: false, canComplete: false }));
}

export async function getDoctorWorkSnapshot(actorId: string, actorName: string, actorRole: string): Promise<DoctorWorkSnapshot> {
  const now = new Date();
  const actor = { id: actorId, name: actorName, role: actorRole };
  const patients = getMockPatients().filter((patient) => canAccessTaskPatient(patient.id, actor));
  const taskResults = await Promise.all(patients.map(async (patient) => ({ patient, tasks: await listTasks(patient.id) })));
  const noteResults = await Promise.all(patients.map(async (patient) => ({ patient, notes: await listNotes(patient.id, patient) })));
  const documentResults = await Promise.all(patients.map(async (patient) => ({ patient, documents: await listDocuments(patient.id, patient) })));
  const matchesActor = (assignee?: { id?: string; name?: string } | null) => !assignee || assignee.id === actorId || assignee.name?.toLowerCase() === actorName.toLowerCase();
  const visibleTaskResults = taskResults.map(({ patient, tasks }) => ({ patient, tasks: tasks.filter((task) => matchesActor(task.assignee)) }));
  const canonicalTasks = (await Promise.all(visibleTaskResults.map(async ({ tasks }) => Promise.all(tasks.map((task) => taskItem(task, now)))))).flat();
  const derivedResults = visibleTaskResults.flatMap(({ patient, tasks }) => resultItems(patient, tasks, now));
  const derivedNotes = noteResults.flatMap(({ patient, notes }) => noteItems(patient, notes, visibleTaskResults.find((result) => result.patient.id === patient.id)?.tasks || [], now));
  const documentWork = documentResults.flatMap(({ patient, documents }) => documentItems(patient, documents));
  const derivedDocuments = documentWorkItems(documentWork);
  const items = [...canonicalTasks, ...derivedResults, ...derivedNotes, ...derivedDocuments].sort((left, right) => (left.priority === 'critical' ? -1 : right.priority === 'critical' ? 1 : dateTime(left.dueAt) - dateTime(right.dueAt)));
  const conversations = await listConversations(actorId);
  const counts = { open: items.filter((item) => openStatus(item.status) || item.status === 'overdue').length, urgent: items.filter((item) => item.priority === 'critical' && openStatus(item.status)).length, dueToday: items.filter((item) => sameDay(item.dueAt, now) && openStatus(item.status)).length, overdue: items.filter((item) => item.status === 'overdue').length, results: items.filter((item) => item.kind === 'result-review').length, notes: items.filter((item) => item.kind === 'note-signature').length, documents: documentWork.filter((item) => item.reviewStatus === 'needs-review').length, followUps: items.filter((item) => item.type.toLowerCase().includes('follow')).length };
  return { actor: { id: actorId, name: actorName, role: actorRole }, generatedAt: now.toISOString(), items, counts, messages: { conversations: conversations.map((conversation) => summarizeConversation(conversation, actorId)), counts: await messageCounts(actorId) }, documents: { items: documentWork, counts: { needsReview: documentWork.filter((item) => item.reviewStatus === 'needs-review').length, recentlyAdded: documentWork.filter((item) => item.addedAt && dateTime(item.addedAt) >= now.getTime() - 30 * 86400000).length, unread: 0, restricted: documentWork.filter((item) => item.restricted).length } }, patients: patients.map((patient) => patientReference(patient.id)) };
}

export async function findCanonicalTask(taskId: string, patientId?: string) {
  const parts = taskId.startsWith('task:') ? taskId.split(':') : [];
  const requestedPatientId = parts.length >= 3 ? parts[1] : undefined;
  const requestedTaskId = requestedPatientId ? parts.slice(2).join(':') : taskId;
  const scopedPatientId = patientId || requestedPatientId;
  for (const patient of getMockPatients().filter((item) => !scopedPatientId || item.id === scopedPatientId)) {
    const task = await listTasks(patient.id);
    const found = task.find((item) => item.id === requestedTaskId);
    if (found) return { patient, task: found };
  }
  return null;
}
