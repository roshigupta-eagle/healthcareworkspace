import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import SchedulingCalendarClient from '@/app/scheduling/SchedulingCalendarClient';
import { fetchAppointments, fetchSlots, providers, locations } from '@/scheduling/services/scheduling.mock';
import { getCurrentUser } from '@/cardiology/services/api.mock';

export default async function AppointmentsPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const role = session.user?.role ?? 'PATIENT';
  const userId = session.user?.id ?? '';

  // Server-side load of mock scheduling data (demo)
  const [appointments, slots] = await Promise.all([fetchAppointments(), fetchSlots()]);
  const currentUser = getCurrentUser();

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-sky-600">Appointments</h1>
          <p className="mt-1 text-sm text-gray-600">Upcoming and past appointments for your care.</p>
        </div>
      </div>

      {/* For doctors/admins show the interactive scheduling client (server-supplied props) */}
      {(role === 'DOCTOR' || role === 'ADMIN') ? (
        <div className="mt-6">
          {/* @ts-expect-error Server -> Client prop serialization */}
          <SchedulingCalendarClient
            initialAppointments={appointments}
            initialSlots={slots}
            providers={providers}
            locations={locations}
            currentUser={currentUser}
          />
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {appointments.length === 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <p className="text-sm text-gray-600">No appointments found for your role.</p>
            </div>
          )}

          {appointments.map((a) => {
            const patient = a.participants?.find((p: any) => p.type === 'patient')?.display || 'Patient';
            const provider = a.participants?.find((p: any) => p.type === 'practitioner')?.display || 'Provider';
            const when = a.start ? new Date(a.start).toLocaleString() : '—';
            return (
              <div key={a.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{when}</p>
                  <p className="mt-1 font-medium text-gray-900">
                    {role === 'PATIENT' ? provider : `${patient} — ${a.appointmentType || a.serviceType || 'Appointment'}`}
                    <span className="text-sm text-gray-600"> {a.location ? `• ${a.location}` : ''}</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${a.status === 'booked' ? 'bg-success-50 text-success-900' : 'bg-warning-50 text-warning-900'}`}>
                    {a.status}
                  </span>
                  <div className="mt-3 text-right space-x-3">
                    {role === 'PATIENT' && (
                      <>
                        <a href={`/dashboard/encounters/${a.id}`} className="text-sm text-sky-600 hover:underline">View details</a>
                        <a href="#" className="text-sm text-gray-600 hover:underline">Request reschedule</a>
                      </>
                    )}

                    {role === 'DOCTOR' && (
                      <>
                        <a href={`/dashboard/encounters/${a.id}`} className="text-sm text-sky-600 hover:underline">Open patient</a>
                        <a href="#" className="text-sm text-gray-600 hover:underline">Mark as completed</a>
                      </>
                    )}

                    {role === 'NURSE' && (
                      <>
                        <a href={`/dashboard/encounters/${a.id}`} className="text-sm text-sky-600 hover:underline">Prepare room</a>
                        <a href="#" className="text-sm text-gray-600 hover:underline">Mark arrived</a>
                      </>
                    )}

                    {role === 'ADMIN' && (
                      <>
                        <a href={`/dashboard/encounters/${a.id}`} className="text-sm text-sky-600 hover:underline">Manage</a>
                        <a href="#" className="text-sm text-gray-600 hover:underline">Cancel</a>
                      </>
                    )}

                    {!['PATIENT', 'DOCTOR', 'NURSE', 'ADMIN'].includes(role) && (
                      <a href={`/dashboard/encounters/${a.id}`} className="text-sm text-sky-600 hover:underline">View</a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
