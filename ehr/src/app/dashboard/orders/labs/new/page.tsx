import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getPatientById, getMockPatients } from '../../../records/mockPatients';
import LabOrderComposer from '@/components/LabOrderComposer';

export default async function NewLabOrderPage({ searchParams }: { searchParams?: Record<string, string | string[]> }) {
  let session: any = null;
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    session = await auth();
  } catch (e) {
    // allow dev preview
  }
  if (!session) redirect('/login');

  const qRaw = searchParams?.patientId;
  const patientId = Array.isArray(qRaw) ? qRaw[0] : qRaw;
  const patient = patientId ? getPatientById(String(patientId)) : null;
  const patients = getMockPatients();

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      <div className="mb-4">
        <Link href="/dashboard/records" className="text-sm text-teal-600 hover:underline">← Back to Records</Link>
      </div>

      {patient ? (
        <LabOrderComposer patient={patient} />
      ) : (
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">Order Labs</h1>
          <p className="mt-2 text-sm text-gray-600">Select a patient to compose a lab order, or choose a recent patient.</p>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {patients.map((p: any) => (
              <Link key={p.id} href={`/dashboard/orders/labs/new?patientId=${p.id}`} className="block bg-white rounded-lg p-4 shadow-sm border border-gray-100 hover:shadow-md">
                <div className="font-medium text-gray-900">{p.name}</div>
                <div className="text-xs text-gray-500">{p.age} yrs • MRN: {p.mrn}</div>
                <div className="mt-2 text-sm text-teal-600">Order Labs →</div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
