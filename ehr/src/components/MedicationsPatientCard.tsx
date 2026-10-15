import React from 'react';
import Link from 'next/link';

function formatDate(d?: string) {
  if (!d) return '—';
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString();
  } catch {
    return d;
  }
}

export default function MedicationsPatientCard({ patient }: { patient: any }) {
  const meds = Array.isArray(patient.medications) ? patient.medications : [];
  const active = meds.filter((m: any) => !m.status || String(m.status).toLowerCase() === 'active').length;
  const refillDue = meds.filter((m: any) => !!m.refill).length;
  const started = meds
    .map((m: any) => (m.startDate ? new Date(m.startDate) : null))
    .filter(Boolean)
    .sort((a: any, b: any) => b.getTime() - a.getTime())[0];
  const latestStarted = started ? formatDate((started as Date).toISOString()) : '—';

  return (
    <div className="bg-white p-4 rounded shadow-sm flex flex-col" aria-labelledby={`patient-${patient.id}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={patient.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(patient.name)}&background=F0F9FF&color=075985`} alt={patient.name} className="w-12 h-12 rounded-full object-cover" />
          <div>
            <div id={`patient-${patient.id}`} className="font-semibold text-slate-800">{patient.name}</div>
            <div className="text-sm text-slate-500">MRN • {patient.mrn} · {patient.age ? `${patient.age} yrs` : formatDate(patient.dob)}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-slate-500">Primary clinician</div>
          <div className="font-medium">{patient.lastAttendingDoctor || '—'}</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-slate-500">Medications</div>
          <div className="font-medium">{active} active</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500">Most recent start</div>
          <div className="font-medium">{latestStarted}</div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3 text-sm">
        <div className="px-2 py-1 bg-amber-50 rounded">Active <span className="font-semibold">{active}</span></div>
        <div className="px-2 py-1 bg-amber-50 rounded">Refill Due <span className="font-semibold">{refillDue}</span></div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <Link href={`/dashboard/records/${encodeURIComponent(patient.id)}/medications`} className="px-3 py-2 bg-indigo-600 text-white rounded">Open Medications</Link>
        <div className="text-xs text-slate-400">Last updated {formatDate(patient.dataUpdatedAt)}</div>
      </div>
    </div>
  );
}
