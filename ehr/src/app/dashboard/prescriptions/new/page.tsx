import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getPatientById } from '../../records/mockPatients';
import PrescriptionComposerSerene from '@/components/PrescriptionComposerSerene';

export default async function NewPrescriptionPage({ searchParams }: { searchParams?: Record<string, string | string[]> }) {
  const session = await auth().catch(() => null);
  if (!session?.user) redirect('/login?returnTo=%2Fdashboard%2Fprescriptions%2Fnew');

  const params = await searchParams;
  const qRaw = params?.patientId;
  const patientId = Array.isArray(qRaw) ? qRaw[0] : qRaw;
  const patient = patientId ? getPatientById(String(patientId)) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <PrescriptionComposerSerene patient={patient} />
    </div>
  );
}
