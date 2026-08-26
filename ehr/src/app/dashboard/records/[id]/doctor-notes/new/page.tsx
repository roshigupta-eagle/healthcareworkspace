import { getPatientById } from "../../../mockPatients";
import { getNote } from "@/lib/doctorNotesStore";
import { resolveActor } from "@/lib/noteActor";
import ToastProvider from "@/components/Toast";
import NoteEditorPage from "@/components/doctor-notes/full-page/NoteEditorPage";

export default async function NewNotePage({ params, searchParams }: { params: any; searchParams?: any }) {
  const resolvedParams = await params;
  const id = String(resolvedParams?.id ?? resolvedParams?.patientId ?? params?.id);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const noteIdParam = resolvedSearchParams?.noteId;
  const noteId = Array.isArray(noteIdParam) ? noteIdParam[0] : noteIdParam;

  const patient = getPatientById(String(id));
  if (!patient) {
    return (
      <div className="bg-[#F6F9FB] min-h-screen py-6">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-4">
            <a href={`/dashboard/records`} className="text-sm text-teal-600 hover:underline">← Back to Records</a>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-medium text-gray-900">Patient Not Found</h2>
            <p className="mt-2 text-sm text-gray-600">We couldn&apos;t find the requested patient. Verify the URL or return to the patient list.</p>
          </div>
        </div>
      </div>
    );
  }

  const currentUser = await resolveActor();
  const initialNote = noteId ? await getNote(id, noteId) : null;

  return (
    <ToastProvider>
      <NoteEditorPage patient={patient} patientId={patient.id} initialNote={initialNote} currentUser={{ id: currentUser.id, name: currentUser.name }} />
    </ToastProvider>
  );
}
