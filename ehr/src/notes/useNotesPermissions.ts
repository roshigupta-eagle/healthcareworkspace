"use client";

import { useMemo } from "react";
import {
  availableNoteTypesFor,
  canAddendum,
  canAuthor,
  canEditNote,
  canReviewChanges,
  canSign,
  canView,
} from "@/notes/permissions";
import type { NoteDocument, NoteType, StaffRole } from "@/notes/types";

/**
 * Client-side convenience wrapper around the permission matrix in
 * `@/notes/permissions`. This is a UX affordance only (hide/disable
 * buttons) — the API routes are the enforcement boundary.
 */
export function useNotesPermissions(role: StaffRole | undefined) {
  return useMemo(() => {
    const r = role ?? "PENDING";
    return {
      role: r,
      availableTypes: availableNoteTypesFor(r),
      canView: canView(r),
      canAuthor: (type: NoteType) => canAuthor(r, type),
      canEdit: (note: Pick<NoteDocument, "type" | "status">) => canEditNote(r, note),
      canReview: (note: Pick<NoteDocument, "type" | "status">) => canReviewChanges(r, note),
      canSign: (type: NoteType) => canSign(r, type),
      canAddendum: (note: Pick<NoteDocument, "type" | "status">) => canAddendum(r, note),
    };
  }, [role]);
}
