'use client';

import React from 'react';
import { PatientBanner } from '@/design-system/clinical/PatientBanner';
import Link from 'next/link';

export default function PatientProfileHeader({ patient }: { patient: any }) {
  const names = (patient.name || '').split(' ');
  const firstName = names[0] || '';
  const lastName = names.slice(1).join(' ') || '';
  const dob = patient.dob || '';
  const age = patient.age || 0;
  const gender = patient.gender || 'Unknown';
  const sex = (gender === 'Male' || gender === 'Female' || gender === 'Other') ? gender : 'Unknown';
  const identifiers = [{ label: 'MRN', value: patient.mrn }];
  const allergies = patient.allergies || [];

  const isHighRisk = (patient.conditions || []).some((c: string) => ['Hypertension','Type 2 Diabetes','Heart Failure','CAD'].includes(c)) || (patient.age || 0) >= 65;

  return (
    <div className="sticky top-4 z-20 space-y-3">
      <PatientBanner
        mrn={patient.mrn}
        firstName={firstName}
        lastName={lastName}
        dateOfBirth={dob}
        age={age}
        sex={sex as any}
        allergies={allergies}
        identifiers={identifiers}
        verificationStatus="verified"
        className="rounded-t-lg"
      />

      <div className="bg-white rounded-lg p-4 shadow-sm ring-1 ring-gray-100 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <div>
            <div className="text-xs text-gray-500">Clinical Risk</div>
            <div className={`mt-1 inline-flex items-center px-2 py-0.5 rounded-md text-sm font-semibold ${isHighRisk ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
              {isHighRisk ? 'High' : 'Low'}
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-500">Last seen</div>
            <div className="mt-1 font-medium text-gray-900">{patient.lastVisit || '—'}</div>
            <div className="text-xs text-gray-500">{patient.lastAttendingDoctor || '—'}</div>
          </div>

          <div>
            <div className="text-xs text-gray-500">Weight</div>
            <div className="mt-1 font-medium text-gray-900">{patient.weight || '—'}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href={`/dashboard/encounters/new?patientId=${patient.id}`} className="inline-flex items-center gap-3 rounded-md bg-teal-700 text-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500" aria-label={`Start encounter for ${patient.name}`}>
            {/* Stethoscope / clipboard icon */}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6M9 16h6M9 8h6M5 6h14v12H5z" />
            </svg>
            <span>Start Encounter</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 ml-1" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path fillRule="evenodd" d="M10.293 15.707a1 1 0 010-1.414L13.586 11H4a1 1 0 110-2h9.586l-3.293-3.293a1 1 0 111.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </Link>

          <button type="button" className="inline-flex items-center gap-2 rounded-md bg-white border border-gray-200 text-sm px-3 py-2 hover:bg-gray-50">Order Lab</button>
          <button type="button" className="inline-flex items-center gap-2 rounded-md bg-white border border-gray-200 text-sm px-3 py-2 hover:bg-gray-50">Prescribe</button>
          <button type="button" className="inline-flex items-center gap-2 rounded-md text-sm px-3 py-2 text-gray-700 hover:bg-gray-50">Message</button>
        </div>
      </div>
    </div>
  );
}
