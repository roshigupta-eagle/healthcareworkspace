import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import PatientProfileHeader from '@/components/PatientProfileHeader';
import { getPatientById } from '@/app/dashboard/records/mockPatients';

export default async function ImmunizationsPage({ params }: { params: any }) {
  const patientId = params?.patientId;
  let session: any = null;
  try { session = await auth(); } catch {}
  if (!session) redirect('/login');

  const patient = getPatientById(String(patientId));
  if (!patient) redirect('/dashboard/records');

  return (
    <div className="max-w-6xl mx-auto px-6 py-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/records/${patient.id}`} className="text-sm text-teal-600 hover:underline">← Back to Patient</Link>
          <h1 className="text-2xl font-bold">Immunization History</h1>
        </div>
      </div>

      <PatientProfileHeader patient={patient} />

      <div className="mt-6 bg-white rounded-lg p-6 border border-[#DDE7F0] shadow-sm">
        <h3 className="text-sm font-semibold">Immunizations</h3>
        <div className="mt-3 space-y-3 text-sm text-gray-700">
          {(patient.immunizations || []).map((im:any) => (
            <div key={im.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
              <div>
                <div className="font-medium">{im.name}</div>
                <div className="text-xs text-gray-500">{im.date}</div>
              </div>
              <div className="text-sm text-gray-700">{im.status || 'Completed'}</div>
            </div>
          ))}
          {(patient.immunizations || []).length === 0 && <div className="text-sm text-gray-500">No immunizations recorded.</div>}
        </div>
      </div>
    </div>
  );
}
