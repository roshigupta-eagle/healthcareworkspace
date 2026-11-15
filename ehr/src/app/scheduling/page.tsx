import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { SCHEDULING_WORKSPACE_ROLES } from '@/lib/doctorWorkspaceAuth';
import { getSchedulingSnapshot } from '@/lib/schedulingData';
import AppointmentsWorkspace from '@/app/dashboard/appointments/AppointmentsWorkspace';

export const dynamic = 'force-dynamic';

export default async function SchedulingPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const session = await auth().catch(() => null);
  if (!session?.user) redirect('/login?returnTo=%2Fscheduling');
  const role = String(session.user.role || '').toUpperCase();
  if (!SCHEDULING_WORKSPACE_ROLES.has(role)) redirect('/unauthorized');
  const query = typeof resolvedSearchParams.q === 'string' ? resolvedSearchParams.q : '';
  const snapshot = await getSchedulingSnapshot(query);
  return <AppointmentsWorkspace initialData={snapshot} includeMonth />;
}
