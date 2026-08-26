"use client";

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';

export default function EvidenceDrawer({ open, onClose, evidence, patientId }: { open: boolean; onClose: ()=>void; evidence?: any[]; patientId?: string }) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  function openRecord(e: any) {
    const pid = patientId ?? '';
    if (!e) return '#';
    const type = (e.resourceType || e.type || '').toLowerCase();
    if (type.includes('observation') || type.includes('lab')) return `/dashboard/records/${pid}/labs`;
    if (type.includes('note') || type.includes('document')) return `/dashboard/records/${pid}/notes`;
    if (type.includes('medication')) return `/dashboard/records/${pid}/medications`;
    if (type.includes('condition')) return `/dashboard/records/${pid}/conditions`;
    return `/dashboard/records/${pid}`;
  }

  return (
    <dialog ref={dialogRef} className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-4" onClose={onClose} onClick={(ev)=>{ if (ev.target === ev.currentTarget) onClose(); }}>
      <div className="w-full max-w-2xl rounded-2xl bg-white border p-4 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Evidence</h3>
            <div className="text-sm text-slate-500">Supporting source records for this claim</div>
          </div>
          <div>
            <button onClick={onClose} className="rounded px-3 py-1 text-sm">Close</button>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {(!evidence || evidence.length === 0) && <div className="text-sm text-slate-600">No linked evidence</div>}
          {(evidence || []).map((e:any, i:number) => (
            <div key={i} className="p-3 rounded border bg-slate-50">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-medium">{e.title || e.type || e.resourceType || 'Source'}</div>
                  <div className="text-xs text-slate-500">{e.date ? new Date(e.date).toLocaleString() : ''} · {e.source || e.provider || ''}</div>
                </div>
                <div className="text-right">
                  <Link href={openRecord(e)} className="text-sm text-teal-600">Open Full Record →</Link>
                </div>
              </div>
              {e.value && <div className="mt-2 text-sm">Value: <span className="font-medium">{e.value}{e.unit ? ` ${e.unit}` : ''}</span></div>}
              {e.note && <div className="mt-2 text-sm text-slate-700">{e.note}</div>}
            </div>
          ))}
        </div>
      </div>
    </dialog>
  );
}
