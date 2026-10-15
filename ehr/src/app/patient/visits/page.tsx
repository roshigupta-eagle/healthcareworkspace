import { History, MapPin } from 'lucide-react';
import { PatientPortalShell } from '../PatientPortalShell';
import { signOutOfPatientPortal } from '../actions';
import { firstQueryValue, requirePatientPortalAccess } from '@/lib/patientPortalAccess';
import { getPatientVisits } from '@/lib/patientPortalData';

export default async function PatientVisitsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = searchParams ? await searchParams : {};
  const access = await requirePatientPortalAccess(firstQueryValue(params.asUser));
  const visits = await getPatientVisits(access.patientId).catch(() => []);
  return <PatientPortalShell patientName={access.patientName} signOutAction={signOutOfPatientPortal}><div className='space-y-6'><header><p className='text-xs font-bold uppercase tracking-[0.14em] text-sky-700'>My care timeline</p><h1 className='mt-2 text-3xl font-semibold text-slate-900'>Visit History</h1><p className='mt-2 text-sm text-slate-600'>A chronological view of the encounters in your health record.</p></header><section className='rounded-2xl border border-slate-200 bg-white shadow-sm'><div className='flex items-center gap-3 border-b border-slate-100 px-5 py-4'><History className='text-sky-600' /><h2 className='font-semibold text-slate-900'>Past and current visits</h2></div><div className='p-5'>{visits.length === 0 ? <p className='rounded-xl bg-slate-50 p-5 text-sm text-slate-600'>No visit history is currently available in your care record.</p> : <ol className='space-y-4 border-l-2 border-sky-100 pl-5'>{visits.map((visit) => <li key={visit.id} className='relative rounded-xl border border-slate-200 p-4'><span className='absolute -left-[31px] top-5 h-3 w-3 rounded-full bg-sky-600 ring-4 ring-white' /><div className='flex flex-wrap items-center justify-between gap-2'><h3 className='font-semibold text-slate-900'>{visit.title}</h3><span className='rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700'>{visit.status}</span></div><p className='mt-2 text-sm text-slate-500'>{visit.date}</p><p className='mt-2 inline-flex items-center gap-1 text-sm text-slate-600'><MapPin size={15} />{visit.location}</p></li>)}</ol>}</div></section></div></PatientPortalShell>;
}
