"use client";

import React from "react";
import type { NoteRevision } from "@/notes/types";

const STATUS_STYLE: Record<string, string> = {
  accepted: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  superseded: "bg-gray-100 text-gray-600",
};

/** Immutable, append-only timeline of resolved revisions — the audit trail for a note. */
export default function RevisionHistoryPanel({ revisions }: { revisions: NoteRevision[] }) {
  if (revisions.length === 0) {
    return <p className="text-xs text-gray-400">No resolved revisions yet.</p>;
  }
  const sorted = [...revisions].sort((a, b) => (b.reviewedAt ?? b.createdAt).localeCompare(a.reviewedAt ?? a.createdAt));

  return (
    <ul className="space-y-2">
      {sorted.map((rev) => (
        <li key={rev.id} className="flex items-start justify-between rounded border border-gray-100 px-3 py-2 text-xs">
          <div>
            <div className="font-medium text-gray-700">{rev.authorName}</div>
            <div className="text-gray-500">
              {rev.ops.length} change{rev.ops.length === 1 ? "" : "s"} ·{" "}
              {new Date(rev.reviewedAt ?? rev.createdAt).toLocaleString()}
            </div>
          </div>
          <span className={`rounded-full px-2 py-0.5 font-medium ${STATUS_STYLE[rev.status] ?? "bg-gray-100 text-gray-600"}`}>
            {rev.status}
          </span>
        </li>
      ))}
    </ul>
  );
}
