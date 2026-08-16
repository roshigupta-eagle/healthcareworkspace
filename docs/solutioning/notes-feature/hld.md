# Notes Feature — High-Level Design (HLD)

| Field | Value |
|---|---|
| Initiative | Unified Clinical/Staff Notes with Track Changes |
| Author | Winston (Architect) |
| Reviewers | Alex (FHIR SME), Amelia (Backend/Dev) |
| Status | Draft — implemented incrementally (see §7 Rollout) |
| Created | 2026-07-30 |

## 1. Problem statement

Notes today are fragmented: SOAP notes (`SOAPNoteEditor`), the doctor-facing
timeline (`DoctorNotesClient`), the read-only `RoshiNoteEditorClient`, and
ad-hoc `notes` fields scattered across mock patient records. There is no
shared engine, no edit history, no way to see **who changed what**, and the
UI is scoped to physicians only.

**Goal:** one Notes engine, usable by **every hospital staff role**
(physician, nurse, pharmacist, lab tech, receptionist, billing, PCA, admin),
that is:

- **Feature-rich** — templates, rich text, mentions, attachments, addenda,
  digital sign-off, full-text search/filter, FHIR export.
- **Track-changes enabled** — every edit after first save is captured as an
  attributable, reviewable, accept/reject-able change (Word-style redlining),
  never silently overwriting another author's text.
- **Fast** — optimistic UI, debounced autosave, no full-page reloads,
  sub-100ms perceived latency for typing and tab switches.

## 2. Actors

