import { FileText } from 'lucide-react';
import { PatientPortalShell } from '../PatientPortalShell';
import { signOutOfPatientPortal } from '../actions';
import { requirePatientPortalAccess } from '@/lib/patientPortalAccess';
import { getPatientDocuments } from '@/lib/patientPortalData';

export default async function PatientDocumentsPage() {
  const access = await requirePatientPortalAccess();
  const documents = await getPatientDocuments(access.patientId).catch(() => []);
  return <PatientPortalShell patientName={access.patientName} signOutAction={signOutOfPatientPortal}><div className='space-y-6'><header><p className='text-xs font-bold uppercase tracking-[0.14em] text-sky-700'>My care documents</p><h1 className='mt-2 text-3xl font-semibold text-slate-900'>Documents</h1><p className='mt-2 text-sm text-slate-600'>Documents that have been made available in your care record.</p></header><section className='rounded-2xl border border-slate-200 bg-white shadow-sm'><div className='flex items-center gap-3 border-b border-slate-100 px-5 py-4'><FileText className='text-sky-600' /><h2 className='font-semibold text-slate-900'>Available documents</h2></div><div className='divide-y divide-slate-100'>{documents.length === 0 ? <p className='m-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-600'>No documents are currently available in your care record.</p> : documents.map((document) => <article key={document.id} className='flex flex-wrap items-center justify-between gap-3 px-5 py-4'><div><h3 className='font-semibold text-slate-900'>{document.title}</h3><p className='mt-1 text-sm text-slate-500'>{document.type} · {document.date}</p></div><span className='rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700'>{document.status}</span></article>)}</div></section></div></PatientPortalShell>;
}
