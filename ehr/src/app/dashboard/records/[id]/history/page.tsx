import { redirect } from 'next/navigation';
import { getPatientById } from '../../mockPatients';
import PatientProfileHeader from '@/components/PatientProfileHeader';
import VisitHistoryWorkspace from '@/components/visit-history/VisitHistoryWorkspace';
import { buildVisitHistory } from '@/lib/visitHistory';

export default async function HistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const id = resolvedParams.id;

  const patient = getPatientById(String(id));
  if (!patient) redirect('/dashboard/records');

  const model = buildVisitHistory(String(id), patient);
  const headerPatient = model.summary.lastVisit
    ? { ...patient, lastVisit: model.summary.lastVisit.date.slice(0, 10), lastAttendingDoctor: model.summary.lastVisit.provider?.display || patient.lastAttendingDoctor }
    : patient;

  return (
    <div className="min-h-screen bg-[#F6F9FB] py-8 pb-28">
      <div className="w-full max-w-[1760px] mx-auto px-4 sm:px-6 xl:px-10 2xl:px-14">
        <PatientProfileHeader patient={headerPatient} showActions={false} />
        <VisitHistoryWorkspace patientId={String(id)} patientName={patient.name} initialItems={model.items} initialSummary={model.summary} initialFilterOptions={model.filterOptions} />
      </div>
    </div>
  );
}
