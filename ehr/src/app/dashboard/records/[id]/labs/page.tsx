import LabResultsIntelligenceClient from '@/components/LabResultsIntelligenceClient';
import { getPatientById } from '../../mockPatients';
import { redirect } from 'next/navigation';

export default async function LabsIndexPage({ params, searchParams }: { params: any; searchParams?: any }) {
  // In some Next.js versions the `params` and `searchParams` objects
  // may be Promises (RSC). Await them to be robust in both cases.
  const resolvedParams = await params;
  const resolvedSearch = await searchParams;
  const id = resolvedParams?.id;

  // server-side debug log to help trace navigation issues
  // eslint-disable-next-line no-console
  console.log('[LabsIndexPage] params.id=', id);

  const patient = getPatientById(String(id));
  // eslint-disable-next-line no-console
  console.log('[LabsIndexPage] patient found=', Boolean(patient));

  if (!patient) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h2 className="text-lg font-semibold">Patient not found</h2>
          <p className="mt-2 text-sm text-gray-600">The requested patient id <strong>{String(id)}</strong> could not be located. Returning to <a className="text-teal-600 hover:underline" href="/dashboard/records">Records</a>.</p>
        </div>
      </div>
    );
  }

  const selected = resolvedSearch?.selected ? (Array.isArray(resolvedSearch.selected) ? resolvedSearch.selected[0] : resolvedSearch.selected) : null;

  return (
    <div className="min-h-screen">
      <LabResultsIntelligenceClient patient={patient} initialSelectedLabId={selected} />
    </div>
  );
}
