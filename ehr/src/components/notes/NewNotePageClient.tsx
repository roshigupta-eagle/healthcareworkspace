"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TiptapEditor from "./TiptapEditor";
import { NOTE_TYPE_LABELS, type NoteType } from "@/notes/types";
import { templatesForType } from "@/notes/templates";
import { useNotesPermissions } from "@/notes/useNotesPermissions";

async function callApi<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? `Request failed (${res.status})`);
  return data as T;
}

export default function NewNotePageClient({ patient }: { patient: any }) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const perms = useNotesPermissions(currentUser?.role);

  const availableTypes = perms?.availableTypes?.length ? perms.availableTypes : (Object.keys(NOTE_TYPE_LABELS) as NoteType[]);

  const [type, setType] = useState<NoteType>(availableTypes[0]);
  const [title, setTitle] = useState("");
  const [baseText, setBaseText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d?.authenticated && d.user) setCurrentUser({ id: d.user.id, name: d.user.name ?? "Me", role: d.user.role ?? "PENDING" });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const templates = templatesForType(type);

  async function handleCreate(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await callApi<{ note: any }>("/api/notes", {
        method: "POST",
        body: JSON.stringify({ patientId: patient.id, type, title: title ?? NOTE_TYPE_LABELS[type], baseText }),
      });
      // Navigate to the canonical note view
      router.push(`/patients/${patient.id}/notes/${data.note.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F6F9FB] py-6">
      <div className="max-w-3xl mx-auto px-4">
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-[#E6EEF2] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold text-[#121A2D]">New Clinical Note</h2>
            <a href={`/dashboard/records/${patient.id}/doctor-notes`} className="text-sm text-teal-600 hover:underline">Cancel</a>
          </div>

          {error && <div className="mb-3 rounded bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}

          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-xs text-gray-500">Note type</label>
              <select value={type} onChange={(e) => setType(e.target.value as NoteType)} className="w-full mt-2 px-3 py-2 border rounded">
                {availableTypes.map((t) => (
                  <option key={t} value={t}>{NOTE_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-500">Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={NOTE_TYPE_LABELS[type]} className="w-full mt-2 px-3 py-2 border rounded" />
            </div>

            <div>
              <label className="text-xs text-gray-500">Content</label>
              <div className="mt-2">
                <TiptapEditor initialText={baseText} editable={true} onChangeText={(t) => setBaseText(t)} placeholder="Start typing the clinical note…" />
              </div>
              {templates.length > 0 && (
                <div className="mt-2 text-xs text-gray-500">Templates: <button type="button" onClick={() => setBaseText(templates[0].body)} className="text-teal-600">Insert {templates[0].label}</button></div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2">
              <a href={`/dashboard/records/${patient.id}/doctor-notes`} className="rounded border border-gray-200 px-3 py-2 text-sm text-gray-600">Cancel</a>
              <button type="submit" disabled={busy} className="rounded bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">{busy ? 'Creating…' : 'Create note'}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
