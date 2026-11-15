import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getDashboardSummary } from '@/lib/dashboardSummary';
import ClinicalCommandCenter from '@/components/command-center/ClinicalCommandCenter';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || '' : value || '';
}

const DASHBOARD_ROLES = new Set(['DOCTOR', 'NURSE', 'CLINICIAN', 'PRACTITIONER', 'PHARMACIST', 'PHARMACY', 'PHARMACY_USER', 'LAB_TECH', 'LABORATORY', 'LAB_USER', 'LIMS', 'HOSPITAL', 'HOSPITAL_USER', 'CLINIC_ADMIN', 'CLINIC_ADMINISTRATOR']);

export default async function DashboardPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const params = searchParams ? await searchParams : {};
  const retiredOrganState = firstValue(params.mode) === 'patient-focus' || Boolean(firstValue(params.organ)) || Boolean(firstValue(params.patientId));
  if (retiredOrganState) redirect('/dashboard');
  const session = await auth().catch(() => null);
  if (!session?.user) redirect(`/login?returnTo=${encodeURIComponent('/dashboard')}`);
  const user = session.user as { id?: string; name?: string; role?: string };
  const actor = { id: user.id || '', name: user.name || '', role: String(user.role || '').toUpperCase() };
  if (!DASHBOARD_ROLES.has(actor.role)) redirect('/unauthorized');
  return <ClinicalCommandCenter initialData={await getDashboardSummary(actor, new Date())} />;
}
