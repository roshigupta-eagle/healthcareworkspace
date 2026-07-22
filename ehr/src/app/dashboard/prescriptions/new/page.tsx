import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getPatientById } from '../../records/mockPatients';
import PrescriptionComposerSerene from '@/components/PrescriptionComposerSerene';

export default async function NewPrescriptionPage({ searchParams }: { searchParams?: Record<string, string | string[]> }) {
  let session: any = null;
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    session = await auth();
  } catch (e) {
    // allow dev preview
  }
  if (!session) {
    if (process.env.NODE_ENV === 'development') {
      session = { user: { name: 'Dev User' } };
    } else {
      redirect('/login');
    }
  }

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
