"use client";

import React from "react";
import { colorForAuthor } from "@/notes/diffEngine";
import type { NoteRevision } from "@/notes/types";

interface Props {
  revision: NoteRevision;
  disabled?: boolean;
  onAccept: () => void;
  onReject: () => void;
}

/** Per-revision Accept / Reject controls shown above each author's pending change. */
export default function TrackChangesToolbar({ revision, disabled, onAccept, onReject }: Props) {
  const color = colorForAuthor(revision.authorName);
  const insertCount = revision.ops.filter((o) => o.kind === "insert").length;
  const deleteCount = revision.ops.filter((o) => o.kind === "delete").length;

  return (
    <div className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} aria-hidden />
        <span className="font-medium text-gray-700">{revision.authorName}</span>
        <span className="text-gray-500">
          {insertCount} addition{insertCount === 1 ? "" : "s"}, {deleteCount} deletion{deleteCount === 1 ? "" : "s"}
        </span>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={onReject}
          className="rounded border border-gray-300 px-2 py-1 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
        >
          Reject
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onAccept}
          className="rounded bg-teal-600 px-2 py-1 text-white hover:bg-teal-700 disabled:opacity-50"
        >
          Accept
        </button>
      </div>
    </div>
  );
}