| Role (Prisma `Role` enum) | Can author notes | Can edit others' pending changes | Can sign/finalize | Can view |
|---|---|---|---|---|
| DOCTOR | ✅ | ✅ (own patients' encounters) | ✅ | Full |
| NURSE | ✅ | ✅ | ✅ (nursing note types only) | Full |
| PHARMACIST | ✅ (medication-review notes) | ➖ | ✅ (own note types) | Full |
| LAB_TECH | ✅ (result-annotation notes) | ➖ | ✅ (own note types) | Full |
| RECEPTIONIST / BILLING / PCA | ✅ (administrative notes only) | ➖ | ➖ (no clinical sign-off) | Administrative notes + read-only clinical summary |
| ADMIN | ✅ | ✅ | ✅ | Full (oversight) |
| PATIENT | ➖ | ➖ | ➖ | Own signed notes only (future scope) |

Permission enforcement happens **twice**: client-side (`useNotesPermissions`,
UX affordance) and server-side (API route guards) — the client check is a
convenience only, never the source of truth.

## 3. High-level architecture

```mermaid
graph TD
    subgraph Client [Next.js Client]
        NW[NotesWorkbench]
        NE[NoteEditor + Track Changes UI]
        RH[RevisionHistoryPanel]
    end
    subgraph Server [Next.js Route Handlers]
        API[/api/notes/*]
        PERM[Permission Guard]
        SVC[NotesService]
        DIFF[Track-Changes Diff Engine]
        AUDIT[Audit + Provenance Writer]
    end
    subgraph Data
        DB[(NoteDocument / NoteRevision / NoteChange / NoteComment)]
        FHIR[(FHIR Composition / DocumentReference — export)]
    end

    NW --> API
    NE --> API
    RH --> API
    API --> PERM --> SVC
    SVC --> DIFF
    SVC --> DB
    SVC --> AUDIT
    SVC -. export .-> FHIR
```

- **Domain module**: `ehr/src/notes/` — types, diff engine, permission
  matrix, service interface. Mirrors the existing `ehr/src/cardiology/`
  pattern (mock service now, swappable for a real repository later).
- **API layer**: `ehr/src/app/api/notes/**` route handlers — thin, delegate
  to the service, always call `logAuditEvent`/`withAudit`.
- **UI layer**: `ehr/src/components/notes/**` — workbench (list + filters),
  a [Tiptap](https://tiptap.dev/)-based rich text editor (MIT-licensed,
  ProseMirror core) with inline track-changes marks, revision history / diff
  viewer, accept/reject toolbar. See §4a for why Tiptap was selected.

### 3a. Editor engine: Tiptap (open source, ProseMirror-based)

The authoring surface (`ehr/src/components/notes/TiptapEditor.tsx`) is
built on **Tiptap** — already an installed dependency
(`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-placeholder`,
`@tiptap/extension-underline`, `@tiptap/extension-link`), all MIT-licensed
and built on ProseMirror. This gives every staff role a genuinely
feature-rich editor (bold/italic/underline/strike, headings, bullet/ordered
lists, blockquotes, undo/redo, placeholder text, live word count) without
adopting a paid/closed-source WYSIWYG.

Tiptap owns the *authoring* experience only. It is intentionally decoupled
from the track-changes engine: on every edit it reports plain text
(`editor.getText()`) to the existing word-level diff engine
(`@/notes/diffEngine`), which continues to compute/render/accept/reject
changes exactly as described in §4. This keeps the track-changes model
simple and testable while still giving staff a modern editing surface.
Rich formatting is preserved live in the editor and in the signed record's
display, but the durable *tracked* content (base text, revision ops,
accepted/rejected diffs) is plain text in Phase 1 — see LLD §10 for the
upgrade path to HTML/ProseMirror-JSON-aware diffing (e.g. via
`prosemirror-changeset`) once formatting needs to survive round trips
through accept/reject.

## 4. Track-changes strategy

Modeled after Word/Google Docs "Suggesting" mode, adapted for clinical
documentation:

1. **Base content** — the last *accepted* (clean) text of the note.
2. **Working draft** — the author's live edits, held client-side and
   autosaved as a `NoteRevision` in `status = "pending"`.
2a. A revision stores a **word-level diff op list** (`insert` / `delete` /
   `retain`) against the base, not a full-text overwrite — this is what
   allows two authors' concurrent pending revisions to render as separate,
   attributable colored change-marks over the same base.
3. **Review** — any staff member with edit rights on that note type sees
   pending revisions rendered inline (insertions underlined, deletions
   struck through, colored per-author) with **Accept** / **Reject** controls
   per change or in bulk.
4. **Merge** — accepting a revision (or all its ops) applies it to the base,
   creating a new immutable `NoteRevision` snapshot (audit trail keeps every
   prior snapshot — nothing is ever deleted).
5. **Sign** — a clinician with sign-off rights finalizes the note
   (`status = "signed"`), which locks the base; further edits must go through
   an **addendum** (append-only), matching real clinical documentation rules
   and FHIR `Composition.status = final` semantics.

This gives full attribution (`FHIR Provenance`), never loses a
co-author's work, and keeps the common case (solo author, no conflicts) as
fast as a normal autosaving textarea — the diff machinery is invisible until
a second author's pending change actually exists.

## 5. Performance approach ("fast")

- Debounced client autosave (600ms) posts only the diff, not the whole note.
- Optimistic local state update; server confirmation reconciles in the
  background (matches the acknowledge/complete/check-in pattern already used
  in the dashboard widgets).
- Note list uses windowed rendering once >50 notes; search/filter is
  client-side over an indexed in-memory slice for the active patient.
- No blocking full-page navigation — the editor is a client component that
  never remounts on tab/filter changes.

## 6. Security & compliance

- Every create/edit/accept/reject/sign/view-of-PHI writes an `AuditEvent`
  (existing `logAuditEvent`/`withAudit` helpers).
- Every state transition (create, revision-accept, sign, addendum) writes a
  `Provenance` record (`agentType`, `agentId`, `activity`).
- Administrative roles (RECEPTIONIST/BILLING/PCA) are restricted to a
  non-clinical note-type allowlist enforced server-side.
- Signed notes are immutable; corrections are addenda only (no destructive
  edits after sign-off) — satisfies medico-legal record-keeping expectations.

## 7. Rollout phases

1. **Phase 1 (this change)** — shared domain engine, mock/in-memory
   persistence-shaped service, API routes, `NotesWorkbench` +
   `NoteEditor` with track changes, `/dashboard/notes` entry point wired
   from the existing Action Center link.
2. **Phase 2** — Prisma-backed persistence (schema added now, migration run
   when a DB is available), replace mock service with a Prisma repository
   behind the same `NotesService` interface.
3. **Phase 3** — migrate existing surfaces (`SOAPNoteEditor`,
   `DoctorNotesClient`, per-record "Notes" tabs) onto the shared engine so
   there is exactly one notes implementation.
4. **Phase 4** — FHIR export (`Composition` + `DocumentReference`) and
   real-time co-authoring (WebSocket) if concurrent editing volume warrants
   it.

See [LLD](lld.md) for data model, API contract, and component detail.
