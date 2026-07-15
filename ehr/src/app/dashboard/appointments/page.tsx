import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import CalBookingClient from '@/app/dashboard/appointments/CalBookingClient';
import { fetchAppointments, fetchSlots, providers, locations } from '@/scheduling/services/scheduling.mock';
import { getCurrentUser } from '@/cardiology/services/api.mock';

export default async function AppointmentsPage() {
  const session = await auth();
  if (!session) redirect('/login');
  const role = session.user?.role ?? 'PATIENT';
  const userId = session.user?.id ?? '';

  // Server-side load (demo/mock)
  const [appointments, slots] = await Promise.all([fetchAppointments(), fetchSlots()]);
  const currentUser = getCurrentUser();

  const now = new Date();
  const todayKey = now.toDateString();
  const todayCount = appointments.filter(a => a.start && new Date(a.start).toDateString() === todayKey).length;
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000);
  const weekCount = appointments.filter(a => a.start && new Date(a.start) >= startOfWeek && new Date(a.start) < endOfWeek).length;
  const freeSlots = slots.filter(s => s.status === 'free').length;
  const pendingCount = appointments.filter(a => ['pending','proposed'].includes((a.status || '').toString().toLowerCase())).length;

  const upcoming = appointments
    .filter(a => a.start && new Date(a.start) >= now)
    .sort((a,b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, 8);

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Appointments</h1>
          <p className="mt-1 text-sm text-neutral-600 max-w-xl">Overview of schedule, quick booking, and upcoming patient visits. Compact, actionable layout for clinicians and staff.</p>
        </div>

        <div className="flex items-center gap-3">
          <a href="#book" className="inline-flex items-center px-4 py-2 rounded-md bg-sky-600 text-white text-sm shadow-sm hover:bg-sky-700">Book appointment</a>
          <a href="/scheduling" className="inline-flex items-center px-4 py-2 rounded-md bg-white border text-sm text-neutral-900 hover:bg-neutral-50">Find slots</a>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <div className="bg-white rounded-lg border p-4 shadow-sm">
          <div className="text-xs text-neutral-500">Today</div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className="text-3xl font-semibold text-neutral-900">{todayCount}</div>
            <div className="text-sm text-neutral-600">appointments</div>
          </div>
          <div className="mt-3 text-xs text-neutral-500">{new Date().toLocaleDateString()}</div>
        </div>

        <div className="bg-white rounded-lg border p-4 shadow-sm">
          <div className="text-xs text-neutral-500">This week</div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className="text-3xl font-semibold text-neutral-900">{weekCount}</div>
            <div className="text-sm text-neutral-600">appointments</div>
          </div>
          <div className="mt-3 text-xs text-neutral-500">{startOfWeek.toLocaleDateString()} — {endOfWeek.toLocaleDateString()}</div>
        </div>

        <div className="bg-white rounded-lg border p-4 shadow-sm">
          <div className="text-xs text-neutral-500">Available slots</div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className="text-3xl font-semibold text-neutral-900">{freeSlots}</div>
            <div className="text-sm text-neutral-600">free</div>
          </div>
          <div className="mt-3 text-xs text-neutral-500">Quick booking from open slots</div>
        </div>

        <div className="bg-white rounded-lg border p-4 shadow-sm">
          <div className="text-xs text-neutral-500">Unconfirmed</div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className="text-3xl font-semibold text-neutral-900">{pendingCount}</div>
            <div className="text-sm text-neutral-600">needs review</div>
          </div>
          <div className="mt-3 text-xs text-neutral-500">Follow up on pending requests</div>
        </div>
      </div>

      {/* Main grid: quick actions / dashboard client / upcoming */}
      <div className="mt-6">
        {/* @ts-expect-error Server -> Client prop serialization */}
        <CalBookingClient
          initialAppointments={appointments}
          providers={providers}
          locations={locations}
          currentUser={currentUser}
        />
      </div>
    </div>
  );
}
