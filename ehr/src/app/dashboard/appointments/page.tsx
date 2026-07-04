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
  const pendingCount = appointments.filter(a => ['pending','proposed'].includes(a.status)).length;

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

      {/* Main grid: quick actions / calendar / upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        {/* Left column: quick actions & filters */}
        <aside className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-lg border p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-neutral-900">Quick Actions</div>
            </div>
            <div className="mt-3 space-y-2">
              <a href="#book" className="block w-full text-center px-3 py-2 rounded-md bg-sky-600 text-white text-sm">Book New</a>
              <a href="/scheduling/find" className="block w-full text-center px-3 py-2 rounded-md bg-white border text-sm text-neutral-900">Find Slots</a>
              <a href="/dashboard/encounters/new" className="block w-full text-center px-3 py-2 rounded-md bg-white border text-sm text-neutral-900">New Encounter</a>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-4 shadow-sm">
            <div className="text-sm font-medium text-neutral-900">Filters</div>
            <div className="mt-3 space-y-2">
              <select className="w-full border rounded px-3 py-2 text-sm" defaultValue="all">
                <option value="all">All providers</option>
                {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select className="w-full border rounded px-3 py-2 text-sm" defaultValue="all">
                <option value="all">All locations</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-4 shadow-sm">
            <div className="text-sm font-medium text-neutral-900">Legend</div>
            <div className="mt-3 space-y-2 text-xs text-neutral-600">
              <div><span className="inline-block w-2 h-2 bg-sky-600 mr-2 align-middle rounded-sm" /> Booked</div>
              <div><span className="inline-block w-2 h-2 bg-amber-500 mr-2 align-middle rounded-sm" /> Pending</div>
              <div><span className="inline-block w-2 h-2 bg-gray-300 mr-2 align-middle rounded-sm" /> Cancelled</div>
            </div>
          </div>
        </aside>

        {/* Center: calendar */}
        <main className="lg:col-span-6">
          <div className="bg-white rounded-lg border p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-neutral-900">Schedule</h2>
                <p className="text-sm text-neutral-600">Compact week/day views with quick booking and drag-to-reschedule.</p>
              </div>
              <div className="text-sm text-neutral-600">{appointments.length} total</div>
            </div>

            <div className="mt-4">
              {/* Client component - passes initial server data to interactive calendar */}
              {/* @ts-expect-error Server -> Client prop serialization */}
              <SchedulingCalendarClient
                initialAppointments={appointments}
                initialSlots={slots}
                providers={providers}
                locations={locations}
                currentUser={currentUser}
              />
            </div>
          </div>
        </main>

        {/* Right column: upcoming list */}
        <aside className="lg:col-span-3">
          <div className="bg-white rounded-lg border p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-neutral-900">Upcoming</div>
              <div className="text-xs text-neutral-500">Next {upcoming.length}</div>
            </div>

            <div className="mt-3 space-y-3">
              {upcoming.length === 0 && <div className="text-sm text-neutral-500">No upcoming appointments</div>}

              {upcoming.map(a => {
                const patient = a.participants?.find((p: any) => p.type === 'patient')?.display || 'Patient';
                const provider = a.participants?.find((p: any) => p.type === 'practitioner')?.display || 'Provider';
                const when = a.start ? new Date(a.start).toLocaleString() : '—';
                return (
                  <div key={a.id} className="p-3 bg-neutral-50 rounded-md border flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-neutral-900 truncate">{patient}</div>
                      <div className="text-xs text-neutral-600 truncate">{provider} • {a.appointmentType || a.serviceType}</div>
                      <div className="text-xs text-neutral-500 mt-1">{when}</div>
                    </div>

                    <div className="ml-3 flex flex-col items-end gap-2">
                      <a href={`/dashboard/encounters/${a.id}`} className="text-xs text-sky-600 hover:underline">Open</a>
                      <a href="#book" className="text-xs text-neutral-600 hover:underline">Reschedule</a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 text-sm text-neutral-500">Tip: Use the calendar to drag appointments to available slots for quick rescheduling.</div>
        </aside>
      </div>
    </div>
  );
}
