import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function AppointmentsPage() {
  const session = await auth();
  if (!session) redirect('/login');
  // Example static items — replace with real API calls / DB queries later.
  // Each appointment contains patient/clinician IDs so we can filter by role.
  const mockAppointments = [
    {
      id: 'a1',
      visitId: 'v1',
      datetime: '2026-06-30T10:30:00Z',
      displayDatetime: 'Tue, Jun 30, 2026 — 10:30 AM',
      patientId: 'u-patient-1',
      patientName: 'John Doe',
      clinicianId: 'u-doctor-1',
      clinician: 'Dr. Alice Smith',
      location: 'Cardiology — Room 4',
      status: 'Confirmed',
      type: 'Consultation',
    },
    {
      id: 'a2',
      visitId: 'v2',
      datetime: '2026-07-02T14:00:00Z',
      displayDatetime: 'Fri, Jul 02, 2026 — 02:00 PM',
      patientId: 'u-patient-2',
      patientName: 'Mary Johnson',
      clinicianId: 'u-doctor-2',
      clinician: 'Dr. Bob Miller',
      location: 'Telemedicine',
      status: 'Pending',
      type: 'Follow-up',
    },
    {
      id: 'a3',
      visitId: 'v3',
      datetime: '2026-07-03T09:00:00Z',
      displayDatetime: 'Sat, Jul 03, 2026 — 09:00 AM',
      patientId: 'u-patient-1',
      patientName: 'John Doe',
      clinicianId: 'u-doctor-2',
      clinician: 'Dr. Bob Miller',
      location: 'Imaging — Room 2',
      status: 'Confirmed',
      type: 'ECG',
    },
  ];

  const role = session.user?.role ?? 'PATIENT';
  const userId = session.user?.id ?? '';

  // Role-based filtering
  let appointments = mockAppointments;
  if (role === 'PATIENT') {
    appointments = mockAppointments.filter((a) => a.patientId === userId);
  } else if (role === 'DOCTOR') {
    appointments = mockAppointments.filter((a) => a.clinicianId === userId);
  } else if (role === 'NURSE') {
    // Nurses see upcoming appointments in their department — simplified to all confirmed
    appointments = mockAppointments.filter((a) => a.status === 'Confirmed');
  } else if (role === 'ADMIN') {
    // Admin sees everything
    appointments = mockAppointments;
  } else {
    // Default: show nothing sensitive
    appointments = mockAppointments.filter((a) => a.status !== 'Pending');
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-sky-600">Appointments</h1>
          <p className="mt-1 text-sm text-gray-600">Upcoming and past appointments for your care.</p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {appointments.length === 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <p className="text-sm text-gray-600">No appointments found for your role.</p>
          </div>
        )}

        {appointments.map((a) => (
          <div key={a.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{a.displayDatetime}</p>
              <p className="mt-1 font-medium text-gray-900">
                {role === 'PATIENT' ? a.clinician : `${a.patientName} — ${a.type}`}
                <span className="text-sm text-gray-600"> {role === 'PATIENT' ? `— ${a.location}` : `• ${a.location}`}</span>
              </p>
            </div>
            <div className="text-right">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${a.status === 'Confirmed' ? 'bg-success-50 text-success-900' : 'bg-warning-50 text-warning-900'}`}>
                {a.status}
              </span>
              <div className="mt-3 text-right space-x-3">
                {role === 'PATIENT' && (
                  <>
                    <a href={`/dashboard/encounters/${a.visitId}`} className="text-sm text-sky-600 hover:underline">View details</a>
                    <a href="#" className="text-sm text-gray-600 hover:underline">Request reschedule</a>
                  </>
                )}

                {role === 'DOCTOR' && (
                  <>
                    <a href={`/dashboard/encounters/${a.visitId}`} className="text-sm text-sky-600 hover:underline">Open patient</a>
                    <a href="#" className="text-sm text-gray-600 hover:underline">Mark as completed</a>
                  </>
                )}

                {role === 'NURSE' && (
                  <>
                    <a href={`/dashboard/encounters/${a.visitId}`} className="text-sm text-sky-600 hover:underline">Prepare room</a>
                    <a href="#" className="text-sm text-gray-600 hover:underline">Mark arrived</a>
                  </>
                )}

                {role === 'ADMIN' && (
                  <>
                    <a href={`/dashboard/encounters/${a.visitId}`} className="text-sm text-sky-600 hover:underline">Manage</a>
                    <a href="#" className="text-sm text-gray-600 hover:underline">Cancel</a>
                  </>
                )}

                {!['PATIENT', 'DOCTOR', 'NURSE', 'ADMIN'].includes(role) && (
                  <a href={`/dashboard/encounters/${a.visitId}`} className="text-sm text-sky-600 hover:underline">View</a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
