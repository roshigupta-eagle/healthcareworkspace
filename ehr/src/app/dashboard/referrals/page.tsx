import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { CLINICAL_WORKSPACE_ROLES } from '@/lib/doctorWorkspaceAuth';
import { getReferralWorkspace } from '@/lib/referralWorkspace';
import ReferralCommandCenter from './ReferralCommandCenter';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || '' : value || '';
}

export default async function ReferralsPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const params = searchParams ? await searchParams : {};
  const session = await auth().catch(() => null);
  if (!session?.user) redirect('/login?returnTo=%2Fdashboard%2Freferrals');
  const user = session.user as { id?: string; name?: string; role?: string };
  const actor = { id: user.id || '', name: user.name || '', role: String(user.role || '').toUpperCase() };
  if (!CLINICAL_WORKSPACE_ROLES.has(actor.role)) redirect('/unauthorized');
  const requestedPatientId = firstValue(params.patientId);
  const initialData = await getReferralWorkspace(
    actor,
    requestedPatientId ? { patientId: requestedPatientId } : {},
  );
  const initialPatientId = initialData.patients.some(
    (patient) => patient.id === requestedPatientId,
  )
    ? requestedPatientId
    : undefined;
  if (requestedPatientId && !initialPatientId) {
    redirect('/dashboard/referrals');
  }
  return <ReferralCommandCenter initialData={initialData} initialReferralId={firstValue(params.referralId) || undefined} initialCreateOpen={firstValue(params.new) === '1'} initialPatientId={initialPatientId} />;
}
