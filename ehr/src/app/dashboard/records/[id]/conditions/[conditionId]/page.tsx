import { getPatientById } from '../../../mockPatients';
import PatientProfileHeader from '@/components/PatientProfileHeader';
import ConditionDetailClient from '@/components/ConditionDetailClient';

export default async function ConditionDetailPage({ params }: { params: any }) {
  const resolvedParams = await params;
  const id = resolvedParams?.id ?? (params && params.id);
  const conditionId = resolvedParams?.conditionId ?? (params && params.conditionId);

  const patient = getPatientById(String(id));
  if (!patient) return (<div className="max-w-7xl mx-auto px-6 py-6">Patient not found</div>);

  // find the condition by matching slug
  const conditionName = (patient.conditions || []).find((c: string) => {
    const slug = encodeURIComponent(c.toLowerCase().replace(/\s+/g, '-'));
    return slug === String(conditionId);
  }) || String(conditionId);

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 pb-28">
      <PatientProfileHeader patient={patient} />
      <ConditionDetailClient patient={patient} conditionName={conditionName} patientId={patient.id} />
    </div>
  );
}
