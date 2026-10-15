import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getDashboardSummary } from '@/lib/dashboardSummary';
import ClinicalCommandCenter from '@/components/command-center/ClinicalCommandCenter';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || '' : value || '';
}

const DASHBOARD_ROLES = new Set(['ADMIN', 'DOCTOR', 'NURSE', 'CLINICIAN', 'PRACTITIONER', 'DEV', 'PHARMACIST', 'PHARMACY', 'PHARMACY_USER', 'LAB_TECH', 'LABORATORY', 'LAB_USER', 'LIMS', 'HOSPITAL', 'HOSPITAL_USER', 'CLINIC_ADMIN', 'CLINIC_ADMINISTRATOR']);

export default async function DashboardPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const params = searchParams ? await searchParams : {};
  const asUser = firstValue(params.asUser);
  const noAuth = Boolean(params.noauth);
  const retiredOrganState = firstValue(params.mode) === 'patient-focus' || Boolean(firstValue(params.organ)) || Boolean(firstValue(params.patientId));
  if (retiredOrganState) {
    const cleanParams = new URLSearchParams();
    if (noAuth) cleanParams.set('noauth', '1');
    if (asUser) cleanParams.set('asUser', asUser);
    redirect(`/dashboard${cleanParams.toString() ? `?${cleanParams.toString()}` : ''}`);
  }
  const preview = process.env.NODE_ENV !== 'production' && (noAuth || ['dev', 'dev-doctor'].includes(asUser));
  const session = await auth().catch(() => null);
  if (!session?.user && !preview) redirect(`/login?returnTo=${encodeURIComponent('/dashboard')}`);
  const user = session?.user as { id?: string; name?: string; role?: string } | undefined;
  const actor = preview && !session?.user
    ? { id: asUser || 'dev-doctor', name: asUser === 'dev' ? 'dev' : 'Doctor User', role: 'DEV' }
    : { id: user?.id || 'dev-doctor', name: user?.name || 'Doctor User', role: String(user?.role || 'DOCTOR').toUpperCase() };
  if (!DASHBOARD_ROLES.has(actor.role)) redirect('/unauthorized');
  const previewQuery = preview ? `${noAuth ? 'noauth=1' : ''}${noAuth && asUser ? '&' : ''}${asUser ? `asUser=${encodeURIComponent(asUser)}` : noAuth ? 'asUser=dev' : ''}` : '';
  return <ClinicalCommandCenter initialData={await getDashboardSummary(actor, new Date(), { preview })} preview={previewQuery} />;
}
