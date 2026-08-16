/**
 * In-memory NotesService (Phase 1 mock persistence).
 *
 * Mirrors the Prisma schema in prisma/schema.prisma (ClinicalNote /
 * NoteRevision / NoteComment / NoteAddendum) so a real repository can
 * replace this module later behind the same function signatures — see
 * docs/solutioning/notes-feature/hld.md §7 (Rollout) and lld.md §2.2.
 *
 * Track-changes rebase strategy: each pending revision stores the
 * author's full intended text (`resultingText`) at the time it was
 * authored. Whenever the note's clean `baseText` changes (another
 * revision is accepted), every other pending revision is "rebased" by
 * re-diffing its `resultingText` against the new base — this keeps
 * multiple concurrent authors' pending edits positionally consistent
 * without needing full operational-transform machinery.
 */
import { diffWords, applyOps } from "./diffEngine";
import type {
  NoteAddendum,
  NoteAuthor,
  NoteComment,
  NoteDocument,
  NoteRevision,
  NoteType,
} from "./types";

let seq = 0;
function nextId(prefix: string): string {
  seq += 1;
  return `${prefix}_${Date.now().toString(36)}_${seq}`;
}

function now(): string {
  return new Date().toISOString();
}

// Module-level in-memory store (per server process — fine for demo/dev).
const notes = new Map<string, NoteDocument>();

function seedIfEmpty() {
  if (notes.size > 0) return;
  const seedNote: NoteDocument = {
    id: "note_seed_1",
    patientId: "patient-001",
    encounterId: "visit-000A",
    type: "progress",
    title: "Hypertension follow-up",
    status: "draft",
    createdBy: { id: "user-dr-chen", name: "Dr. Chen", role: "DOCTOR" },
    createdAt: now(),
    updatedAt: now(),
    baseText:
      "Patient reports improved adherence to antihypertensive regimen. Blood pressure trending toward goal. Continue current medication and reassess in 4 weeks.",
    pendingRevisions: [],
    revisionHistory: [],
    comments: [],
    addenda: [],
    tags: ["cardiology", "hypertension"],
  };
  notes.set(seedNote.id, seedNote);
}
seedIfEmpty();

export interface ListFilter {
  patientId?: string;
  status?: string;
  type?: NoteType;
}

