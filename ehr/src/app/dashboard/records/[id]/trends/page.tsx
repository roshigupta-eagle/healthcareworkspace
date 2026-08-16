import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import PatientProfileHeader from '@/components/PatientProfileHeader';
import { getPatientById } from '../../mockPatients';
import HealthTrendAppClient from '@/components/trends/HealthTrendAppClient';

export default async function PatientHealthTrendsPage({ params, searchParams }: { params: any; searchParams?: any }) {
  const resolvedParams = await params;
  const id = resolvedParams?.id ?? (params && params.id);

  let session: any = null;
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    session = await auth();
  } catch (e) {
    // allow dev preview
  }
  if (!session && searchParams && searchParams.asUser && process.env.NODE_ENV !== 'production') {
    const override = Array.isArray(searchParams.asUser) ? searchParams.asUser[0] : searchParams.asUser;
    if (override) session = { user: { id: override, name: override } };
  }

  if (!session) redirect('/login');

  const patient = getPatientById(String(id));
  if (!patient) {
    // Render a not-found state rather than redirecting to dashboard
    return (
      <div className="bg-[#F6F9FB] min-h-screen py-6">
        <div className="max-w-3xl mx-auto px-6">
          <div className="bg-white rounded p-6 shadow-sm text-center">
            <h3 className="text-lg font-semibold">Patient not found</h3>
            <p className="mt-2 text-sm text-gray-600">The requested patient record could not be found.</p>
            <div className="mt-4"><Link href="/dashboard/records" className="px-3 py-2 bg-teal-600 text-white rounded">Return to Patient Records</Link></div>
          </div>
        </div>
      </div>
    );
  }

  // Provide initial server-side patient context and render client app for interactivity
  return (
    <div className="bg-[#F6F9FB] min-h-screen py-6">
      <div className="max-w-7xl mx-auto px-6 pb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Link href={`/dashboard/records/${patient.id}`} className="inline-flex items-center text-sm text-teal-600 hover:underline gap-2" aria-label={`Back to ${patient.name}`}>← Back to Patient</Link>
            <h1 className="text-3xl font-bold text-[#121A2D]">Health Trends</h1>
          </div>
          <div className="text-sm text-gray-500">Updated just now</div>
        </div>

        <PatientProfileHeader patient={patient} />

        <div className="mt-6">
          <HealthTrendAppClient patient={patient} />
        </div>
      </div>
    </div>
  );
}
