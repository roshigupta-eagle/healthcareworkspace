import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getDoctorWorkSnapshot } from '@/lib/doctorWorkStore';
import { CLINICAL_WORKSPACE_ROLES } from '@/lib/doctorWorkspaceAuth';
import DoctorTasksCommandCenter from '@/components/doctor-workspace/DoctorTasksCommandCenter';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DoctorTasksPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const params = searchParams ? await searchParams : {};
  const session = await auth().catch(() => null);
  const preview = process.env.NODE_ENV !== 'production' && (Boolean(params.noauth) || ['dev', 'dev-doctor'].includes(firstValue(params.asUser) || ''));
  if (!session?.user && !preview) redirect('/login?returnTo=%2Fdashboard%2Ftasks');
  const user = session?.user as { id?: string; name?: string; role?: string } | undefined;
  const previewUser = preview && ['dev', 'dev-doctor'].includes(firstValue(params.asUser) || '') ? firstValue(params.asUser)! : undefined;
  const actor = previewUser ? { id: previewUser, name: previewUser === 'dev' ? 'dev' : 'Doctor User', role: 'DEV' } : { id: user?.id || 'dev-doctor', name: user?.name || 'Doctor User', role: String(user?.role || 'DOCTOR').toUpperCase() };
  if (session?.user && !CLINICAL_WORKSPACE_ROLES.has(actor.role)) redirect('/unauthorized');
  return <DoctorTasksCommandCenter initialData={await getDoctorWorkSnapshot(actor.id, actor.name, actor.role)} />;
}
