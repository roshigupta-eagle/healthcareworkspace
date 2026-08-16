/**
 * Word-level track-changes diff engine.
 *
 * Computes a minimal insert/delete/retain op list between two text strings
 * (tokenized on word/whitespace boundaries), applies ops to reconstruct
 * text, and merges the base with any number of pending revisions into a
 * flat list of render segments for the editor overlay.
 *
 * See docs/solutioning/notes-feature/lld.md §3.
 */
import type { ChangeOp, NoteRevision, RenderSegment } from "./types";

let opCounter = 0;
function nextOpId(): string {
  opCounter += 1;
  return `op_${Date.now().toString(36)}_${opCounter}`;
}

/** Tokenize on word boundaries, keeping whitespace as its own tokens. */
function tokenize(text: string): string[] {
  return text.match(/\s+|[^\s]+/g) ?? [];
}

/**
 * Computes a minimal edit script between two token arrays using the
 * classic LCS (longest common subsequence) dynamic-programming table.
 * O(n*m) time/space — acceptable for clinical note lengths (<2000 words).
 */
function lcsOps(a: string[], b: string[]): Array<{ kind: "insert" | "delete" | "retain"; token: string }> {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const ops: Array<{ kind: "insert" | "delete" | "retain"; token: string }> = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push({ kind: "retain", token: a[i] });
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ kind: "delete", token: a[i] });
      i += 1;
    } else {
      ops.push({ kind: "insert", token: b[j] });
      j += 1;
    }
  }
  while (i < n) {
    ops.push({ kind: "delete", token: a[i] });
    i += 1;
  }
  while (j < m) {
    ops.push({ kind: "insert", token: b[j] });
    j += 1;
  }
  return ops;
}

/** Diff two full-text strings and return a compact ChangeOp list. */
export function diffWords(base: string, next: string): ChangeOp[] {
  const rawOps = lcsOps(tokenize(base), tokenize(next));

  // Coalesce consecutive same-kind tokens into single ops, tracking the
  // running offset into the *base* text so ops can be applied positionally.
  const ops: ChangeOp[] = [];
  let basePos = 0;
  let current: { kind: "insert" | "delete" | "retain"; text: string; position: number } | null = null;

  for (const raw of rawOps) {
    if (current && current.kind === raw.kind) {
      current.text += raw.token;
    } else {
      if (current) ops.push({ id: nextOpId(), kind: current.kind, text: current.text, position: current.position });
      current = { kind: raw.kind, text: raw.token, position: basePos };
    }
    if (raw.kind !== "insert") basePos += raw.token.length;
  }
  if (current) ops.push({ id: nextOpId(), kind: current.kind, text: current.text, position: current.position });

  // Track-changes only needs insert/delete; drop bulk "retain" runs used
  // only for internal alignment (segments still reconstruct full text via
  // renderTrackChanges/applyOps using position bookkeeping).
  return ops.filter((op) => op.kind !== "retain");
}

/**
 * Apply a ChangeOp list (as produced by diffWords against `base`) to
 * reconstruct the next full text. Ops must be the exact diff of `base` ->
 * `next` (positions are base-relative).
 */
export function applyOps(base: string, ops: ChangeOp[]): string {
  const sorted = [...ops].sort((a, b) => a.position - b.position);
  let result = "";
  let basePos = 0;
  for (const op of sorted) {
    if (op.kind === "delete") {
      result += base.slice(basePos, op.position);
      basePos = op.position + op.text.length;
    } else if (op.kind === "insert") {
      result += base.slice(basePos, op.position) + op.text;
      basePos = op.position;
    }
  }
  result += base.slice(basePos);
  return result;
}

/** Round-trip helper used by tests and by the PATCH route. */
export function computeRevisionOps(baseText: string, nextText: string): ChangeOp[] {
  return diffWords(baseText, nextText);
}

/**
 * Merge the clean base text with all *pending* revisions into an ordered
 * list of render segments (unchanged / insert / delete), each attributable
 * to its authoring revision, for inline track-changes rendering.
 */
export function renderTrackChanges(baseText: string, pendingRevisions: NoteRevision[]): RenderSegment[] {
  if (pendingRevisions.length === 0) {
    return baseText ? [{ text: baseText, kind: "unchanged" }] : [];
  }

  // Flatten all ops from all pending revisions, sorted by base position.
  type FlatOp = ChangeOp & { revisionId: string; authorName: string };
  const flat: FlatOp[] = [];
  for (const rev of pendingRevisions) {
    for (const op of rev.ops) {
      flat.push({ ...op, revisionId: rev.id, authorName: rev.authorName });
    }
  }
  flat.sort((a, b) => a.position - b.position || (a.kind === "delete" ? -1 : 1));

  const segments: RenderSegment[] = [];
  let cursor = 0;
  for (const op of flat) {
    if (op.kind === "delete") {
      if (op.position > cursor) {
        segments.push({ text: baseText.slice(cursor, op.position), kind: "unchanged" });
      }
      segments.push({ text: op.text, kind: "delete", revisionId: op.revisionId, authorName: op.authorName, opId: op.id });
      cursor = op.position + op.text.length;
    } else if (op.kind === "insert") {
      if (op.position > cursor) {
        segments.push({ text: baseText.slice(cursor, op.position), kind: "unchanged" });
        cursor = op.position;
      }
      segments.push({ text: op.text, kind: "insert", revisionId: op.revisionId, authorName: op.authorName, opId: op.id });
    }
  }
  if (cursor < baseText.length) {
    segments.push({ text: baseText.slice(cursor), kind: "unchanged" });
  }
  return segments;
}

/** Stable author -> color mapping for the track-changes overlay. */
const AUTHOR_PALETTE = ["#2563eb", "#b45309", "#7c3aed", "#0f766e", "#be185d", "#4d7c0f"];
export function colorForAuthor(authorNameOrId: string): string {
  let hash = 0;
  for (let i = 0; i < authorNameOrId.length; i++) {
    hash = (hash * 31 + authorNameOrId.charCodeAt(i)) | 0;
  }
  return AUTHOR_PALETTE[Math.abs(hash) % AUTHOR_PALETTE.length];
}
