import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getBookingDraft } from '@/lib/bookingDraftStore';
import { getSchedulingSnapshot } from '@/lib/schedulingData';
import { CLINICAL_WORKSPACE_ROLES } from '@/lib/doctorWorkspaceAuth';
import BookingWorkspace from './BookingWorkspace';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function preview(params: SearchParams) {
  return process.env.NODE_ENV !== 'production' && (Boolean(params.noauth) || ['dev', 'dev-doctor'].includes(firstValue(params.asUser) || ''));
}

export default async function BookAppointmentsPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const params = searchParams ? await searchParams : {};
  const session = await auth().catch(() => null);
  if (!session?.user && !preview(params)) redirect(`/login?returnTo=${encodeURIComponent('/dashboard/appointments/book')}`);
  const user = session?.user as { id?: string; name?: string; role?: string } | undefined;
  const actorId = user?.id || firstValue(params.asUser) || 'dev-doctor';
  const role = String(user?.role || 'DEV').toUpperCase();
  if (session?.user && !CLINICAL_WORKSPACE_ROLES.has(role)) redirect('/unauthorized');
  const snapshot = await getSchedulingSnapshot();
  return <BookingWorkspace initialData={{ ...snapshot, patients: [] }} initialDraft={await getBookingDraft(actorId)} />;
}
