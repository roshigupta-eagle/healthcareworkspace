import { redirect } from 'next/navigation';
import { getPatientById } from '../../mockPatients';
import PatientProfileHeader from '@/components/PatientProfileHeader';
import BackToPatientButton from '@/components/BackToPatientButton';
import CurrentHealthConcernsWorkspace from '@/components/CurrentHealthConcernsWorkspace';
import ToastProvider from '@/components/Toast';

export default async function ConcernsPage({ params }: { params: any }) {
  const resolvedParams = await params;
  const id = resolvedParams?.id ?? (params && params.id);

  const patient = getPatientById(String(id));
  if (!patient) redirect('/dashboard/records');

  return (
    <div className="min-h-screen bg-[#F6F9FB] py-8 pb-28">
      <div className="max-w-[1480px] mx-auto px-4 sm:px-6">
        <div className="mb-4">
          <BackToPatientButton patientId={id} label="Back to Patient" />
        </div>

        <PatientProfileHeader patient={patient} />

        <div className="mt-6">
          <ToastProvider>
            <CurrentHealthConcernsWorkspace patient={patient} patientId={patient.id} />
          </ToastProvider>
        </div>
      </div>
    </div>
  );
}
