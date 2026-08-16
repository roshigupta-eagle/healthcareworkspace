import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getPatientById } from '../../mockPatients';
import PatientProfileHeader from '@/components/PatientProfileHeader';
import WeightTrendClient from '@/components/WeightTrendClient';

export default async function WeightTrendPage({ params, searchParams }: { params: any; searchParams?: any }) {
  const resolvedParams = await params;
  const id = resolvedParams?.id ?? (params && params.id);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  let session: any = null;
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    session = await auth();
  } catch (e) {
    // allow dev preview
  }
  if (!session && resolvedSearchParams && resolvedSearchParams.asUser && process.env.NODE_ENV !== 'production') {
    const override = Array.isArray(resolvedSearchParams.asUser) ? resolvedSearchParams.asUser[0] : resolvedSearchParams.asUser;
    if (override) session = { user: { id: override, name: override } };
  }
  if (!session) redirect('/login');

  const patient = getPatientById(String(id));
  if (!patient) redirect('/dashboard/records');

  return (
    <div className="mx-auto w-full max-w-[1700px] px-4 py-6 sm:px-6 lg:px-8">
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
