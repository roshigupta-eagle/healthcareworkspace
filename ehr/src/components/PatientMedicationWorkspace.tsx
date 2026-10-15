'use client';

import React, { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PatientMedicationWorkspace({ patient }: { patient: any }) {
  const router = useRouter();
  const [busyIndex, setBusyIndex] = useState<number | null>(null);

  const handleMarkReviewed = useCallback(async (index: number) => {
    setBusyIndex(index);
    try {
      const res = await fetch(`/api/patients/${encodeURIComponent(patient.id)}/medications/${encodeURIComponent(`index:${index}`)}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        cache: 'no-store',
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Review API failed: ${res.status} ${txt}`);
      }
      try {
        router.refresh();
      } catch (e) {
        // best-effort
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to mark medication reviewed', e);
      throw e;
    } finally {
      setBusyIndex(null);
    }
  }, [patient, router]);

  const meds = Array.isArray(patient.medications) ? patient.medications : [];

  return (
    <div className="bg-white p-4 rounded shadow-sm">
      <h2 className="text-lg font-semibold mb-2">Medications for {patient.name}</h2>
      {meds.length === 0 && <div className="text-sm text-slate-500">No medications on file.</div>}
      <ul className="space-y-3">
        {meds.map((m: any, i: number) => (
          <li key={m.id || `med-${i}`} className="flex items-center justify-between">
            <div>
              <div className="font-medium">{m.name} {m.dose ? `· ${m.dose}` : ''}</div>
              <div className="text-sm text-slate-500">{m.freq || m.indication || ''}</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-sm text-slate-500">{m.status || 'Unknown'}</div>
              {m.reviewed ? (
                <div className="text-sm text-green-600">Reviewed</div>
              ) : (
                <button className="px-2 py-1 bg-teal-600 text-white rounded" disabled={busyIndex !== null} onClick={() => handleMarkReviewed(i)}>
                  {busyIndex === i ? 'Saving…' : 'Mark reviewed'}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