export function listNotes(filter: ListFilter = {}): NoteDocument[] {
  seedIfEmpty();
  return Array.from(notes.values())
    .filter((n) => (filter.patientId ? n.patientId === filter.patientId : true))
    .filter((n) => (filter.status ? n.status === filter.status : true))
    .filter((n) => (filter.type ? n.type === filter.type : true))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getNote(noteId: string): NoteDocument | undefined {
  return notes.get(noteId);
}

export function createNote(input: {
  patientId: string;
  encounterId?: string;
  type: NoteType;
  title: string;
  baseText: string;
  author: NoteAuthor;
}): NoteDocument {
  const doc: NoteDocument = {
    id: nextId("note"),
    patientId: input.patientId,
    encounterId: input.encounterId,
    type: input.type,
    title: input.title || "Untitled note",
    status: "draft",
    createdBy: input.author,
    createdAt: now(),
    updatedAt: now(),
    baseText: input.baseText ?? "",
    pendingRevisions: [],
    revisionHistory: [],
    comments: [],
    addenda: [],
    tags: [],
  };
  notes.set(doc.id, doc);
  return doc;
}

/** Rebase every remaining pending revision against the note's current baseText. */
function rebasePendingRevisions(note: NoteDocument) {
  const survivors: NoteRevision[] = [];
  for (const rev of note.pendingRevisions) {
    const intended = rev.resultingText ?? note.baseText;
    const ops = diffWords(note.baseText, intended);
    if (ops.length === 0) {
      // Fully subsumed by another author's accepted change — nothing left to review.
      note.revisionHistory.push({ ...rev, ops: [], status: "superseded", reviewedAt: now() });
      continue;
    }
    survivors.push({ ...rev, ops });
  }
  note.pendingRevisions = survivors;
}

export function editNote(
  noteId: string,
  nextText: string,
  author: NoteAuthor
): { note: NoteDocument; revision: NoteRevision } {
  const note = notes.get(noteId);
  if (!note) throw new Error("Note not found");
  if (note.status === "signed") throw new Error("Note is signed; use an addendum");

  const ops = diffWords(note.baseText, nextText);
  const revision: NoteRevision = {
    id: nextId("rev"),
    noteId: note.id,
    authorId: author.id,
    authorName: author.name,
    authorRole: author.role,
    createdAt: now(),
    status: "pending",
    baseRevisionId: note.pendingRevisions.at(-1)?.id ?? note.revisionHistory.at(-1)?.id ?? null,
    ops,
    resultingText: nextText,
  };

  if (ops.length === 0) {
    // No actual change — nothing to track.
    return { note, revision };
  }

  note.pendingRevisions.push(revision);
  note.updatedAt = now();
  return { note, revision };
}

export function acceptRevision(
  noteId: string,
  revisionId: string,
  reviewer: NoteAuthor,
  opIds?: string[]
): NoteDocument {
  const note = notes.get(noteId);
  if (!note) throw new Error("Note not found");
  const revision = note.pendingRevisions.find((r) => r.id === revisionId);
  if (!revision) throw new Error("Revision not found or already resolved");

  const opsToAccept = opIds ? revision.ops.filter((o) => opIds.includes(o.id)) : revision.ops;
  if (opsToAccept.length === 0) throw new Error("No matching pending changes to accept");

  const newBase = applyOps(note.baseText, opsToAccept);
  const acceptedSnapshot: NoteRevision = {
    ...revision,
    id: nextId("rev"),
    ops: opsToAccept,
    status: "accepted",
    resultingText: newBase,
    reviewedBy: reviewer.id,
    reviewedAt: now(),
  };
  note.revisionHistory.push(acceptedSnapshot);
  note.baseText = newBase;
  note.updatedAt = now();

  // Remove the (now at least partially resolved) revision, then rebase
  // everything — including any leftover ops from this same revision if it
  // was only partially accepted (its `resultingText` still reflects the
  // author's full intent, so the leftover portion reappears automatically).
  note.pendingRevisions = note.pendingRevisions.filter((r) => r.id !== revisionId);
  rebasePendingRevisions(note);

  return note;
}

export function rejectRevision(
  noteId: string,
  revisionId: string,
  reviewer: NoteAuthor,
  opIds?: string[]
): NoteDocument {
  const note = notes.get(noteId);
  if (!note) throw new Error("Note not found");
  const revision = note.pendingRevisions.find((r) => r.id === revisionId);
  if (!revision) throw new Error("Revision not found or already resolved");

  if (!opIds || opIds.length === revision.ops.length) {
    // Full reject: drop entirely, no base change.
    note.pendingRevisions = note.pendingRevisions.filter((r) => r.id !== revisionId);
    note.revisionHistory.push({ ...revision, status: "rejected", reviewedBy: reviewer.id, reviewedAt: now() });
  } else {
    // Partial reject: recompute the author's intended text with the
    // rejected ops excluded, then rebase this revision against the
    // (unchanged) base to derive the remaining ops.
    const keptOps = revision.ops.filter((o) => !opIds.includes(o.id));
    const rejectedOps = revision.ops.filter((o) => opIds.includes(o.id));
    const newIntendedText = applyOps(note.baseText, keptOps);
    note.revisionHistory.push({
      ...revision,
      id: nextId("rev"),
      ops: rejectedOps,
      status: "rejected",
      reviewedBy: reviewer.id,
      reviewedAt: now(),
    });
    note.pendingRevisions = note.pendingRevisions.map((r) =>
      r.id === revisionId ? { ...r, resultingText: newIntendedText, ops: diffWords(note.baseText, newIntendedText) } : r
    );
  }
  note.updatedAt = now();
  return note;
}

export function signNote(noteId: string, signer: NoteAuthor): NoteDocument {
  const note = notes.get(noteId);
  if (!note) throw new Error("Note not found");
  if (note.pendingRevisions.length > 0) {
    throw new Error("Cannot sign: pending changes must be resolved first");
  }
  note.status = "signed";
  note.signedBy = signer;
  note.signedAt = now();
  note.updatedAt = now();
  return note;
}

export function addAddendum(noteId: string, author: NoteAuthor, text: string): NoteAddendum {
  const note = notes.get(noteId);
  if (!note) throw new Error("Note not found");
  if (note.status !== "signed") throw new Error("Addenda are only allowed on signed notes");
  const addendum: NoteAddendum = {
    id: nextId("addendum"),
    noteId: note.id,
    authorId: author.id,
    authorName: author.name,
    createdAt: now(),
    text,
  };
  note.addenda.push(addendum);
  note.updatedAt = now();
  return addendum;
}

export function addComment(noteId: string, author: NoteAuthor, body: string, anchorOpId?: string): NoteComment {
  const note = notes.get(noteId);
  if (!note) throw new Error("Note not found");
  const comment: NoteComment = {
    id: nextId("comment"),
    noteId: note.id,
    authorId: author.id,
    authorName: author.name,
    createdAt: now(),
    body,
    anchorOpId,
  };
  note.comments.push(comment);
  note.updatedAt = now();
  return comment;
}
