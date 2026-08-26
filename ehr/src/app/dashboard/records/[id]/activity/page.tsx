import { redirect } from 'next/navigation';
import { getPatientById } from '../../mockPatients';
import PatientProfileHeader from '@/components/PatientProfileHeader';
import ChartActivityWorkspace from '@/components/chart-activity/ChartActivityWorkspace';
import { buildChartActivity } from '@/lib/chartActivity';
import { listStoredChartActivity } from '@/lib/chartActivityStore';

export default async function ActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const id = resolvedParams.id;

  const patient = getPatientById(String(id));
  if (!patient) redirect('/dashboard/records');

  const model = buildChartActivity(String(id), patient, await listStoredChartActivity(String(id)));

  return (
    <div className="min-h-screen bg-[#F6F9FB] py-8 pb-28">
      <div className="w-full max-w-[1760px] mx-auto px-4 sm:px-6 xl:px-10 2xl:px-14">
        <PatientProfileHeader patient={patient} showActions={false} />
        <ChartActivityWorkspace patientId={String(id)} patientName={patient.name} initialModel={model} />
      </div>
    </div>
  );
}
