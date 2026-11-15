import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getDoctorWorkSnapshot } from '@/lib/doctorWorkStore';
import { CLINICAL_WORKSPACE_ROLES } from '@/lib/doctorWorkspaceAuth';
import { getCanonicalPatientDirectory } from '@/lib/patientDirectory';
import DoctorDocumentsClient from '@/components/doctor-workspace/DoctorDocumentsClient';

export const dynamic = 'force-dynamic';

export default async function DoctorDocumentsPage() {
  const session = await auth().catch(() => null);
  if (!session?.user) redirect('/login?returnTo=%2Fdashboard%2Fdocuments');
  const user = session.user as { id?: string; name?: string; role?: string };
  const actor = { id: user.id || '', name: user.name || '', role: String(user.role || '').toUpperCase() };
  if (!CLINICAL_WORKSPACE_ROLES.has(actor.role)) redirect('/unauthorized');
  const work = await getDoctorWorkSnapshot(actor.id, actor.name, actor.role);
  const directory = await getCanonicalPatientDirectory();
  const patients = directory.patients.map((patient) => ({ ...patient, href: `/dashboard/records/${encodeURIComponent(patient.id)}` }));
  return <DoctorDocumentsClient initialData={{ ...work, patients }} />;
}
