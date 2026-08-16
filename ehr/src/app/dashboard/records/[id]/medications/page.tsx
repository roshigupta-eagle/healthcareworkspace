import { redirect } from 'next/navigation';
import { getPatientById } from '../../mockPatients';
import PatientProfileHeader from '@/components/PatientProfileHeader';
import MedicationHistoryClient from '@/components/MedicationHistoryClient';
import BackToPatientButton from '@/components/BackToPatientButton';

export default async function MedicationHistoryPage({ params }: { params: any }) {
  const resolvedParams = await params;
  const id = resolvedParams?.id ?? (params && params.id);

  const patient = getPatientById(String(id));
  if (!patient) redirect('/dashboard/records');

  return (
    <div className="min-h-screen bg-[#F6F9FB] py-8 pb-28">
      <div className="max-w-[1600px] mx-auto px-6">
        <PatientProfileHeader patient={patient} showActions={false} />

        <div className="mt-6">
          <MedicationHistoryClient patient={patient} />
        </div>
      </div>
    </div>
  );
}
