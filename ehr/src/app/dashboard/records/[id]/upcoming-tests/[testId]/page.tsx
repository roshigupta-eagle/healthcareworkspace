import { redirect } from 'next/navigation';
import UpcomingTestPlanClient from '@/components/UpcomingTestPlanClient';
import { getPatientById } from '../../../mockPatients';

export default async function UpcomingTestPlanPage({ params }: { params: any }) {
  const resolvedParams = await params;
  const id = resolvedParams?.id ?? (params && params.id);
  const testId = resolvedParams?.testId ?? (params && params.testId);

  const patient = getPatientById(String(id));
  if (!patient) {
    // If patient not found, redirect back to records
    redirect('/dashboard/records');
  }

  const test = (patient.tests || []).find((t: any) => String(t.id) === String(testId)) || (patient.tests && patient.tests[0]) || null;

  return (
    // Render client component for interactive UI
    <UpcomingTestPlanClient patient={patient} initialTestId={test?.id ?? null} test={test} />
  );
}
