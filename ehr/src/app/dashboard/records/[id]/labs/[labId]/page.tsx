import LabResultDetailClient from '@/components/LabResultDetailClient';
import { getPatientById } from '../../../mockPatients';
import { redirect } from 'next/navigation';

export default async function LabResultPage({ params }: { params: Promise<{ id: string; labId: string }> | { id: string; labId: string } }) {
  const resolvedParams = await params;
  const { id, labId } = resolvedParams;
  const patient = getPatientById(String(id));
  if (!patient) redirect('/dashboard/records');

  return (
    <div className="max-w-7xl mx-auto p-6">
      <LabResultDetailClient patient={patient} labId={labId} />
    </div>
  );
}
