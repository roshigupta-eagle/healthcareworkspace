import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getDoctorWorkSnapshot } from '@/lib/doctorWorkStore';
import { CLINICAL_WORKSPACE_ROLES } from '@/lib/doctorWorkspaceAuth';
import DoctorTasksCommandCenter from '@/components/doctor-workspace/DoctorTasksCommandCenter';

export const dynamic = 'force-dynamic';

export default async function DoctorTasksPage() {
  const session = await auth().catch(() => null);
  if (!session?.user) redirect('/login?returnTo=%2Fdashboard%2Ftasks');
  const user = session.user as { id?: string; name?: string; role?: string };
  const actor = { id: user.id || '', name: user.name || '', role: String(user.role || '').toUpperCase() };
  if (!CLINICAL_WORKSPACE_ROLES.has(actor.role)) redirect('/unauthorized');
  return <DoctorTasksCommandCenter initialData={await getDoctorWorkSnapshot(actor.id, actor.name, actor.role)} />;
}
