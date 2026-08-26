import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getSchedulingSnapshot } from '@/lib/schedulingData';
import AppointmentsWorkspace from '@/app/dashboard/appointments/AppointmentsWorkspace';

export const dynamic = 'force-dynamic';

export default async function SchedulingPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const preview = process.env.NODE_ENV !== 'production' && (Boolean(resolvedSearchParams.noauth) || ['dev', 'dev-doctor'].includes(Array.isArray(resolvedSearchParams.asUser) ? resolvedSearchParams.asUser[0] || '' : resolvedSearchParams.asUser || ''));
  let session = await auth().catch(() => null);
  if (!session && preview) session = { user: { id: 'dev-doctor', name: 'Doctor User', role: 'DOCTOR' } } as typeof session;
  if (!session) redirect('/login');
  const role = String(session.user?.role || 'DOCTOR').toUpperCase();
  if (!['ADMIN', 'DOCTOR', 'NURSE', 'CLINICIAN', 'PRACTITIONER', 'DEV'].includes(role)) redirect('/unauthorized');
  const query = typeof resolvedSearchParams.q === 'string' ? resolvedSearchParams.q : '';
  const snapshot = await getSchedulingSnapshot(query);
  return <AppointmentsWorkspace initialData={snapshot} includeMonth />;
}
