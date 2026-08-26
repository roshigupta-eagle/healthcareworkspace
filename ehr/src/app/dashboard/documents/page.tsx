import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getDoctorWorkSnapshot } from '@/lib/doctorWorkStore';
import { CLINICAL_WORKSPACE_ROLES } from '@/lib/doctorWorkspaceAuth';
import DoctorDocumentsClient from '@/components/doctor-workspace/DoctorDocumentsClient';

export const dynamic = 'force-dynamic';

export default async function DoctorDocumentsPage() {
  const session = await auth().catch(() => null);
  if (!session?.user && process.env.NODE_ENV === 'production') redirect('/login?returnTo=%2Fdashboard%2Fdocuments');
  const user = session?.user as { id?: string; name?: string; role?: string } | undefined;
  const actor = { id: user?.id || 'dev-doctor', name: user?.name || 'Doctor User', role: String(user?.role || 'DOCTOR').toUpperCase() };
  if (session?.user && !CLINICAL_WORKSPACE_ROLES.has(actor.role)) redirect('/unauthorized');
  return <DoctorDocumentsClient initialData={await getDoctorWorkSnapshot(actor.id, actor.name, actor.role)} />;
}
