import { redirect } from 'next/navigation';
import { getPatientById } from '../../mockPatients';
import PatientProfileHeader from '@/components/PatientProfileHeader';
import CareTeamWorkspace from '@/components/care-team/CareTeamWorkspace';
import { listCareTeam } from '@/lib/careTeamStore';
import { listTasks } from '@/lib/tasksStore';
import { listCareGaps } from '@/lib/careGapStore';
import { listDocuments } from '@/lib/documentStore';

export default async function CareTeamPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const id = resolvedParams.id;

  const patient = getPatientById(String(id));
  if (!patient) redirect('/dashboard/records');

  const [members, tasks, careGaps, documents] = await Promise.all([
    listCareTeam(String(id), patient),
    listTasks(String(id)),
    listCareGaps(String(id), { limit: 200 }),
    listDocuments(String(id), patient),
  ]);

  return (
    <div className="min-h-screen bg-[#F6F9FB] py-8 pb-28">
      <div className="w-full max-w-[1760px] mx-auto px-4 sm:px-6 xl:px-10 2xl:px-14">
        <PatientProfileHeader patient={patient} showActions={false} />
        <CareTeamWorkspace patientId={String(id)} patientName={patient.name} initialMembers={members} initialTasks={tasks} initialCareGaps={careGaps.items} initialDocuments={documents} />
      </div>
    </div>
  );
}
