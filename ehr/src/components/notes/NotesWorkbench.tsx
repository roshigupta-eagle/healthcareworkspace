"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { NOTE_TYPE_LABELS, type NoteAuthor, type NoteDocument, type NoteType } from "@/notes/types";
import { useNotesPermissions } from "@/notes/useNotesPermissions";
import NoteEditor from "./NoteEditor";
import NoteListItem from "./NoteListItem";
import NewNoteDialog from "./NewNoteDialog";

async function callApi<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? `Request failed (${res.status})`);
  return data as T;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export default function NotesWorkbench() {
  const searchParams = useSearchParams();
  const [currentUser, setCurrentUser] = useState<NoteAuthor | null>(null);
  const [notes, setNotes] = useState<NoteDocument[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") ?? "");
  const [typeFilter, setTypeFilter] = useState<NoteType | "">((searchParams.get("type") as NoteType) ?? "");
  const [showNewNote, setShowNewNote] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const perms = useNotesPermissions(currentUser?.role);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d?.authenticated && d.user) {
          setCurrentUser({ id: d.user.id, name: d.user.name ?? "Me", role: d.user.role ?? "PENDING" });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve()
      .then(() => {
        if (cancelled) return undefined;
        setLoading(true);
        setError(null);
        const qs = new URLSearchParams();
        if (statusFilter) qs.set("status", statusFilter);
        if (typeFilter) qs.set("type", typeFilter);
        return callApi<{ notes: NoteDocument[] }>(`/api/notes?${qs.toString()}`);
      })
      .then((data) => {
        if (cancelled || !data) return;
        setNotes(data.notes);
        setSelectedId((prev) => prev ?? data.notes[0]?.id ?? null);
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [statusFilter, typeFilter]);

  const selectedNote = useMemo(() => notes.find((n) => n.id === selectedId) ?? null, [notes, selectedId]);

  function handleNoteUpdated(updated: NoteDocument) {
    setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
  }

  async function handleCreate(input: { type: NoteType; title: string; baseText: string; patientId: string }) {
    const data = await callApi<{ note: NoteDocument }>("/api/notes", { method: "POST", body: JSON.stringify(input) });
    setNotes((prev) => [data.note, ...prev]);
    setSelectedId(data.note.id);
    setShowNewNote(false);
  }

  if (!perms.canView) {
    return <div className="p-6 text-sm text-gray-500">Notes are not available for your role.</div>;
  }

  return (
    <div className="flex h-full gap-4">
      <aside className="w-80 shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">Notes</h2>
          <button
            onClick={() => setShowNewNote(true)}
            className="rounded bg-teal-600 px-2 py-1 text-xs font-medium text-white hover:bg-teal-700"
          >
            + New note
          </button>
        </div>

        <div className="flex gap-2">
          <select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-1/2 rounded border border-gray-200 px-2 py-1 text-xs"
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="signed">Signed</option>
          </select>
          <select
            aria-label="Filter by type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as NoteType | "")}
            className="w-1/2 rounded border border-gray-200 px-2 py-1 text-xs"
          >
            <option value="">All types</option>
            {perms.availableTypes.map((t) => (
              <option key={t} value={t}>
                {NOTE_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>

        {loading && <div className="text-xs text-gray-400">Loading…</div>}
        {error && <div className="text-xs text-red-600">{error}</div>}
        {!loading && notes.length === 0 && <div className="text-xs text-gray-400">No notes match these filters.</div>}

        <div className="space-y-2 overflow-y-auto" style={{ maxHeight: "70vh" }}>
          {notes.map((n) => (
            <NoteListItem key={n.id} note={n} active={n.id === selectedId} onSelect={() => setSelectedId(n.id)} />
          ))}
        </div>
      </aside>

      <main className="min-w-0 flex-1 rounded-md border border-gray-100 bg-white p-4">
        {selectedNote && currentUser ? (
          <NoteEditor key={selectedNote.id} note={selectedNote} currentUser={currentUser} onNoteUpdated={handleNoteUpdated} />
        ) : (
          <div className="p-6 text-sm text-gray-400">Select a note or create a new one.</div>
        )}
      </main>

      {showNewNote && currentUser && (
        <NewNoteDialog
          availableTypes={perms.availableTypes}
          onCancel={() => setShowNewNote(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}
