import { redirect } from 'next/navigation';
import { getPatientById } from '../../mockPatients';
import PatientProfileHeader from '@/components/PatientProfileHeader';
import ClinicalTasksClient from '@/components/clinicalTasks/ClinicalTasksClient';
import ToastProvider from '@/components/Toast';

export default async function PatientTasksPage({ params }: { params: any }) {
  const resolvedParams = await params;
  const id = resolvedParams?.id ?? (params && params.id);
  const patient = getPatientById(String(id));
  if (!patient) redirect('/dashboard/records');

  return (
    <div className="min-h-screen bg-[#F6F9FB] py-8 pb-28">
      <div className="max-w-[1600px] mx-auto px-6">
        <PatientProfileHeader patient={patient} showActions={false} />
        <div className="mt-6">
          {/* Clinical tasks client handles fetching and persistence when given patientId */}
          {/* @ts-expect-error Server -> Client component */}
          <ToastProvider>
            <ClinicalTasksClient patientId={patient.id} />
          </ToastProvider>
        </div>
      </div>
    </div>
  );
}
