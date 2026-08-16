"use client";

import React, { useEffect, useRef, useState } from 'react';
import { mapNoteToFHIR } from '@/lib/fhir/mappers';

type Props = { patient: any; note: any };

export default function RoshiNoteEditorClient({ patient, note }: Props) {
  const key = `roshi-note-${patient.id}-${note.id}`;
  const versionsKey = `${key}-versions`;
  const auditKey = `${key}-audit`;

  const [content, setContent] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) return saved;
    } catch {}
    return note.content || note.snippet || '';
  });

  const [saving, setSaving] = useState(false);
  const [versions, setVersions] = useState<any[]>(() => { try { return JSON.parse(localStorage.getItem(versionsKey) || '[]'); } catch { return []; } });
  const [audit, setAudit] = useState<any[]>(() => { try { return JSON.parse(localStorage.getItem(auditKey) || '[]'); } catch { return []; } });

  const timer = useRef<number | null>(null);

  useEffect(() => {
    // Persist versions/audit to localStorage when changed
    try { localStorage.setItem(versionsKey, JSON.stringify(versions)); } catch {}
  }, [versions]);

  useEffect(() => { try { localStorage.setItem(auditKey, JSON.stringify(audit)); } catch {} }, [audit]);

  useEffect(() => {
    return () => { if (timer.current) window.clearTimeout(timer.current); };
  }, []);

  function scheduleAutosave() {
    if (timer.current) window.clearTimeout(timer.current);
    setSaving(true);
    timer.current = window.setTimeout(() => { doSave('autosave'); }, 2000);
  }

  function doSave(kind: string = 'manual') {
    setSaving(true);
    try {
      localStorage.setItem(key, content);
      const v = { id: Date.now(), ts: new Date().toISOString(), kind, content, actor: 'local-user' };
      setVersions((s) => [v, ...s].slice(0, 50));
      setAudit((s) => [{ event: 'save', ts: new Date().toISOString(), kind, actor: 'local-user' }, ...s].slice(0, 200));
    } catch (e) {
      console.error('save failed', e);
    } finally {
      setSaving(false);
    }
  }

  function saveNow() { if (timer.current) window.clearTimeout(timer.current); doSave('manual'); }

  function saveVersion() { const v = { id: Date.now(), ts: new Date().toISOString(), content, actor: 'local-user' }; setVersions((s) => [v, ...s]); setAudit((s) => [{ event: 'version', ts: new Date().toISOString(), actor: 'local-user' }, ...s]); }

  function exportFHIR() {
    const bundle = mapNoteToFHIR(patient, { ...note, content });
    const data = JSON.stringify(bundle, null, 2);
    const blob = new Blob([data], { type: 'application/fhir+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `patient-${patient.id}-note-${note.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setAudit((s) => [{ event: 'export:fhir', ts: new Date().toISOString(), actor: 'local-user' }, ...s]);
  }

  function onInput(e: React.FormEvent<HTMLDivElement>) {
    const text = (e.target as HTMLDivElement).innerHTML || '';
    setContent(text);
    scheduleAutosave();
  }

  return (
    <div className="bg-white rounded-lg p-4 border border-[#DDE7F0] shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold">{note.title || 'Clinical Note'}</h3>
          <div className="text-sm text-gray-500">Author: {note.author || 'Unknown'} — {note.date || note.ts || '—'}</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={saveNow} className="px-3 py-2 bg-white border rounded text-sm">Save</button>
          <button onClick={saveVersion} className="px-3 py-2 bg-white border rounded text-sm">Save Version</button>
          <button onClick={exportFHIR} className="px-3 py-2 bg-white border rounded text-sm">Export FHIR</button>
          <button onClick={() => window.print()} className="px-3 py-2 bg-white border rounded text-sm">Print</button>
        </div>
      </div>

      <div className="mb-3">
        <div className="text-xs text-gray-600">Editor (basic demo) — replace with Tiptap for production</div>
        <div
          role="textbox"
          aria-label="Clinical note editor"
          contentEditable
          onInput={onInput}
          dangerouslySetInnerHTML={{ __html: content }}
          className="min-h-[220px] border mt-2 p-3 rounded focus:outline-none focus:ring"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="col-span-2">
          <h4 className="text-sm font-semibold">Version History</h4>
          <div className="mt-2 text-sm text-gray-700 max-h-48 overflow-auto space-y-2">
            {versions.length === 0 && <div className="text-gray-500">No versions yet.</div>}
            {versions.map((v) => (
              <div key={v.id} className="p-2 border rounded bg-[#FAFAFA]">
                <div className="text-xs text-gray-500">{new Date(v.ts).toLocaleString()} — {v.kind || 'snapshot'}</div>
                <div className="text-sm mt-1 line-clamp-3" dangerouslySetInnerHTML={{ __html: v.content }} />
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold">Audit History</h4>
          <div className="mt-2 text-sm text-gray-700 max-h-48 overflow-auto space-y-2">
            {audit.length === 0 && <div className="text-gray-500">No audit events yet.</div>}
            {audit.map((a) => (
              <div key={a.ts || a.id} className="p-2 border rounded bg-[#FAFAFA]"><div className="text-xs text-gray-500">{a.ts}</div><div className="text-sm">{a.event || a.kind || JSON.stringify(a)}</div></div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-500">Autosave: {saving ? 'saving…' : 'idle'}</div>
    </div>
  );
}
