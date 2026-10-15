import React from 'react';
import { getMockPatients } from '@/app/dashboard/records/mockPatients';
import MedicationsPatientCard from '@/components/MedicationsPatientCard';

export default function MedicationsPage({ searchParams }: { searchParams?: any }) {
  const patients = getMockPatients();

  const totalPatients = patients.length;
  let totalActiveMeds = 0;
  let totalRefillDue = 0;

  for (const p of patients) {
    const meds = Array.isArray(p.medications) ? p.medications : [];
    totalActiveMeds += meds.filter((m: any) => !m.status || String(m.status).toLowerCase() === 'active').length;
    totalRefillDue += meds.filter((m: any) => !!m.refill).length;
  }

  return (
    <main className="p-6">
      <div className="max-w-8xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Medications</h1>
            <p className="text-sm text-slate-500">Canonical medications hub — one medication list per patient.</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded shadow-sm">Patients with meds<br/><div className="font-bold text-xl">{totalPatients}</div></div>
          <div className="bg-white p-4 rounded shadow-sm">Active medications<br/><div className="font-bold text-xl">{totalActiveMeds}</div></div>
          <div className="bg-white p-4 rounded shadow-sm">Refill due<br/><div className="font-bold text-xl">{totalRefillDue}</div></div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {patients.map((p) => (
            <div key={p.id}>
              <MedicationsPatientCard patient={p} />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
