/*
When the user clicks the Doctor Notes card, open a full Doctor Notes Timeline page with filters, search, note type badges, provider/date filters, a polished notes timeline, selected note details, AI notes summary, patient context, quick actions, and a premium healthcare EHR layout.
*/

import { redirect } from 'next/navigation';
import { getPatientById } from '../../mockPatients';
import PatientProfileHeader from '@/components/PatientProfileHeader';
import DoctorNotesClient from '@/components/DoctorNotesClient';
import BackToPatientButton from '@/components/BackToPatientButton';

export default async function DoctorNotesPage({ params, searchParams }: { params: any; searchParams?: any }) {
  const resolvedParams = await params;
  const id = resolvedParams?.id ?? (params && params.id);
  const resolvedSearchParams = await searchParams;
  const composerParam = resolvedSearchParams?.composer;
  const openComposer = Array.isArray(composerParam)
    ? composerParam.includes('1') || composerParam.includes('true')
    : composerParam === '1' || composerParam === 'true';

  const patient = getPatientById(String(id));
  if (!patient) redirect('/dashboard/records');

  return (
    <div className="min-h-screen bg-[#F6F9FB] py-8">
      <div className="max-w-[1600px] mx-auto px-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackToPatientButton patientId={id} label="Back to Patient" />
            <h1 className="text-3xl font-bold text-[#0f1724]">Doctor Notes</h1>
          </div>
          <div className="text-sm text-gray-500">Updated just now</div>
        </div>

        <PatientProfileHeader patient={patient} />

        <div className="mt-6">
          {/* @ts-ignore - client component */}
          <DoctorNotesClient patient={patient} initialShowComposer={openComposer} />
        </div>
      </div>
    </div>
  );
}
