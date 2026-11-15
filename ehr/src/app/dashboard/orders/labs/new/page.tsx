import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getPatientById, getMockPatients } from '../../../records/mockPatients';
import LabOrderComposer from '@/components/LabOrderComposer';

export default async function NewLabOrderPage({ searchParams }: { searchParams?: Record<string, string | string[]> }) {
  const session = await auth().catch(() => null);
  if (!session?.user) redirect('/login?returnTo=%2Fdashboard%2Forders%2Flabs%2Fnew');

  const qRaw = searchParams?.patientId;
  const patientId = Array.isArray(qRaw) ? qRaw[0] : qRaw;
  const patient = patientId ? getPatientById(String(patientId)) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <LabOrderComposer patient={patient} />
    </div>
  );
}
