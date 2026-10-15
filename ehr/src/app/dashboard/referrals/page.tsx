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
  const asUser = firstValue(params.asUser);
  const noAuth = ['1', 'true'].includes(firstValue(params.noauth));
  const preview = process.env.NODE_ENV !== 'production' && (noAuth || ['dev', 'dev-doctor', 'user-admin-khan'].includes(asUser));
  const session = await auth().catch(() => null);
  if (!session?.user && !preview) redirect('/login?returnTo=%2Fdashboard%2Freferrals');
  const user = session?.user as { id?: string; name?: string; role?: string } | undefined;
  const actor = preview && !session?.user
    ? { id: asUser || 'dev-doctor', name: asUser === 'user-admin-khan' ? 'Admin Fatima Khan' : asUser === 'dev' ? 'dev' : 'Doctor User', role: asUser === 'user-admin-khan' ? 'ADMIN' : 'DEV' }
    : { id: user?.id || 'dev-doctor', name: user?.name || 'Doctor User', role: String(user?.role || 'DOCTOR').toUpperCase() };
  if (!CLINICAL_WORKSPACE_ROLES.has(actor.role)) redirect('/unauthorized');
  const previewQuery = preview ? `${noAuth ? 'noauth=1' : ''}${noAuth && asUser ? '&' : ''}${asUser ? `asUser=${encodeURIComponent(asUser)}` : noAuth ? 'asUser=dev' : ''}` : '';
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
    redirect(`/dashboard/referrals${previewQuery ? `?${previewQuery}` : ''}`);
  }
  return <ReferralCommandCenter initialData={initialData} preview={previewQuery} initialReferralId={firstValue(params.referralId) || undefined} initialCreateOpen={firstValue(params.new) === '1'} initialPatientId={initialPatientId} />;
}
