import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getPatientById } from '../../mockPatients';
import { getDoctorWorkSnapshot } from '@/lib/doctorWorkStore';
import { listVersions } from '@/lib/aiSummaryStore';
import { CLINICAL_WORKSPACE_ROLES } from '@/lib/doctorWorkspaceAuth';
import DoctorMessagesClient from '@/components/doctor-workspace/DoctorMessagesClient';

export const dynamic = 'force-dynamic';

export default async function PatientMessagesPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<{ summaryVersion?: string; asUser?: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user && process.env.NODE_ENV === 'production') redirect('/login');
  const { id } = await params;
  const patient = getPatientById(id);
  if (!patient) redirect('/dashboard/records');
  const user = session?.user as { id?: string; name?: string; role?: string } | undefined;
  const actor = { id: user?.id || 'dev-doctor', name: user?.name || 'Doctor User', role: String(user?.role || 'DOCTOR').toUpperCase() };
  if (session?.user && !CLINICAL_WORKSPACE_ROLES.has(actor.role)) redirect('/unauthorized');
  const search = searchParams ? await searchParams : {};
  const summaryVersion = search.summaryVersion ? (await listVersions(id)).find((version) => version.versionId === search.summaryVersion) : undefined;
  return <DoctorMessagesClient initialData={await getDoctorWorkSnapshot(actor.id, actor.name, actor.role)} patientIdFilter={patient.id} initialDraft={summaryVersion?.patientFriendlySummary} openNew={Boolean(summaryVersion?.patientFriendlySummary)} />;
}
