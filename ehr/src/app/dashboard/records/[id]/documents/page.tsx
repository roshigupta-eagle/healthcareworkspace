import { redirect } from 'next/navigation';
import { getPatientById } from '../../mockPatients';
import PatientProfileHeader from '@/components/PatientProfileHeader';
import DocumentsWorkspace from '@/components/documents/DocumentsWorkspace';
import { listDocuments } from '@/lib/documentStore';

export default async function DocumentsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<{ documentId?: string | string[]; upload?: string | string[] }> }) {
  const { id } = await params;
  const resolvedSearch = searchParams ? await searchParams : undefined;
  const documentId = Array.isArray(resolvedSearch?.documentId) ? resolvedSearch?.documentId[0] : resolvedSearch?.documentId;
  const initialShowUpload = resolvedSearch?.upload === '1' || (Array.isArray(resolvedSearch?.upload) && resolvedSearch?.upload.includes('1'));
  const patient = getPatientById(String(id));
  if (!patient) redirect('/dashboard/records');
  const documents = await listDocuments(String(id), patient);
  const types = Array.from(new Set(documents.map((document) => document.type))).sort();
  const sources = Array.from(new Set(documents.map((document) => document.source))).sort();
  const statuses = Array.from(new Set(documents.map((document) => document.status))).sort();
  return <div className="min-h-screen bg-[#F6F9FB] py-8 pb-28"><div className="w-full max-w-[1760px] mx-auto px-4 sm:px-6 xl:px-10 2xl:px-14"><PatientProfileHeader patient={patient} showActions={false} /><DocumentsWorkspace patientId={String(id)} patientName={patient.name} initialItems={documents} initialFilterOptions={{ types, sources, statuses }} initialSelectedDocumentId={documentId} initialShowUpload={initialShowUpload} /></div></div>;
}