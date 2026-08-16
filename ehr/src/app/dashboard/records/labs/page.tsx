import LabResultsIntelligenceClient from '@/components/LabResultsIntelligenceClient';
import { getPatientById } from '../mockPatients';
import { redirect } from 'next/navigation';

export default async function LabsByQueryPage({ searchParams }: { searchParams?: any }) {
  const resolvedSearch = await searchParams;
  const patientId = resolvedSearch?.patient ? (Array.isArray(resolvedSearch.patient) ? resolvedSearch.patient[0] : resolvedSearch.patient) : null;

  if (!patientId) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h2 className="text-lg font-semibold">Missing patient</h2>
          <p className="mt-2 text-sm text-gray-600">No patient id provided. Open the patient record first.</p>
        </div>
      </div>
    );
  }

  const patient = getPatientById(String(patientId));
  if (!patient) {
    redirect('/dashboard/records');
  }

  const selected = resolvedSearch?.selected ? (Array.isArray(resolvedSearch.selected) ? resolvedSearch.selected[0] : resolvedSearch.selected) : null;

  return (
    <div className="min-h-screen">
      <LabResultsIntelligenceClient patient={patient} initialSelectedLabId={selected} />
    </div>
  );
}
