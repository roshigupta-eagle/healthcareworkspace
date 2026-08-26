import { getPatientById } from '@/app/dashboard/records/mockPatients';
import PatientProfileHeader from '@/components/PatientProfileHeader';
import WeightTrendShell from '@/components/weight-trend/WeightTrendShell';

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const patientId = resolvedParams.id;
  const patient = getPatientById(String(patientId));

  if (!patient) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto bg-white border rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Patient not found</h2>
          <p className="text-sm text-slate-600 mt-2">We could not find the requested patient record. The patient identifier may be incorrect or you may not have access to this record.</p>
        </div>
      </div>
    );
  }

  // pass initial range if provided
  const initialRange = typeof resolvedSearchParams?.range === 'string' ? resolvedSearchParams.range : undefined;

  return (
    <div>
      <PatientProfileHeader patient={patient} />
      <div className="p-4">
        <WeightTrendShell patientId={patientId} patientData={patient} initialRange={initialRange} />
      </div>
    </div>
  );
}
