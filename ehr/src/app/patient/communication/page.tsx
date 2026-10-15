import { MessageCircle } from 'lucide-react';
import { PatientPortalShell } from '../PatientPortalShell';
import { signOutOfPatientPortal } from '../actions';
import { firstQueryValue, requirePatientPortalAccess } from '@/lib/patientPortalAccess';
import { getPatientCommunications } from '@/lib/patientPortalData';

export default async function PatientCommunicationPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = searchParams ? await searchParams : {};
  const access = await requirePatientPortalAccess(firstQueryValue(params.asUser));
  const messages = await getPatientCommunications(access.patientId).catch(() => []);
  return <PatientPortalShell patientName={access.patientName} signOutAction={signOutOfPatientPortal}><div className='space-y-6'><header><p className='text-xs font-bold uppercase tracking-[0.14em] text-sky-700'>My care team</p><h1 className='mt-2 text-3xl font-semibold text-slate-900'>Communication</h1><p className='mt-2 text-sm text-slate-600'>Messages and updates connected to your own care record.</p></header><section className='rounded-2xl border border-slate-200 bg-white shadow-sm'><div className='flex items-center gap-3 border-b border-slate-100 px-5 py-4'><MessageCircle className='text-sky-600' /><div><h2 className='font-semibold text-slate-900'>Care team messages</h2><p className='text-sm text-slate-500'>Only messages scoped to your record can appear here.</p></div></div><div className='divide-y divide-slate-100'>{messages.length === 0 ? <p className='m-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-600'>No patient-scoped messages are available. Secure messaging requires a configured communication service.</p> : messages.map((message) => <article key={message.id} className='px-5 py-4'><div className='flex flex-wrap items-center justify-between gap-2'><h3 className='font-semibold text-slate-900'>{message.title}</h3><span className='rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700'>{message.status}</span></div><p className='mt-1 text-sm text-slate-500'>{message.date}</p><p className='mt-2 text-sm leading-6 text-slate-700'>{message.detail}</p></article>)}</div></section></div></PatientPortalShell>;
}
