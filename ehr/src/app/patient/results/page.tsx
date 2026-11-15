import { FileCheck2, FlaskConical } from 'lucide-react';
import { PatientPortalShell } from '../PatientPortalShell';
import { signOutOfPatientPortal } from '../actions';
import { requirePatientPortalAccess } from '@/lib/patientPortalAccess';
import { getPatientResults } from '@/lib/patientPortalData';

export default async function PatientResultsPage() {
  const access = await requirePatientPortalAccess();
  const results = await getPatientResults(access.patientId).catch(() => []);
  return <PatientPortalShell patientName={access.patientName} signOutAction={signOutOfPatientPortal}><div className='space-y-6'><header><p className='text-xs font-bold uppercase tracking-[0.14em] text-sky-700'>My clinical information</p><h1 className='mt-2 text-3xl font-semibold text-slate-900'>Results</h1><p className='mt-2 text-sm text-slate-600'>Reports released to your care record. Contact your care team for interpretation.</p></header><section className='rounded-2xl border border-slate-200 bg-white shadow-sm'><div className='flex items-center gap-3 border-b border-slate-100 px-5 py-4'><FlaskConical className='text-sky-600' /><div><h2 className='font-semibold text-slate-900'>Available reports</h2><p className='text-sm text-slate-500'>Results are not a replacement for medical advice.</p></div></div><div className='divide-y divide-slate-100'>{results.length === 0 ? <p className='m-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-600'>No diagnostic reports are currently available in your care record.</p> : results.map((result) => <article key={result.id} className='flex gap-4 px-5 py-4'><FileCheck2 className='mt-0.5 shrink-0 text-sky-600' size={20} /><div className='min-w-0 flex-1'><div className='flex flex-wrap items-center justify-between gap-2'><h3 className='font-semibold text-slate-900'>{result.title}</h3><span className='rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700'>{result.status}</span></div><p className='mt-1 text-sm text-slate-500'>{result.date}</p><p className='mt-2 text-sm leading-6 text-slate-700'>{result.summary}</p></div></article>)}</div></section></div></PatientPortalShell>;
}
