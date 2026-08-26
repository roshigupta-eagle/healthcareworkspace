import { redirect } from 'next/navigation';
import { getPatientById } from '../../../mockPatients';
import AddImmunizationClient from '@/components/immunizations/AddImmunizationClient';

export default async function NewImmunizationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const patient = getPatientById(String(id));
  if (!patient) redirect('/dashboard/records');

  return (
    <div className="min-h-screen bg-[#F6F9FB] py-8 pb-28">
      <AddImmunizationClient patientId={patient.id} patientName={patient.name} />
    </div>
  );
}