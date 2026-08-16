import { getPatientById } from '@/app/dashboard/records/mockPatients';
import ClinicalTimelineShell from '@/components/clinical-timeline/ClinicalTimelineShell';
import PatientProfileHeader from '@/components/PatientProfileHeader';
import Link from 'next/link';

export default async function Page({ params }: { params: { id: string } }) {
  const patientId = params.id;
  const patient = getPatientById(patientId);

  if (!patient) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto bg-white border rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Patient not found</h2>
          <p className="text-sm text-slate-600 mt-2">We could not find the requested patient record. The patient identifier may be incorrect or you may not have access to this record.</p>
          <div className="mt-4 flex gap-3">
            <Link href="/dashboard/records" className="px-3 py-2 bg-white border rounded text-sm">Go back</Link>
            <Link href={"/dashboard/records/"} className="px-3 py-2 bg-sky-600 text-white rounded text-sm">Try again</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PatientProfileHeader patient={patient} />
      <div style={{ padding: '16px' }}>
        {/* Client shell mounts here */}
        <ClinicalTimelineShell patientId={patientId} />
      </div>
    </div>
  );
}

