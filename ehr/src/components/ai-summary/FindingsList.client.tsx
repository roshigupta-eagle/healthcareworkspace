"use client";

import React, { useState } from 'react';
import EvidenceDrawer from './EvidenceDrawer.client';

export default function FindingsList({ findings = [], patientId }: { findings?: any[]; patientId?: string }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<any[]>([]);

  function openEvidence(evidence?: any[]) {
    setSelectedEvidence(evidence || []);
    setDrawerOpen(true);
  }

  async function handleCreateTask(finding: any) {
    try {
      const title = `Follow-up: ${finding?.title ?? finding?.name ?? 'AI finding'}`;
      const payload = { title, patientId: patientId ?? undefined, assignedTo: null, priority: 'medium', category: 'AI Follow-up' };
      const res = await fetch('/api/tasks', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) {
        // basic success feedback; UI-level notifications can be extended
        window.alert('Task created');
      } else {
        window.alert('Failed to create task');
      }
    } catch (e) {
      window.alert('Failed to create task');
    }
  }

  if (!findings || findings.length === 0) {
    return <div className="text-sm text-slate-600">✓ No immediate review items identified from the available records.</div>;
  }

  return (
    <div className="space-y-3">
      {(findings || []).map((f: any) => (
        <div key={f.id || f.title} className="flex items-start justify-between gap-4 p-3 rounded border bg-white">
          <div className="flex-1">
            <div className="font-medium text-slate-900">{f.title || f.name || f.code || 'Attention item'}</div>
            <div className="text-xs text-slate-500">{f.explanation || f.note || ''}</div>
            <div className="mt-2 flex gap-2 flex-wrap">
              {(f.evidence || []).map((ev:any, idx:number) => (
                <button key={idx} onClick={() => openEvidence([ev])} className="px-2 py-1 bg-slate-50 rounded text-xs text-slate-700 border">
                  {ev.source || ev.type || ev.title || 'Source'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 items-end">
            <button onClick={() => handleCreateTask(f)} className="px-3 py-1 rounded bg-sky-600 text-white text-sm">Create Follow-up Task</button>
            <button onClick={() => openEvidence(f.evidence || [])} className="px-2 py-1 rounded border text-sm">View Evidence</button>
            <div className="text-xs text-slate-500">{f.observedAt ? new Date(f.observedAt).toLocaleDateString() : ''}</div>
          </div>
        </div>
      ))}

      <EvidenceDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} evidence={selectedEvidence} patientId={patientId} />
    </div>
  );
}
