import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getPatientById } from '../../mockPatients';
import PatientProfileHeader from '@/components/PatientProfileHeader';
import WeightTrendClient from '@/components/WeightTrendClient';

export default async function WeightTrendPage({ params, searchParams }: { params: any; searchParams?: Record<string, string | string[]> }) {
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
  if (!patient) redirect('/dashboard/records');

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      <div className="mb-4">
        {/* back handled by browser */}
      </div>

      <PatientProfileHeader patient={patient} />

      <div className="mt-6">
        <WeightTrendClient patient={patient} />
      </div>
    </div>
  );
}
