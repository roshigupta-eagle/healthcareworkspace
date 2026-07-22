import LabResultsIntelligenceClient from '@/components/LabResultsIntelligenceClient';
import { getPatientById } from '../../mockPatients';
import { redirect } from 'next/navigation';

export default function LabsIndexPage({ params, searchParams }: { params: { id: string }; searchParams?: Record<string, string | string[]> }) {
  const { id } = params;
  const patient = getPatientById(String(id));
  if (!patient) redirect('/dashboard/records');

  const selected = searchParams?.selected ? (Array.isArray(searchParams.selected) ? searchParams.selected[0] : searchParams.selected) : null;

  return (
    <div className="min-h-screen">
      <LabResultsIntelligenceClient patient={patient} initialSelectedLabId={selected} />
    </div>
  );
}
