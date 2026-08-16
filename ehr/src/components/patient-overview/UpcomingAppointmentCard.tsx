import Link from 'next/link';
import { OverviewCard, EmptyState } from './OverviewCard';
import { CalendarClockIcon } from './icons';

const STATUS_CLASS: Record<string, string> = {
  Scheduled: 'bg-sky-50 text-sky-700',
  Confirmed: 'bg-emerald-50 text-emerald-700',
  Cancelled: 'bg-red-50 text-red-700',
  Planned: 'bg-gray-100 text-gray-700',
};

export function UpcomingAppointmentCard({ patient }: { patient: any }) {
  const appt = patient.upcoming?.[0];
  return (
    <OverviewCard id="upcoming-appointment" title="Upcoming Appointment" icon={<CalendarClockIcon className="w-5 h-5" />}>
      {!appt ? (
        <EmptyState message="No upcoming appointments are scheduled." />
      ) : (
        <div>
          <div className="text-lg font-semibold text-gray-900">
            {new Date(appt.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}
          </div>
          <div className="text-sm text-gray-600">{new Date(appt.date).toLocaleTimeString(undefined, { timeStyle: 'short' })}</div>

          <div className="mt-3 text-sm font-medium text-gray-900">{appt.type}</div>
          <div className="text-sm text-gray-600">{appt.doctor}</div>
          {appt.location && (
            <div className="text-sm text-gray-500">
              {appt.location}
              {appt.room ? ` • Room ${appt.room}` : ''}
            </div>
          )}

          <span className={`inline-block mt-2 text-[11px] px-2 py-0.5 rounded-full font-medium ${STATUS_CLASS[appt.status] || 'bg-gray-100 text-gray-700'}`}>
            Status: {appt.status || 'Scheduled'}
          </span>

          {appt.prep && <p className="mt-2 text-xs text-gray-500">{appt.prep}</p>}

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <Link href={`/dashboard/records/${patient.id}/appointments/${appt.id}`} className="text-teal-700 font-medium hover:underline">
              View Appointment
            </Link>
            <Link href={`/dashboard/records/${patient.id}/messages`} className="text-teal-700 font-medium hover:underline">
              Message Clinic
            </Link>
          </div>
        </div>
      )}
    </OverviewCard>
  );
}
