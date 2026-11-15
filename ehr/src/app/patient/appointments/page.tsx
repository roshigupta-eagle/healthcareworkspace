import { CalendarDays, Clock3, MapPin, Stethoscope } from 'lucide-react';
import { PatientPortalShell } from '../PatientPortalShell';
import { signOutOfPatientPortal } from '../actions';
import { requirePatientPortalAccess } from '@/lib/patientPortalAccess';
import { getPatientAppointments } from '@/lib/patientPortalData';

export default async function PatientAppointmentsPage() {
  const access = await requirePatientPortalAccess();
  const appointments = await getPatientAppointments(access.patientId).catch(() => []);
  const days = new Map<string, typeof appointments>();
  for (const appointment of appointments) {
    const day = appointment.start.split(',')[0] ?? 'Date not available';
    days.set(day, [...(days.get(day) ?? []), appointment]);
  }

  return <PatientPortalShell patientName={access.patientName} signOutAction={signOutOfPatientPortal}>
    <div className='space-y-6'>
      <header className='flex flex-col justify-between gap-4 sm:flex-row sm:items-end'><div><p className='text-xs font-bold uppercase tracking-[0.14em] text-sky-700'>My care calendar</p><h1 className='mt-2 text-3xl font-semibold text-slate-900'>Appointments</h1><p className='mt-2 text-sm text-slate-600'>Your scheduled visits, arrival details, and care team appointments.</p></div><div className='rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-800'><strong>{appointments.length}</strong> appointment{appointments.length === 1 ? '' : 's'} on record</div></header>
      <section className='rounded-2xl border border-sky-100 bg-white shadow-sm'><div className='flex items-center gap-3 border-b border-sky-100 px-5 py-4'><CalendarDays className='text-sky-600' /><div><h2 className='font-semibold text-slate-900'>Your appointment calendar</h2><p className='text-sm text-slate-500'>Only your own visits are shown here.</p></div></div><div className='p-5'>{days.size === 0 ? <p className='rounded-xl bg-slate-50 p-5 text-sm text-slate-600'>No appointment information is currently available from your care record.</p> : <div className='space-y-5'>{[...days.entries()].map(([day, items]) => <section key={day}><h3 className='mb-2 text-sm font-bold text-slate-700'>{day}</h3><div className='space-y-3'>{items.map((appointment) => <article key={appointment.id} className='grid gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-[150px_1fr_auto] sm:items-center'><div><p className='font-semibold text-slate-900'>{appointment.start.split(',').slice(1).join(',').trim() || 'Time not available'}</p><span className='mt-1 inline-flex rounded-full bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-800'>{appointment.status}</span></div><div><h4 className='font-semibold text-slate-900'>{appointment.title}</h4><div className='mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600'><span className='inline-flex items-center gap-1'><Stethoscope size={15} />{appointment.provider}</span><span className='inline-flex items-center gap-1'><MapPin size={15} />{appointment.location}</span></div></div><Clock3 className='text-slate-400' /></article>)}</div></section>)}</div>}</div></section>
    </div>
  </PatientPortalShell>;
}
