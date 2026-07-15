import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import CalBookingClient from '@/app/dashboard/appointments/CalBookingClient';
import { fetchAppointments } from '@/scheduling/services/scheduling.mock';
import { getCurrentUser } from '@/cardiology/services/api.mock';

export default async function BookAppointmentsPage() {
  const session = await auth();
  if (!session) redirect('/login');
  const appointments = await fetchAppointments();
  const currentUser = getCurrentUser();

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Book Appointment</h1>
          <p className="mt-1 text-sm text-neutral-600 max-w-xl">Two-pane scheduling workspace</p>
        </div>
        <div>
          <a href="/dashboard/appointments" className="inline-flex items-center px-4 py-2 rounded-md bg-white border text-sm text-neutral-900 hover:bg-neutral-50">Back to meetings</a>
        </div>
      </div>

      <div className="mt-6">
        {/* @ts-expect-error Server -> Client prop serialization */}
        <CalBookingClient initialAppointments={appointments} currentUser={currentUser} />
      </div>
    </div>
  );
}
