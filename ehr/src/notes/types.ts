/**
 * Unified Notes domain types.
 * See docs/solutioning/notes-feature/hld.md and lld.md.
 */

export type StaffRole =
  | "ADMIN"
  | "DOCTOR"
  | "NURSE"
  | "PHARMACIST"
  | "LAB_TECH"
  | "RECEPTIONIST"
  | "BILLING"
  | "PCA"
  | "PATIENT"
  | "PENDING";

export type NoteType =
  | "progress"
  | "soap"
  | "nursing"
  | "medication-review"
  | "lab-annotation"
  | "administrative"
  | "consult";

export type NoteStatus = "draft" | "signed";
export type RevisionStatus = "pending" | "accepted" | "rejected" | "superseded";

export interface ChangeOp {
  id: string;
  kind: "insert" | "delete" | "retain";
  text: string;
  position: number;
}

export interface NoteRevision {
  id: string;
  noteId: string;
  authorId: string;
  authorName: string;
  authorRole: StaffRole;
  createdAt: string;
  status: RevisionStatus;
  baseRevisionId: string | null;
  ops: ChangeOp[];
  resultingText?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface NoteComment {
  id: string;
  noteId: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  body: string;
  anchorOpId?: string;
}

export interface NoteAddendum {
  id: string;
  noteId: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  text: string;
}

export interface NoteAuthor {
  id: string;
  name: string;
  role: StaffRole;
}

export interface NoteDocument {
  id: string;
  patientId: string;
  encounterId?: string;
  type: NoteType;
  title: string;
  status: NoteStatus;
  createdBy: NoteAuthor;
  createdAt: string;
  updatedAt: string;
  signedBy?: NoteAuthor;
  signedAt?: string;
  baseText: string;
  pendingRevisions: NoteRevision[];
  revisionHistory: NoteRevision[];
  comments: NoteComment[];
  addenda: NoteAddendum[];
  tags: string[];
}

export type RenderSegmentKind = "unchanged" | "insert" | "delete";

export interface RenderSegment {
  text: string;
  kind: RenderSegmentKind;
  revisionId?: string;
  authorName?: string;
  opId?: string;
}

export const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  progress: "Progress Note",
  soap: "SOAP Note",
  nursing: "Nursing Note",
  "medication-review": "Medication Review",
  "lab-annotation": "Lab Annotation",
  administrative: "Administrative Note",
  consult: "Consult Note",
};
