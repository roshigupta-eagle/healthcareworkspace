/*
When the user clicks the Doctor Notes card, open a full Doctor Notes Timeline page with filters, search, note type badges, provider/date filters, a polished notes timeline, selected note details, AI notes summary, patient context, quick actions, and a premium healthcare EHR layout.
*/

import { redirect } from 'next/navigation';
import { getPatientById } from '../../mockPatients';
import PatientProfileHeader from '@/components/PatientProfileHeader';
import DoctorNotesClient from '@/components/DoctorNotesClient';
import BackToPatientButton from '@/components/BackToPatientButton';
import ToastProvider from '@/components/Toast';

export default async function DoctorNotesPage({ params, searchParams }: { params: any; searchParams?: any }) {
  const resolvedParams = await params;
  const id = resolvedParams?.id ?? (params && params.id);
  const resolvedSearchParams = await searchParams;
  const composerParam = resolvedSearchParams?.composer;
  const openComposer = Array.isArray(composerParam)
    ? composerParam.includes('1') || composerParam.includes('true')
    : composerParam === '1' || composerParam === 'true';
  const concernIdParam = resolvedSearchParams?.concernId;
  const concernId = Array.isArray(concernIdParam) ? concernIdParam[0] : concernIdParam;
  const noteIdParam = resolvedSearchParams?.noteId;
  const noteId = Array.isArray(noteIdParam) ? noteIdParam[0] : noteIdParam;
  const toastParam = resolvedSearchParams?.toast;
  const toastKey = Array.isArray(toastParam) ? toastParam[0] : toastParam;

  const patient = getPatientById(String(id));
  if (!patient) redirect('/dashboard/records');

  if (openComposer) {
    redirect(`/dashboard/records/${id}/doctor-notes/new${concernId ? `?concernId=${encodeURIComponent(concernId)}` : ''}`);
  }

  return (
    <div className="min-h-screen bg-[#F6F9FB] py-8">
      <div className="max-w-[1600px] mx-auto px-6">
        <div className="mb-4">
          <BackToPatientButton patientId={id} label="Back to Patient" />
        </div>

        <PatientProfileHeader patient={patient} />

        <div className="mt-6">
          <ToastProvider>
            <DoctorNotesClient patient={patient} initialShowComposer={false} initialRelatedConcernId={concernId || null} initialSelectedNoteId={noteId || null} initialToast={toastKey || null} />
          </ToastProvider>
        </div>
      </div>
    </div>
  );
}
