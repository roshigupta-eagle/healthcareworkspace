"use client";

import React from "react";
import { colorForAuthor } from "@/notes/diffEngine";
import type { RenderSegment } from "@/notes/types";

/**
 * Read-only, colorized rendering of a note's clean text merged with all
 * pending track-changes (insertions underlined, deletions struck through,
 * each colored per authoring revision). See lld.md §3/§7.
 */
export default function TrackChangesOverlay({ segments }: { segments: RenderSegment[] }) {
  if (segments.length === 0) {
    return <p className="text-sm text-gray-400 italic">No content yet.</p>;
  }

  return (
    <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
      {segments.map((seg, idx) => {
        if (seg.kind === "unchanged") {
          return <span key={idx}>{seg.text}</span>;
        }
        const color = colorForAuthor(seg.authorName ?? seg.revisionId ?? "unknown");
        const style =
          seg.kind === "insert"
            ? { color, textDecoration: "underline", backgroundColor: `${color}1a` }
            : { color, textDecoration: "line-through", backgroundColor: `${color}0d`, opacity: 0.8 };
        return (
          <span
            key={idx}
            style={style}
            title={`${seg.kind === "insert" ? "Added" : "Deleted"} by ${seg.authorName ?? "unknown"}`}
          >
            {seg.text}
          </span>
        );
      })}
    </p>
  );
}
