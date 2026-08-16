"use client";

import React, { useState } from "react";
import { NOTE_TYPE_LABELS, type NoteType } from "@/notes/types";
import { templatesForType } from "@/notes/templates";

const DEMO_PATIENTS = [
  { id: "patient-001", name: "Eleanor Vance" },
  { id: "patient-002", name: "Marcus Reid" },
  { id: "patient-003", name: "Sofia Alvarez" },
];

interface Props {
  availableTypes: NoteType[];
  onCancel: () => void;
  onCreate: (input: { type: NoteType; title: string; baseText: string; patientId: string }) => Promise<void>;
}

export default function NewNoteDialog({ availableTypes, onCancel, onCreate }: Props) {
  const [patientId, setPatientId] = useState(DEMO_PATIENTS[0].id);
  const [type, setType] = useState<NoteType>(availableTypes[0]);
  const [title, setTitle] = useState("");
  const [baseText, setBaseText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const templates = templatesForType(type);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onCreate({ patientId, type, title: title || NOTE_TYPE_LABELS[type], baseText });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl">
        <h2 className="text-base font-semibold text-gray-900">New note</h2>

        {error && <div className="mt-2 rounded bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}

        <label className="mt-4 block text-xs font-medium text-gray-600">Patient</label>
        <select
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
          className="mt-1 w-full rounded border border-gray-200 px-2 py-1.5 text-sm"
        >
          {DEMO_PATIENTS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <label className="mt-3 block text-xs font-medium text-gray-600">Note type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as NoteType)}
          className="mt-1 w-full rounded border border-gray-200 px-2 py-1.5 text-sm"
        >
          {availableTypes.map((t) => (
            <option key={t} value={t}>
              {NOTE_TYPE_LABELS[t]}
            </option>
          ))}
        </select>

        <label className="mt-3 block text-xs font-medium text-gray-600">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={NOTE_TYPE_LABELS[type]}
          className="mt-1 w-full rounded border border-gray-200 px-2 py-1.5 text-sm"
        />

        <div className="mt-3 flex items-center justify-between">
          <label className="block text-xs font-medium text-gray-600">Content</label>
          {templates.length > 0 && (
            <button
              type="button"
              onClick={() => setBaseText(templates[0].body)}
              className="text-xs text-teal-600 hover:underline"
            >
              Insert {templates[0].label} template
            </button>
          )}
        </div>
        <textarea
          value={baseText}
          onChange={(e) => setBaseText(e.target.value)}
          rows={6}
          className="mt-1 w-full rounded border border-gray-200 p-2 text-sm"
        />

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded border border-gray-200 px-3 py-1.5 text-sm text-gray-600">
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {busy ? "Creating…" : "Create note"}
          </button>
        </div>
      </form>
    </div>
  );
}
