'use client';

import Link from 'next/link';
import React from 'react';

export default function PatientCard({ patient }: { patient: any }) {
  const initials = (patient.name || '').split(' ').map((s: string) => s[0]).slice(0,2).join('');
  const unread = (patient.notes || []).length;
  const nextAppt = (patient.upcoming && patient.upcoming.length > 0) ? patient.upcoming[0].date : null;
  const isHighRisk = (patient.conditions || []).some((c: string) => ['Hypertension','Type 2 Diabetes','Heart Failure','CAD'].includes(c)) || (patient.age || 0) >= 65;

  return (
    <Link href={`/dashboard/records/${patient.id}`} className="block" aria-label={`Open record for ${patient.name}`}>
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition transform hover:-translate-y-1 cursor-pointer">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {patient.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={patient.photoUrl} alt={patient.name} className="w-14 h-14 rounded-full object-cover shadow-sm" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-semibold text-lg shadow">{initials}</div>
            )}

            <div>
              <div className="text-lg font-semibold text-gray-900">{patient.name} {isHighRisk && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-xs font-semibold">High Risk</span>}</div>
              <div className="mt-1 text-sm text-gray-500">{patient.age} yrs • {patient.gender} • MRN: {patient.mrn}</div>
              <div className="mt-2 text-sm text-gray-600 flex flex-wrap gap-2">
                <div className="text-xs text-gray-500">Insurance: <span className="text-sm text-gray-800 font-medium">{patient.insurance?.provider || '—'}</span></div>
                <div className="text-xs text-gray-500">Primary: <span className="text-sm text-gray-800 font-medium">{patient.lastAttendingDoctor || '—'}</span></div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="text-sm">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${patient.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'}`}>{patient.status}</span>
            </div>
            <div className="text-xs text-gray-500">Notes: <span className="font-medium text-gray-800">{unread}</span></div>
            <div className="text-xs text-gray-500">Next: <span className="font-medium text-gray-800">{nextAppt || '—'}</span></div>
          </div>
        </div>

        <div className="mt-3 text-sm text-gray-700">
          <div className="flex items-center gap-2 flex-wrap">
            {(patient.conditions || []).slice(0,4).map((c: string) => (
              <span key={c} className="px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs">{c}</span>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}
