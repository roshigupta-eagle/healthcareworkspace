'use client';

import Link from 'next/link';
import React from 'react';

export default function EncounterCard({ encounter }: { encounter: any }) {
  const initials = (encounter.patientName || encounter.patient || '').split(' ').map((s: string) => s[0]).slice(0,2).join('');
  const isHighRisk = ((encounter.risk || '').toLowerCase() === 'high') || (encounter.age || 0) >= 65 || (encounter.conditions || []).some((c: string) => ['Hypertension','Heart Failure','CAD','Type 2 Diabetes'].includes(c));
  const arrivedAt = encounter.arrivedAt ? new Date(encounter.arrivedAt).toLocaleString() : '';
  const vitals = encounter.vitals || {};
  const labFlags = encounter.labFlags || [];

  return (
    <Link href={`/dashboard/encounters/${encounter.id}`} className="block">
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition transform hover:-translate-y-1 cursor-pointer">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {encounter.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={encounter.photoUrl} alt={encounter.patientName} className="w-14 h-14 rounded-full object-cover shadow-sm" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-semibold text-lg shadow">{initials}</div>
            )}

            <div>
              <div className="text-lg font-semibold text-gray-900">
                {encounter.patientName || encounter.patient || 'Unknown'}
                {isHighRisk && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-xs font-semibold">High Risk</span>}
              </div>
              <div className="mt-1 text-sm text-gray-500">{encounter.age ? `${encounter.age} yrs • ` : ''}{encounter.gender ? `${encounter.gender} • ` : ''}MRN: {encounter.mrn || (encounter.patientId || '—')}</div>
              <div className="mt-2 text-sm text-gray-600 flex flex-wrap gap-2">
                <div className="flex items-center gap-3 text-sm text-gray-700">
                  {vitals.bp && <div className="text-xs text-gray-500">BP <span className="ml-1 font-medium text-gray-900">{vitals.bp}</span></div>}
                  {vitals.hr && <div className="text-xs text-gray-500">HR <span className="ml-1 font-medium text-gray-900">{vitals.hr} bpm</span></div>}
                  {vitals.temp && <div className="text-xs text-gray-500">T <span className="ml-1 font-medium text-gray-900">{vitals.temp}°C</span></div>}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="text-sm">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${encounter.currentState === 'DISCHARGED' || encounter.currentState === 'CLOSED' ? 'bg-gray-100 text-gray-700' : (encounter.currentState === 'CRITICAL' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800')}`}>{encounter.currentState || encounter.status || 'Open'}</span>
            </div>
            <div className="text-xs text-gray-500">{arrivedAt}</div>
            <div className="mt-2 flex items-center gap-2">
              {labFlags.slice(0,3).map((f: string) => <span key={f} className="px-2 py-1 rounded-full bg-yellow-50 text-yellow-800 text-xs">{f}</span>)}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
