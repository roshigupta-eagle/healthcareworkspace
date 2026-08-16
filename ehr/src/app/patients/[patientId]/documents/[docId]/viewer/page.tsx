import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import PatientProfileHeader from '@/components/PatientProfileHeader';
import { getPatientById } from '@/app/dashboard/records/mockPatients';

export default async function DocumentViewerPage({ params }: { params: any }) {
  const patientId = params?.patientId;
  const docId = params?.docId;
  let session: any = null;
  try { session = await auth(); } catch {}
  if (!session) redirect('/login');

  const patient = getPatientById(String(patientId));
  if (!patient) redirect('/dashboard/records');

  const doc = (patient.documents || []).find((d:any) => String(d.id) === String(docId));
  if (!doc) redirect(`/patients/${patient.id}/documents`);

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <Link href={`/patients/${patient.id}/medical-history`} className="text-sm text-teal-600 hover:underline">← Back to Medical History</Link>
          <h1 className="text-2xl font-bold">{doc.name}</h1>
        </div>
      </div>

      <PatientProfileHeader patient={patient} />

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg p-6 border border-[#DDE7F0] shadow-sm">
          <div className="text-sm text-gray-500">Document content</div>
          <div className="mt-3 text-sm text-gray-700">
            {doc.content || 'No preview available. Download or open source to view full document.'}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-lg p-4 border border-[#DDE7F0] shadow-sm">
            <h5 className="text-sm font-semibold">Metadata</h5>
            <div className="mt-3 text-sm text-gray-700">
              <div><strong>Date:</strong> {doc.date}</div>
              <div className="mt-1"><strong>Status:</strong> {doc.status || 'Final'}</div>
              <div className="mt-1"><strong>Type:</strong> {doc.type || 'Discharge summary'}</div>
              <div className="mt-1"><strong>Author:</strong> {doc.author || '—'}</div>
              <div className="mt-1"><strong>FHIR ID:</strong> {doc.fhirId || doc.id}</div>
            </div>
            <div className="mt-3 flex gap-2">
              <a href={doc.url || '#'} target="_blank" rel="noopener noreferrer" className="px-3 py-2 bg-white border rounded text-sm">Open Source</a>
              <button className="px-3 py-2 bg-white border rounded text-sm">Download</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
