import fs from 'fs/promises';
import type { ConcernActor, ConcernClinicalStatus, HealthConcern, ConcernHistoryEntry } from '@/types/healthConcern';
import { resolveDataPath } from '@/lib/dataPath';
import type { Patient } from '@/app/dashboard/records/mockPatients';

const CONCERNS_FILE = resolveDataPath('health-concerns.json');
const DATA_DIR = resolveDataPath('.').replace(/[\\/]\.$/, '');

async function ensureData() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(CONCERNS_FILE);
  } catch {
    await fs.writeFile(CONCERNS_FILE, JSON.stringify({}, null, 2));
  }
}

async function readAll(): Promise<Record<string, HealthConcern[]>> {
  await ensureData();
  const raw = await fs.readFile(CONCERNS_FILE, 'utf8');
  try {
    return JSON.parse(raw || '{}');
  } catch {
    return {};
  }
}

async function writeAll(data: Record<string, HealthConcern[]>) {
  await fs.writeFile(CONCERNS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function genId(prefix = 'concern') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function pushHistory(concern: HealthConcern, action: string, actor: ConcernActor, details?: string) {
  const entry: ConcernHistoryEntry = {
    id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    action,
    actor,
    timestamp: new Date().toISOString(),
    details,
  };
  concern.history = [...(concern.history || []), entry];
}

function legacyClinicalStatus(status?: string): ConcernClinicalStatus {
  const s = (status || '').toLowerCase();
  if (s.includes('resolve') || s.includes('inactive')) return 'resolved';
  if (s.includes('monitor')) return 'monitoring';
  return 'active';
}

/** Seeds the persisted store from the patient's existing mock currentConcerns[] the first time it's read. */
async function ensureSeeded(patientId: string, patient: Patient) {
  const all = await readAll();
  if (all[patientId] && all[patientId].length) return;

  const legacy = (patient.currentConcerns || []).filter((concern): concern is Exclude<NonNullable<Patient['currentConcerns']>[number], string> => typeof concern !== 'string');
  const recorder: ConcernActor = { id: 'legacy-import', name: patient?.lastAttendingDoctor || 'Unknown', role: 'DOCTOR' };

  const seeded: HealthConcern[] = legacy.map((c) => {
    const recordedDate = c.firstNoted || patient?.lastVisit || new Date().toISOString();
    const provider: ConcernActor | null = patient?.lastAttendingDoctor ? { id: `provider-${patient.lastAttendingDoctor.toLowerCase().replace(/\s+/g, '-')}`, name: patient.lastAttendingDoctor, role: 'DOCTOR' } : null;
    const createdAt = new Date(recordedDate).toISOString();
    return {
      id: genId(),
      patientId,
      term: c.title,
      category: 'Health concern',
      clinicalStatus: legacyClinicalStatus(c.status),
      attentionStatus: 'none',
      verification: 'provisional',
      severity: null,
      onset: c.firstNoted || null,
      recordedDate,
      lastReviewedAt: c.lastReviewed || null,
      responsibleProvider: provider,
      encounterId: null,
      description: c.context || null,
      source: 'Condition',
      recorder,
      pinned: false,
      followUpTaskId: null,
      relatedNoteIds: [],
      enteredInError: null,
      resolution: null,
      history: [{ id: `h-${createdAt}`, action: 'created', actor: recorder, timestamp: createdAt }],
      createdAt,
      updatedAt: createdAt,
      version: 1,
    };
  });

  all[patientId] = seeded;
  await writeAll(all);
}

export async function listConcerns(patientId: string, patient: Patient): Promise<HealthConcern[]> {
  await ensureSeeded(patientId, patient);
  const all = await readAll();
  return (all[patientId] || []).slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getConcern(patientId: string, concernId: string): Promise<HealthConcern | null> {
  const all = await readAll();
  return (all[patientId] || []).find((c) => c.id === concernId) || null;
}

async function saveConcern(patientId: string, concern: HealthConcern): Promise<HealthConcern> {
  const all = await readAll();
  const list = all[patientId] || [];
  const idx = list.findIndex((c) => c.id === concern.id);
  if (idx >= 0) list[idx] = concern; else list.unshift(concern);
  all[patientId] = list;
  await writeAll(all);
  return concern;
}

export async function createConcern(
  patientId: string,
  input: {
    term: string;
    category: HealthConcern['category'];
    clinicalStatus: ConcernClinicalStatus;
    verification: HealthConcern['verification'];
    severity?: string | null;
    onset?: string | null;
    responsibleProvider?: ConcernActor | null;
    encounterId?: string | null;
    description?: string | null;
  },
  actor: ConcernActor,
): Promise<HealthConcern> {
  const now = new Date().toISOString();
  const concern: HealthConcern = {
    id: genId(),
    patientId,
    term: input.term,
    category: input.category,
    clinicalStatus: input.clinicalStatus,
    attentionStatus: 'none',
    verification: input.verification,
    severity: input.severity ?? null,
    onset: input.onset ?? null,
    recordedDate: now,
    lastReviewedAt: null,
    responsibleProvider: input.responsibleProvider ?? actor,
    encounterId: input.encounterId ?? null,
    description: input.description ?? null,
    source: 'Condition',
    recorder: actor,
    pinned: false,
    followUpTaskId: null,
    relatedNoteIds: [],
    enteredInError: null,
    resolution: null,
    history: [],
    createdAt: now,
    updatedAt: now,
    version: 1,
  };
  pushHistory(concern, 'created', actor);
  return saveConcern(patientId, concern);
}

export type UpdateConcernResult =
  | { ok: true; concern: HealthConcern }
  | { ok: false; conflict: true; latest: HealthConcern }
  | { ok: false; conflict: false; error: string };

export async function updateConcern(
  patientId: string,
  concernId: string,
  patch: Partial<Pick<HealthConcern, 'clinicalStatus' | 'attentionStatus' | 'verification' | 'severity' | 'onset' | 'description' | 'responsibleProvider' | 'lastReviewedAt'>>,
  expectedVersion: number,
  actor: ConcernActor,
): Promise<UpdateConcernResult> {
  const existing = await getConcern(patientId, concernId);
  if (!existing) return { ok: false, conflict: false, error: 'Concern not found' };
  if (existing.version !== expectedVersion) return { ok: false, conflict: true, latest: existing };

  const updated: HealthConcern = { ...existing, ...patch, updatedAt: new Date().toISOString(), version: existing.version + 1 };
  pushHistory(updated, 'reviewed', actor);
  await saveConcern(patientId, updated);
  return { ok: true, concern: updated };
}

export async function resolveConcern(patientId: string, concernId: string, reason: string | undefined, note: string | undefined, actor: ConcernActor): Promise<HealthConcern | { error: string }> {
  const existing = await getConcern(patientId, concernId);
  if (!existing) return { error: 'Concern not found' };
  if (existing.clinicalStatus === 'resolved') return { error: 'This concern is already resolved.' };

  const now = new Date().toISOString();
  const updated: HealthConcern = {
    ...existing,
    clinicalStatus: 'resolved',
    attentionStatus: 'none',
    resolution: { reason: reason || null, note: note || null, resolvedBy: actor, resolvedAt: now },
    updatedAt: now,
    version: existing.version + 1,
  };
  pushHistory(updated, 'resolved', actor, reason);
  return saveConcern(patientId, updated);
}

export async function reopenConcern(patientId: string, concernId: string, actor: ConcernActor): Promise<HealthConcern | { error: string }> {
  const existing = await getConcern(patientId, concernId);
  if (!existing) return { error: 'Concern not found' };
  if (existing.clinicalStatus !== 'resolved') return { error: 'Only resolved concerns can be reopened.' };

  const now = new Date().toISOString();
  const updated: HealthConcern = { ...existing, clinicalStatus: 'active', resolution: null, updatedAt: now, version: existing.version + 1 };
  pushHistory(updated, 'reopened', actor);
  return saveConcern(patientId, updated);
}

export async function markEnteredInError(patientId: string, concernId: string, reason: string, actor: ConcernActor): Promise<HealthConcern | { error: string }> {
  const existing = await getConcern(patientId, concernId);
  if (!existing) return { error: 'Concern not found' };
  if (!reason.trim()) return { error: 'A reason is required.' };

  const now = new Date().toISOString();
  const updated: HealthConcern = { ...existing, enteredInError: { reason: reason.trim(), by: actor, at: now }, updatedAt: now, version: existing.version + 1 };
  pushHistory(updated, 'entered in error', actor, reason.trim());
  return saveConcern(patientId, updated);
}

export async function attachFollowUpTask(patientId: string, concernId: string, taskId: string, actor: ConcernActor): Promise<HealthConcern | null> {
  const existing = await getConcern(patientId, concernId);
  if (!existing) return null;
  const updated: HealthConcern = { ...existing, followUpTaskId: taskId, updatedAt: new Date().toISOString() };
  pushHistory(updated, 'follow-up task created', actor);
  return saveConcern(patientId, updated);
}

export async function linkNote(patientId: string, concernId: string, noteId: string, actor: ConcernActor): Promise<HealthConcern | null> {
  const existing = await getConcern(patientId, concernId);
  if (!existing) return null;
  const updated: HealthConcern = { ...existing, relatedNoteIds: Array.from(new Set([...(existing.relatedNoteIds || []), noteId])), updatedAt: new Date().toISOString() };
  pushHistory(updated, 'note linked', actor);
  return saveConcern(patientId, updated);
}

export async function setPinned(patientId: string, concernId: string, pinned: boolean, actor: ConcernActor): Promise<HealthConcern | null> {
  const existing = await getConcern(patientId, concernId);
  if (!existing) return null;
  const updated: HealthConcern = { ...existing, pinned };
  pushHistory(updated, pinned ? 'pinned' : 'unpinned', actor);
  return saveConcern(patientId, updated);
}

/** Minimal Condition-style mapping for provenance display (never exposed as raw FHIR by default). */
export function mapConcernToFhir(concern: HealthConcern) {
  return {
    resourceType: 'Condition',
    id: concern.id,
    clinicalStatus: { text: concern.clinicalStatus },
    verificationStatus: { text: concern.verification },
    category: [{ text: concern.category }],
    code: { text: concern.term },
    subject: { reference: `Patient/${concern.patientId}` },
    onsetDateTime: concern.onset || undefined,
    recordedDate: concern.recordedDate,
    recorder: { display: concern.recorder.name },
    encounter: concern.encounterId ? { reference: `Encounter/${concern.encounterId}` } : undefined,
  };
}
