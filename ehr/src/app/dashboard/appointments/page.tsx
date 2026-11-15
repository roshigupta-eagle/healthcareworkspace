import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getSchedulingSnapshot } from '@/lib/schedulingData';
import AppointmentsWorkspace from './AppointmentsWorkspace';

export default async function AppointmentsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const session = await auth().catch(() => null);
  if (!session?.user) redirect('/login?returnTo=%2Fdashboard%2Fappointments');
  const role = String(session.user.role || '').toUpperCase();
  if (!['DOCTOR', 'NURSE', 'CLINICIAN', 'PRACTITIONER'].includes(role)) redirect('/unauthorized');
  const snapshot = await getSchedulingSnapshot(typeof resolvedSearchParams.q === 'string' ? resolvedSearchParams.q : '');
  return <AppointmentsWorkspace initialData={snapshot} initialBooking={resolvedSearchParams.booking === '1'} />;
}
