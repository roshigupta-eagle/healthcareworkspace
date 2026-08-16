import { redirect } from "next/navigation";
import { getPatientById } from "../../../mockPatients";
import PatientProfileHeader from "@/components/PatientProfileHeader";
import NewNotePageClient from "@/components/notes/NewNotePageClient";

export default async function NewNotePage({ params }: { params: any }) {
  const resolvedParams = await params;
  const id = String(resolvedParams?.id ?? resolvedParams?.patientId ?? params?.id);
  const patient = getPatientById(String(id));
  if (!patient) {
    return (
      <div className="bg-[#F6F9FB] min-h-screen py-6">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-4">
            <a href={`/dashboard/records`} className="text-sm text-teal-600 hover:underline">← Back to Records</a>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-medium text-gray-900">Patient not found</h2>
            <p className="mt-2 text-sm text-gray-600">We couldn't find the requested patient. Verify the URL or return to the records list.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F6F9FB] min-h-screen py-6">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-4">
          <a href={`/dashboard/records/${patient.id}/doctor-notes`} className="text-sm text-teal-600 hover:underline">← Back to Doctor Notes</a>
        </div>

        <PatientProfileHeader patient={patient} />

        <div className="mt-6">
          {/* @ts-ignore - client component */}
          <NewNotePageClient patient={patient} />
        </div>
      </div>
    </div>
  );
}
