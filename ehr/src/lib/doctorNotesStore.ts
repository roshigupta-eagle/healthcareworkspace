import fs from 'fs/promises';
import type { DoctorNote, DoctorNoteActor, DoctorNoteHistoryEntry, DoctorNoteSection, DoctorNoteType } from '@/types/doctorNote';
import { resolveDataPath } from '@/lib/dataPath';
import type { Patient } from '@/app/dashboard/records/mockPatients';

const NOTES_FILE = resolveDataPath('doctor-notes.json');
const DATA_DIR = resolveDataPath('.').replace(/[\\/]\.$/, '');

async function ensureData() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(NOTES_FILE);
  } catch {
    await fs.writeFile(NOTES_FILE, JSON.stringify({}, null, 2));
  }
}

async function readAll(): Promise<Record<string, DoctorNote[]>> {
  await ensureData();
  const raw = await fs.readFile(NOTES_FILE, 'utf8');
  try {
    return JSON.parse(raw || '{}');
  } catch {
    return {};
  }
}

async function writeAll(data: Record<string, DoctorNote[]>) {
  await fs.writeFile(NOTES_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function genId(prefix = 'note') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function pushHistory(note: DoctorNote, action: string, actor: DoctorNoteActor, details?: string) {
  const entry: DoctorNoteHistoryEntry = {
    id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    action,
    actor,
    timestamp: new Date().toISOString(),
    details,
  };
  note.history = [...(note.history || []), entry];
}

/** Best-effort mapping of the legacy mock patient.notes[] entry to a note type. */
function inferTypeFromLegacy(type?: string): DoctorNoteType {
  const t = (type || '').toLowerCase();
  if (t.includes('follow')) return 'follow-up';
  if (t.includes('phone') || t.includes('call')) return 'phone';
  if (t.includes('care plan') || t.includes('careplan')) return 'care-plan';
  if (t.includes('progress')) return 'progress';
  return 'general';
}

/** Seeds the persisted store from the patient's existing mock notes the first time it's read. */
async function ensureSeeded(patientId: string, patient: Patient) {
  const all = await readAll();
  if (all[patientId] && all[patientId].length) return;

  const legacyNotes = patient.notes || [];
  const seeded: DoctorNote[] = legacyNotes.map((n) => {
    const createdAt = n.date ? new Date(n.date).toISOString() : new Date().toISOString();
    const author: DoctorNoteActor = { id: `legacy-${(n.author || 'unknown').toLowerCase().replace(/\s+/g, '-')}`, name: n.author || 'Unknown', role: 'DOCTOR' };
    const signed = n.status === 'Signed' || n.status === undefined;
    const sections: DoctorNoteSection[] = [{ heading: '', body: n.snippet || '' }];
    return {
      id: n.id || genId(),
      patientId,
      type: inferTypeFromLegacy(n.type),
      status: signed ? 'signed' : 'draft',
      author,
      signer: signed ? author : null,
      signedAt: signed ? createdAt : null,
      createdAt,
      updatedAt: createdAt,
      encounterId: null,
      templateId: null,
      templateLabel: null,
      sections,
      followUpTaskId: null,
      pinned: false,
      addenda: [],
      correction: null,
      enteredInError: null,
      history: [{ id: `h-${createdAt}`, action: signed ? 'signed' : 'created', actor: author, timestamp: createdAt }],
      version: 1,
    };
  });

  all[patientId] = seeded;
  await writeAll(all);
}

export async function listNotes(patientId: string, patient: Patient): Promise<DoctorNote[]> {
  await ensureSeeded(patientId, patient);
  const all = await readAll();
  return (all[patientId] || []).slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getNote(patientId: string, noteId: string): Promise<DoctorNote | null> {
  const all = await readAll();
  return (all[patientId] || []).find((n) => n.id === noteId) || null;
}

async function saveNote(patientId: string, note: DoctorNote): Promise<DoctorNote> {
  const all = await readAll();
  const list = all[patientId] || [];
  const idx = list.findIndex((n) => n.id === note.id);
  if (idx >= 0) list[idx] = note; else list.unshift(note);
  all[patientId] = list;
  await writeAll(all);
  return note;
}

export async function createDraft(
  patientId: string,
  input: { type: DoctorNoteType; sections: DoctorNoteSection[]; templateId?: string | null; templateLabel?: string | null; encounterId?: string | null; relatedConcernId?: string | null },
  actor: DoctorNoteActor,
): Promise<DoctorNote> {
  const now = new Date().toISOString();
  const note: DoctorNote = {
    id: genId(),
    patientId,
    type: input.type,
    status: 'draft',
    author: actor,
    signer: null,
    signedAt: null,
    createdAt: now,
    updatedAt: now,
    encounterId: input.encounterId ?? null,
    templateId: input.templateId ?? null,
    templateLabel: input.templateLabel ?? null,
    relatedConcernId: input.relatedConcernId ?? null,
    sections: input.sections,
    followUpTaskId: null,
    pinned: false,
    addenda: [],
    correction: null,
    enteredInError: null,
    history: [],
    version: 1,
  };
  pushHistory(note, 'created', actor);
  return saveNote(patientId, note);
}

export type UpdateDraftResult =
  | { ok: true; note: DoctorNote }
  | { ok: false; conflict: true; latest: DoctorNote }
  | { ok: false; conflict: false; error: string };

export async function updateDraft(
  patientId: string,
  noteId: string,
  patch: { sections?: DoctorNoteSection[]; type?: DoctorNoteType },
  expectedVersion: number,
  actor: DoctorNoteActor,
): Promise<UpdateDraftResult> {
  const existing = await getNote(patientId, noteId);
  if (!existing) return { ok: false, conflict: false, error: 'Note not found' };
  if (existing.status !== 'draft') return { ok: false, conflict: false, error: 'Only draft notes can be edited directly. Use an addendum or correction instead.' };
  if (existing.version !== expectedVersion) {
    return { ok: false, conflict: true, latest: existing };
  }

  const updated: DoctorNote = {
    ...existing,
    sections: patch.sections ?? existing.sections,
    type: patch.type ?? existing.type,
    updatedAt: new Date().toISOString(),
    version: existing.version + 1,
  };
  pushHistory(updated, 'edited', actor);
  await saveNote(patientId, updated);
  return { ok: true, note: updated };
}

export async function signNote(patientId: string, noteId: string, actor: DoctorNoteActor): Promise<DoctorNote | { error: string }> {
  const existing = await getNote(patientId, noteId);
  if (!existing) return { error: 'Note not found' };
  if (existing.status === 'signed' || existing.status === 'amended' || existing.status === 'corrected') return { error: 'Note is already signed.' };
  if (existing.status === 'entered-in-error') return { error: 'Note has been marked entered in error and cannot be signed.' };
  const bodyPresent = existing.sections.some((s) => s.body.trim().length > 0);
  if (!bodyPresent) return { error: 'Add clinical content before signing.' };

  const now = new Date().toISOString();
  const updated: DoctorNote = {
    ...existing,
    status: 'signed',
    signer: actor,
    signedAt: now,
    updatedAt: now,
    version: existing.version + 1,
  };
  pushHistory(updated, 'signed', actor);
  return saveNote(patientId, updated);
}

export async function addAddendum(patientId: string, noteId: string, text: string, actor: DoctorNoteActor): Promise<DoctorNote | { error: string }> {
  const existing = await getNote(patientId, noteId);
  if (!existing) return { error: 'Note not found' };
  if (existing.status === 'draft') return { error: 'Addenda can only be added to signed notes.' };
  if (existing.status === 'entered-in-error') return { error: 'Note has been marked entered in error.' };
  if (!text.trim()) return { error: 'Addendum text is required.' };

  const now = new Date().toISOString();
  const updated: DoctorNote = {
    ...existing,
    status: 'amended',
    addenda: [...existing.addenda, { id: `add-${Date.now()}`, author: actor, createdAt: now, text: text.trim() }],
    updatedAt: now,
    version: existing.version + 1,
  };
  pushHistory(updated, 'addendum added', actor);
  return saveNote(patientId, updated);
}

export async function correctNote(
  patientId: string,
  noteId: string,
  newSections: DoctorNoteSection[],
  reason: string,
  actor: DoctorNoteActor,
): Promise<DoctorNote | { error: string }> {
  const existing = await getNote(patientId, noteId);
  if (!existing) return { error: 'Note not found' };
  if (existing.status === 'draft') return { error: 'Only finalized notes require a correction workflow.' };
  if (existing.status === 'entered-in-error') return { error: 'Note has been marked entered in error.' };
  if (!reason.trim()) return { error: 'A correction reason is required.' };

  const now = new Date().toISOString();
  const previousBody = existing.sections.map((s) => `${s.heading ? s.heading + ': ' : ''}${s.body}`).join('\n\n');
  const updated: DoctorNote = {
    ...existing,
    status: 'corrected',
    sections: newSections,
    correction: { reason: reason.trim(), correctedBy: actor, correctedAt: now, previousBody },
    updatedAt: now,
    version: existing.version + 1,
  };
  pushHistory(updated, 'corrected', actor, reason.trim());
  return saveNote(patientId, updated);
}

export async function markEnteredInError(patientId: string, noteId: string, reason: string, actor: DoctorNoteActor): Promise<DoctorNote | { error: string }> {
  const existing = await getNote(patientId, noteId);
  if (!existing) return { error: 'Note not found' };
  if (!reason.trim()) return { error: 'A reason is required to mark a note entered in error.' };

  const now = new Date().toISOString();
  const updated: DoctorNote = {
    ...existing,
    status: 'entered-in-error',
    enteredInError: { reason: reason.trim(), by: actor, at: now },
    updatedAt: now,
    version: existing.version + 1,
  };
  pushHistory(updated, 'entered in error', actor, reason.trim());
  return saveNote(patientId, updated);
}

export async function duplicateAsDraft(patientId: string, noteId: string, actor: DoctorNoteActor): Promise<DoctorNote | { error: string }> {
  const existing = await getNote(patientId, noteId);
  if (!existing) return { error: 'Note not found' };

  const now = new Date().toISOString();
  const note: DoctorNote = {
    id: genId(),
    patientId,
    type: existing.type,
    status: 'draft',
    author: actor,
    signer: null,
    signedAt: null,
    createdAt: now,
    updatedAt: now,
    encounterId: existing.encounterId ?? null,
    templateId: existing.templateId ?? null,
    templateLabel: existing.templateLabel ?? null,
    sections: existing.sections.map((s) => ({ ...s })),
    followUpTaskId: null,
    pinned: false,
    addenda: [],
    correction: null,
    enteredInError: null,
    history: [],
    version: 1,
  };
  pushHistory(note, 'created', actor, `Duplicated from ${existing.id}`);
  return saveNote(patientId, note);
}

export async function attachFollowUpTask(patientId: string, noteId: string, taskId: string, actor: DoctorNoteActor): Promise<DoctorNote | null> {
  const existing = await getNote(patientId, noteId);
  if (!existing) return null;
  const updated: DoctorNote = { ...existing, followUpTaskId: taskId, updatedAt: new Date().toISOString() };
  pushHistory(updated, 'follow-up task created', actor);
  return saveNote(patientId, updated);
}

export async function setPinned(patientId: string, noteId: string, pinned: boolean): Promise<DoctorNote | null> {
  const existing = await getNote(patientId, noteId);
  if (!existing) return null;
  const updated: DoctorNote = { ...existing, pinned };
  return saveNote(patientId, updated);
}

/** Minimal Composition/DocumentReference-style mapping for provenance display. */
export function mapNoteToFhir(note: DoctorNote) {
  return {
    resourceType: 'DocumentReference',
    id: note.id,
    status: note.status === 'entered-in-error' ? 'entered-in-error' : 'current',
    type: { text: note.type },
    subject: { reference: `Patient/${note.patientId}` },
    author: [{ display: note.author.name }],
    date: note.createdAt,
    content: [{ attachment: { title: note.sections.map((s) => s.heading).filter(Boolean).join(', ') } }],
    context: note.encounterId ? { encounter: [{ reference: `Encounter/${note.encounterId}` }] } : undefined,
    relatesTo: note.correction ? [{ code: 'replaces', target: { display: 'Previous version' } }] : undefined,
  };
}
