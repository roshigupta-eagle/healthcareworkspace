"use client";

import React from "react";
import { NOTE_TYPE_LABELS, type NoteDocument } from "@/notes/types";

interface Props {
  note: NoteDocument;
  active: boolean;
  onSelect: () => void;
}

export default function NoteListItem({ note, active, onSelect }: Props) {
  const pendingCount = note.pendingRevisions.length;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
        active ? "border-teal-400 bg-teal-50" : "border-gray-100 bg-white hover:bg-gray-50"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium text-gray-800">{note.title}</span>
        {pendingCount > 0 && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">{pendingCount}</span>
        )}
      </div>
      <div className="mt-0.5 text-xs text-gray-500">
        {NOTE_TYPE_LABELS[note.type]} · {note.createdBy.name} ·{" "}
        {note.status === "signed" ? "Signed" : "Draft"}
      </div>
    </button>
  );
}
