/**
 * Role -> capability matrix for the unified Notes feature.
 * Enforced server-side (source of truth) in the API routes; the client
 * hook `useNotesPermissions` wraps the same functions purely for UI
 * affordance. See docs/solutioning/notes-feature/lld.md §4.
 */
import type { NoteDocument, NoteType, StaffRole } from "./types";

export const NOTE_TYPE_ALLOWLIST: Record<StaffRole, NoteType[] | "all"> = {
  DOCTOR: "all",
  ADMIN: "all",
  NURSE: ["progress", "nursing", "soap", "consult"],
  PHARMACIST: ["medication-review"],
  LAB_TECH: ["lab-annotation"],
  RECEPTIONIST: ["administrative"],
  BILLING: ["administrative"],
  PCA: ["administrative"],
  PATIENT: [],
  PENDING: [],
};

/** Roles allowed to finalize (sign) a note of a given type. */
const SIGNING_ROLES: Record<NoteType, StaffRole[]> = {
  progress: ["DOCTOR", "NURSE", "ADMIN"],
  soap: ["DOCTOR", "ADMIN"],
  nursing: ["NURSE", "ADMIN"],
  "medication-review": ["PHARMACIST", "ADMIN"],
  "lab-annotation": ["LAB_TECH", "ADMIN"],
  administrative: ["RECEPTIONIST", "BILLING", "PCA", "ADMIN"],
  consult: ["DOCTOR", "ADMIN"],
};

function allowedTypesFor(role: StaffRole): NoteType[] | "all" {
  return NOTE_TYPE_ALLOWLIST[role] ?? [];
}

export function canAuthor(role: StaffRole, type: NoteType): boolean {
  const allowed = allowedTypesFor(role);
  if (allowed === "all") return true;
  return allowed.includes(type);
}

export function canEditNote(role: StaffRole, note: Pick<NoteDocument, "type" | "status">): boolean {
  if (note.status === "signed") return false; // must use addendum instead
  return canAuthor(role, note.type);
}

export function canReviewChanges(role: StaffRole, note: Pick<NoteDocument, "type" | "status">): boolean {
  return canEditNote(role, note);
}

export function canSign(role: StaffRole, type: NoteType): boolean {
  return (SIGNING_ROLES[type] ?? []).includes(role);
}

export function canAddendum(role: StaffRole, note: Pick<NoteDocument, "type" | "status">): boolean {
  if (note.status !== "signed") return false;
  return canAuthor(role, note.type) || canSign(role, note.type);
}

/** All staff roles can view notes; PATIENT/PENDING are excluded from staff view. */
export function canView(role: StaffRole): boolean {
  return role !== "PATIENT" && role !== "PENDING";
}

export function availableNoteTypesFor(role: StaffRole): NoteType[] {
  const allowed = allowedTypesFor(role);
  if (allowed === "all") {
    return ["progress", "soap", "nursing", "medication-review", "lab-annotation", "administrative", "consult"];
  }
  return allowed;
}
