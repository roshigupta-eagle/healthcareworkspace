"use client";

import React from 'react';
import { PatientBanner } from '@/design-system/clinical/PatientBanner';

export default function LabResultDetailClient({ patient, labId }: { patient: any; labId: string }) {
  if (!patient) return <div className="p-6">No patient data</div>;
  const lab = (patient.labResults || []).find((l: any) => l.id === labId);
  if (!lab) return <div className="p-6 bg-white rounded">Lab result not found.</div>;

  return (
    <div className="bg-white rounded-lg shadow-lg">
      <div className="flex items-center justify-between p-6 border-b">
        <div className="flex items-center gap-4">
          <img src={patient.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(patient.name)}&background=E6FFFA&color=0F766E`} alt="patient" className="w-12 h-12 rounded-full" />
          <div>
            <div className="text-lg font-semibold text-gray-900">{patient.name}</div>
            <div className="text-xs text-gray-500">MRN: {patient.mrn} • DOB: {patient.dob || '—'}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-sm text-neutral-600">{lab.date}</div>
          <button className="px-3 py-2 rounded-md bg-white border">Download PDF</button>
          <button className="px-3 py-2 rounded-md bg-white border">Share Results</button>
        </div>
      </div>

      <div className="p-6">
        <PatientBanner
          mrn={patient.mrn}
          firstName={patient.name?.split(' ')[0]}
          lastName={patient.name?.split(' ').slice(1).join(' ')}
          dateOfBirth={patient.dob}
          age={patient.age}
          sex={patient.gender}
          allergies={patient.allergies || []}
          identifiers={patient.identifiers || [{ label: 'MRN', value: patient.mrn }]}
          verificationStatus={patient.verificationStatus || 'verified'}
        />

        <div className="mt-6 grid grid-cols-12 gap-6">
          <aside className="col-span-3 bg-neutral-50 rounded-lg p-3">List placeholder</aside>
          <main className="col-span-6 bg-white rounded-lg shadow-inner p-6">Main result: <div className="text-3xl font-bold mt-2">{lab.result} {lab.unit}</div></main>
          <aside className="col-span-3 bg-neutral-50 rounded-lg p-4">Summary placeholder</aside>
        </div>
      </div>
    </div>
  );
}
