import { getPatientById } from '../../mockPatients';
import ConditionsPageClient from '@/components/conditions/ConditionsPageClient';

export default async function ConditionsOverviewPage({ params }: { params: any }) {
  const resolvedParams = await params;
  const id = resolvedParams?.id ?? (params && params.id);

  const patient = getPatientById(String(id));
  if (!patient) return (<div className="max-w-7xl mx-auto px-6 py-6">Patient not found</div>);

  return <ConditionsPageClient patient={patient} />;
}
