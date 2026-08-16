import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import PatientProfileHeader from '@/components/PatientProfileHeader';
import RoshiNoteEditorClient from '@/components/notes/RoshiNoteEditorClient';
import { getPatientById } from '@/app/dashboard/records/mockPatients';

export default async function NotePage({ params }: { params: any }) {
  const patientId = String(params.patientId || params?.patientId);
  const noteId = String(params.noteId || params?.noteId);

  let session: any = null;
  try { session = await auth(); } catch { }
  if (!session) redirect('/login');

  const patient = getPatientById(patientId);
  if (!patient) redirect('/dashboard/records');

  const note = (patient.notes || []).find((n:any) => String(n.id) === String(noteId));
  if (!note) {
    return (
      <div className="bg-[#F6F9FB] min-h-screen py-6">
        <div className="max-w-4xl mx-auto px-6">
          <PatientProfileHeader patient={patient} />
          <div className="mt-6 bg-white p-6 rounded border">Note not found.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F6F9FB] min-h-screen py-6">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-4">
          <a href={`/dashboard/records/${patient.id}`} className="text-sm text-teal-600 hover:underline">← Back to Patient</a>
        </div>

        <PatientProfileHeader patient={patient} />

        <div className="mt-6">
          {/* @ts-ignore - client component */}
          <RoshiNoteEditorClient patient={patient} note={note} />
        </div>
      </div>
    </div>
  );
}
