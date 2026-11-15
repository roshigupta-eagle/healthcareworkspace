import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getBookingDraft } from '@/lib/bookingDraftStore';
import { getSchedulingSnapshot } from '@/lib/schedulingData';
import { CLINICAL_WORKSPACE_ROLES } from '@/lib/doctorWorkspaceAuth';
import { getCanonicalPatientDirectory } from '@/lib/patientDirectory';
import BookingWorkspace from './BookingWorkspace';

export const dynamic = 'force-dynamic';

export default async function BookAppointmentsPage() {
  const session = await auth().catch(() => null);
  if (!session?.user) redirect(`/login?returnTo=${encodeURIComponent('/dashboard/appointments/book')}`);
  const user = session.user as { id?: string; name?: string; role?: string };
  const role = String(user.role || '').toUpperCase();
  if (!CLINICAL_WORKSPACE_ROLES.has(role)) redirect('/unauthorized');
  const snapshot = await getSchedulingSnapshot('');
  const directory = await getCanonicalPatientDirectory();
  return <BookingWorkspace initialData={{ ...snapshot, patients: directory.patients }} initialDraft={await getBookingDraft(user.id || '')} />;
}
