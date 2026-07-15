"use client";
/**
 * EPIC-CLIN-03: Structured SOAP Note Editor
 * Binds directly to FHIR DocumentReference on save.
 */
import React, { useState } from "react";

export interface SOAPNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

interface Props {
  encounterId: string;
  practitionerName: string;
  initialNote?: SOAPNote;
  onSaved?: (note: SOAPNote) => void;
}

const SECTION_META: Array<{ key: keyof SOAPNote; label: string; placeholder: string; hint: string }> = [
  {
    key: "subjective",
    label: "S — Subjective",
    placeholder: "Chief complaint, history of present illness, review of systems, medications, allergies...",
    hint: "What the patient reports — HPI, PMHx, symptoms, pain scale.",
  },
  {
    key: "objective",
    label: "O — Objective",
    placeholder: "Vital signs, physical examination findings, lab results, imaging...",
    hint: "Measurable findings — vitals, exam, investigations.",
  },
  {
    key: "assessment",
    label: "A — Assessment",
    placeholder: "Primary diagnosis (ICD-10-CA), differential diagnoses, clinical impression...",
    hint: "Clinical interpretation — primary and differential diagnoses.",
  },
  {
    key: "plan",
    label: "P — Plan",
    placeholder: "Investigations ordered, medications prescribed, referrals, follow-up, patient education...",
    hint: "Orders, treatments, follow-up, and patient instructions.",
  },
];

export default function SOAPNoteEditor({ encounterId, practitionerName, initialNote, onSaved }: Props) {
  const [note, setNote] = useState<SOAPNote>(
    initialNote ?? { subjective: "", objective: "", assessment: "", plan: "" }
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function update(key: keyof SOAPNote, value: string) {
    setNote((n) => ({ ...n, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    const missing = SECTION_META.filter((s) => !note[s.key].trim()).map((s) => s.label);
    if (missing.length === 4) {
      setError("Please complete at least one section before saving.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/encounters/${encounterId}/soap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...note, practitionerName }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.error ?? "Save failed");
      }
      setSaved(true);
      onSaved?.(note);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const wordCount = Object.values(note).join(" ").trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-neutral-900">Clinical Note — SOAP Format</h3>
          <p className="text-xs text-neutral-500">Author: {practitionerName} &bull; Encounter: {encounterId} &bull; {wordCount} words</p>
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="text-xs text-green-700 font-medium">✓ Saved to FHIR</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : "Save & Sign Note"}
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {SECTION_META.map(({ key, label, placeholder, hint }) => (
          <div key={key} className="rounded-xl border border-neutral-200 overflow-hidden focus-within:border-sky-400 focus-within:ring-1 focus-within:ring-sky-400 transition-all">
            <div className="px-4 py-2 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
              <span className="font-semibold text-neutral-800 text-sm">{label}</span>
              <span className="text-xs text-neutral-400">{hint}</span>
            </div>
            <textarea
              value={note[key]}
              onChange={(e) => update(key, e.target.value)}
              placeholder={placeholder}
              rows={5}
              className="w-full px-4 py-3 text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none resize-y bg-white"
              aria-label={label}
            />
          </div>
        ))}
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => { setNote({ subjective: "", objective: "", assessment: "", plan: "" }); setSaved(false); }}
          className="px-3 py-1.5 border border-neutral-200 rounded-lg text-sm hover:bg-neutral-50 transition-colors"
        >
          Clear
        </button>
        <div className="text-xs text-neutral-400 self-center ml-auto">
          Notes are saved as FHIR DocumentReference (type: LOINC 11506-3 Progress note)
        </div>
      </div>
    </div>
  );
}