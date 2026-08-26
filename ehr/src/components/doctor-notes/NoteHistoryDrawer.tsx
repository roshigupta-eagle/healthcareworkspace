"use client";

import { useEffect, useState } from 'react';
import type { DoctorNote, DoctorNoteAddendum, DoctorNoteCorrection, DoctorNoteEnteredInError, DoctorNoteHistoryEntry } from '@/types/doctorNote';
import Drawer from './Drawer';
import { formatNoteDateTime } from './constants';

type Props = {
  patientId: string;
  note: DoctorNote;
  onClose: () => void;
};

type HistoryResponse = {
  history: DoctorNoteHistoryEntry[];
  addenda: DoctorNoteAddendum[];
  correction: DoctorNoteCorrection | null;
  enteredInError: DoctorNoteEnteredInError | null;
};

export default function NoteHistoryDrawer({ patientId, note, onClose }: Props) {
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/patients/${encodeURIComponent(patientId)}/notes/${encodeURIComponent(note.id)}/history`)
      .then((res) => res.json())
      .then((body) => {
        if (!cancelled) setData(body);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [patientId, note.id]);

  return (
    <Drawer title="Version History" subtitle={note.type} onClose={onClose}>
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 rounded-lg bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {(data?.history || []).slice().reverse().map((h) => (
            <div key={h.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3.5 py-2.5">
              <div className="text-sm font-medium text-slate-800 capitalize">{h.action}</div>
              <div className="text-xs text-slate-500 mt-0.5">
                {h.actor.name} · {formatNoteDateTime(h.timestamp)}
              </div>
              {h.details && <div className="text-xs text-slate-500 mt-1">{h.details}</div>}
            </div>
          ))}
          {(!data || data.history.length === 0) && <div className="text-sm text-slate-500">No history recorded yet.</div>}
        </div>
      )}
    </Drawer>
  );
}
