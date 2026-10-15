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

export default function LaboratoryPatientCard({ patient }: { patient: any }) {
  const labs = Array.isArray(patient.labResults) ? patient.labResults : [];
  const unreviewed = labs.filter((r: any) => !r.reviewed).length;
  const abnormal = labs.filter((r: any) => String(r.interpretation || '').toLowerCase().includes('high') || String(r.interpretation || '').toLowerCase().includes('abnormal') || String(r.interpretation || '').toLowerCase().includes('low')).length;
  const critical = labs.filter((r: any) => String(r.interpretation || '').toLowerCase().includes('critical')).length;
  const latest = labs.slice().sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  const followUpCount = Array.isArray(patient.upcoming) ? (patient.upcoming.filter((u: any) => Array.isArray(u.followUp) && u.followUp.length > 0).length) : 0;

  const borderClass = critical > 0 ? 'border-l-4 border-red-400' : abnormal > 0 ? 'border-l-4 border-amber-400' : followUpCount > 0 ? 'border-l-4 border-sky-400' : 'border-l-4 border-transparent';

  return (
    <div className={`bg-white p-4 rounded shadow-sm flex flex-col ${borderClass}`} aria-labelledby={`patient-${patient.id}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={patient.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(patient.name)}&background=E6FFFA&color=0F766E`} alt={patient.name} className="w-12 h-12 rounded-full object-cover" />
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
          <div className="text-xs text-slate-500">Latest Lab</div>
          <div className="font-medium">{latest ? `${latest.name} · ${formatDate(latest.date)}` : 'No recent labs'}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500">Last Lab Date</div>
          <div className="font-medium">{latest ? formatDate(latest.date) : '—'}</div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3 text-sm">
        <div className="px-2 py-1 bg-amber-50 rounded">Results requiring review <span className="font-semibold">{unreviewed}</span></div>
        <div className="px-2 py-1 bg-amber-50 rounded">Abnormal <span className="font-semibold">{abnormal}</span></div>
        <div className="px-2 py-1 bg-red-50 rounded">Critical <span className="font-semibold">{critical}</span></div>
        <div className="px-2 py-1 bg-blue-50 rounded">Follow-Up <span className="font-semibold">{followUpCount}</span></div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <Link href={`/dashboard/records/${encodeURIComponent(patient.id)}/labs`} className="px-3 py-2 bg-teal-600 text-white rounded">Open Laboratory</Link>
        <div className="text-xs text-slate-400">Last updated {formatDate(patient.dataUpdatedAt)}</div>
      </div>
    </div>
  );
}
