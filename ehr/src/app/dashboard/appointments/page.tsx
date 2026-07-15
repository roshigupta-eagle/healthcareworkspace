import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
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
          <a href="/dashboard/appointments/book" className="inline-flex items-center px-4 py-2 rounded-md bg-sky-600 text-white text-sm shadow-sm hover:bg-sky-700">Book appointment</a>
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

      {/* Cal.com embed area (restored demo) */}
      <div className="mt-6">
        <div className="cal-theme w-full p-6 rounded-lg bg-white">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-lg font-semibold">Cal.com meetings</h2>
            <p className="text-sm text-neutral-500 mt-1">Embedded scheduling & meeting links (demo)</p>
            <div className="mt-4 border rounded overflow-hidden">
              <iframe src="https://cal.com/demo" className="w-full h-96" />
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-medium text-neutral-700">Upcoming meetings</h3>
              <ul className="mt-2 space-y-2">
                {upcoming.map((a:any) => (
                  <li key={a.id} className="p-3 border rounded bg-neutral-50 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{a.patient?.name || 'Unknown patient'}</div>
                      <div className="text-sm text-neutral-500">{new Date(a.start).toLocaleString()}</div>
                    </div>
                    <div className="text-sm text-neutral-600">{a.status}</div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
