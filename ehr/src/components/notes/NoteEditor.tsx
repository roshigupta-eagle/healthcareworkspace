"use client";

import React, { useRef, useState } from "react";
import { renderTrackChanges } from "@/notes/diffEngine";
import { templatesForType } from "@/notes/templates";
import { NOTE_TYPE_LABELS, type NoteAuthor, type NoteDocument } from "@/notes/types";
import { useNotesPermissions } from "@/notes/useNotesPermissions";
import RevisionHistoryPanel from "./RevisionHistoryPanel";
import TiptapEditor, { type TiptapEditorHandle } from "./TiptapEditor";
import TrackChangesOverlay from "./TrackChangesOverlay";
import TrackChangesToolbar from "./TrackChangesToolbar";

const AUTOSAVE_DELAY_MS = 600;

interface Props {
  note: NoteDocument;
  currentUser: NoteAuthor;
  onNoteUpdated: (note: NoteDocument) => void;
}

async function callApi<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? `Request failed (${res.status})`);
  return data as T;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Mount this component with `key={note.id}` from the parent so switching
 * notes remounts it and resets local editor state, rather than syncing
 * state from props in an effect.
 */
export default function NoteEditor({ note, currentUser, onNoteUpdated }: Props) {
  const perms = useNotesPermissions(currentUser.role);
  const myPendingRevision = note.pendingRevisions.find((r) => r.authorId === currentUser.id);
  const [draftText, setDraftText] = useState(() => myPendingRevision?.resultingText ?? note.baseText);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [addendumText, setAddendumText] = useState("");
  const [busyRevisionId, setBusyRevisionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef = useRef<TiptapEditorHandle>(null);

  const canEdit = perms.canEdit(note) && note.status === "draft";
  const canReview = perms.canReview(note);
  const canSignNote = perms.canSign(note.type) && note.pendingRevisions.length === 0 && note.status === "draft";
  const canAddAddendum = perms.canAddendum(note);

  function scheduleSave(nextText: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void save(nextText), AUTOSAVE_DELAY_MS);
  }

  async function save(nextText: string) {
    if (nextText === note.baseText && !myPendingRevision) return;
    setSaveState("saving");
    try {
      const data = await callApi<{ note: NoteDocument }>(`/api/notes/${note.id}`, {
        method: "PATCH",
        body: JSON.stringify({ nextText }),
      });
      onNoteUpdated(data.note);
      setSaveState("saved");
    } catch (err) {
      setSaveState("error");
      setError(errorMessage(err));
    }
  }

  function handleChange(value: string) {
    setDraftText(value);
    scheduleSave(value);
  }

  function insertTemplate(body: string) {
    editorRef.current?.insertText(body);
  }

  async function handleAccept(revisionId: string, opIds?: string[]) {
    setBusyRevisionId(revisionId);
    setError(null);
    try {
      const data = await callApi<{ note: NoteDocument }>(`/api/notes/${note.id}/revisions/${revisionId}/accept`, {
        method: "POST",
        body: JSON.stringify({ opIds }),
      });
      onNoteUpdated(data.note);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyRevisionId(null);
    }
  }

  async function handleReject(revisionId: string, opIds?: string[]) {
    setBusyRevisionId(revisionId);
    setError(null);
    try {
      const data = await callApi<{ note: NoteDocument }>(`/api/notes/${note.id}/revisions/${revisionId}/reject`, {
        method: "POST",
        body: JSON.stringify({ opIds }),
      });
      onNoteUpdated(data.note);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyRevisionId(null);
    }
  }

  async function handleSign() {
    setError(null);
    try {
      const data = await callApi<{ note: NoteDocument }>(`/api/notes/${note.id}/sign`, { method: "POST" });
      onNoteUpdated(data.note);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function handleAddendum() {
    if (!addendumText.trim()) return;
    setError(null);
    try {
      const data = await callApi<{ note: NoteDocument }>(`/api/notes/${note.id}/addendum`, {
        method: "POST",
        body: JSON.stringify({ text: addendumText }),
      });
      onNoteUpdated(data.note);
      setAddendumText("");
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  const segments = renderTrackChanges(note.baseText, note.pendingRevisions);
  const templates = templatesForType(note.type);

  return (
    <div className="flex h-full flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-2 border-b border-gray-100 pb-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{note.title}</h2>
          <div className="text-xs text-gray-500">
            {NOTE_TYPE_LABELS[note.type]} · Created by {note.createdBy.name} ·{" "}
            {note.status === "signed" ? `Signed by ${note.signedBy?.name}` : "Draft"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {note.status === "draft" && (
            <span className="text-xs text-gray-400">
              {saveState === "saving" && "Saving…"}
              {saveState === "saved" && "Saved"}
              {saveState === "error" && <span className="text-red-500">Save failed</span>}
            </span>
          )}
          {canSignNote && (
            <button onClick={handleSign} className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700">
              Sign note
            </button>
          )}
          {note.status === "draft" && note.pendingRevisions.length > 0 && !canSignNote && perms.canSign(note.type) && (
            <span className="text-xs text-amber-600">
              Resolve {note.pendingRevisions.length} pending change{note.pendingRevisions.length === 1 ? "" : "s"} to sign
            </span>
          )}
        </div>
      </header>

      {error && <div className="rounded bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}

      {canEdit && (
        <div>
          {templates.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => insertTemplate(tpl.body)}
                  className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                >
                  Insert {tpl.label} template
                </button>
              ))}
            </div>
          )}
          <TiptapEditor
            ref={editorRef}
            initialText={draftText}
            editable={canEdit}
            onChangeText={handleChange}
            placeholder="Start typing… changes are tracked and autosaved."
          />
        </div>
      )}

      <section>
        <h3 className="mb-2 text-sm font-semibold text-gray-800">
          Track changes {note.pendingRevisions.length > 0 && `(${note.pendingRevisions.length} pending)`}
        </h3>
        <div className="rounded-md border border-gray-100 bg-white p-3">
          <TrackChangesOverlay segments={segments} />
        </div>
        {canReview && note.pendingRevisions.length > 0 && (
          <div className="mt-2 space-y-2">
            {note.pendingRevisions.map((rev) => (
              <TrackChangesToolbar
                key={rev.id}
                revision={rev}
                disabled={busyRevisionId === rev.id}
                onAccept={() => handleAccept(rev.id)}
                onReject={() => handleReject(rev.id)}
              />
            ))}
          </div>
        )}
      </section>

      {note.addenda.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-gray-800">Addenda</h3>
          <ul className="space-y-2">
            {note.addenda.map((a) => (
              <li key={a.id} className="rounded border border-amber-100 bg-amber-50 p-2 text-xs">
                <div className="font-medium text-amber-800">
                  {a.authorName} · {new Date(a.createdAt).toLocaleString()}
                </div>
                <div className="mt-1 whitespace-pre-wrap text-gray-700">{a.text}</div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {canAddAddendum && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-gray-800">Add addendum</h3>
          <textarea
            aria-label="Addendum text"
            value={addendumText}
            onChange={(e) => setAddendumText(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-gray-200 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200"
            placeholder="Signed notes are immutable — append a dated addendum instead."
          />
          <button
            onClick={handleAddendum}
            className="mt-2 rounded bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700"
          >
            Add addendum
          </button>
        </section>
      )}

      <section>
        <h3 className="mb-2 text-sm font-semibold text-gray-800">Revision history</h3>
        <RevisionHistoryPanel revisions={note.revisionHistory} />
      </section>
    </div>
  );
}
