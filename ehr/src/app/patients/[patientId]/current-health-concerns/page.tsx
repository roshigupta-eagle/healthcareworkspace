import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import PatientProfileHeader from '@/components/PatientProfileHeader';
import CurrentHealthConcernsWorkspace from '@/components/CurrentHealthConcernsWorkspace';
import { getPatientById } from '@/app/dashboard/records/mockPatients';
import ToastProvider from '@/components/Toast';

export default async function CurrentHealthConcernsPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  const session = await auth().catch(() => null);
  if (!session) redirect('/login');
  const patient = getPatientById(String(patientId));
  if (!patient) redirect('/dashboard/records');

  return (
    <div className="min-h-screen bg-[#F6F9FB] pb-16">
      <div className="mx-auto max-w-[1480px] px-4 py-5 sm:px-6 lg:px-8">
        <nav className="mb-4" aria-label="Breadcrumb">
          <Link href={`/dashboard/records/${patient.id}`} className="inline-flex items-center gap-2 text-sm font-medium text-[#0F766E] hover:text-[#115E59] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14B8A6]"><span aria-hidden="true">←</span> Back to patient</Link>
        </nav>
        <PatientProfileHeader patient={patient} />
        <main className="mt-7">
          <ToastProvider>
            <CurrentHealthConcernsWorkspace patient={patient} patientId={patient.id} />
          </ToastProvider>
        </main>
      </div>
    </div>
  );
}
