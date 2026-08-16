import { redirect } from 'next/navigation';
import { getPatientById } from '../../mockPatients';
import CareGapsClient from '@/components/care-gaps/CareGapsClient';

export default async function CareGapsPage({ params }: { params: any }) {
  const resolvedParams = await params;
  const id = resolvedParams?.id ?? (params && params.id);

  const patient = getPatientById(String(id));
  if (!patient) redirect('/dashboard/records');

  return (
    <div>
      {/* Client component will render the full care gaps UI */}
      {/* @ts-expect-error Server -> Client prop serialization */}
      <CareGapsClient patient={patient} />
    </div>
  );
}
