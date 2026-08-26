import { redirect } from 'next/navigation';
import { getPatientById } from '../../mockPatients';
import MedicationsPageClient from '@/components/medications/MedicationsPageClient';

export default async function MedicationHistoryPage({ params }: { params: any }) {
  const resolvedParams = await params;
  const id = resolvedParams?.id ?? (params && params.id);

  const patient = getPatientById(String(id));
  if (!patient) redirect('/dashboard/records');

  return (
    <div className="min-h-screen bg-[#F6F9FB] py-8">
      <MedicationsPageClient patient={patient} />
    </div>
  );
}
