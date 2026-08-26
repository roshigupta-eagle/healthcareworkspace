import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getPatientById } from '../../mockPatients';
import PatientProfileHeader from '@/components/PatientProfileHeader';
import ImmunizationsPageClient from '@/components/immunizations/ImmunizationsPageClient';
import { listImmunizations, mapLegacyImmunization } from '@/lib/immunizationStore';

export default async function ImmunizationsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const id = resolvedParams?.id ?? (params && params.id);

  const patient = getPatientById(String(id));
  if (!patient) redirect('/dashboard/records');

  const stored = await listImmunizations(String(id));
  const legacy = (patient.immunizations || []).map((item, index) => mapLegacyImmunization(String(id), item, index));
  const knownIds = new Set(stored.map((item) => item.id));
  const initialItems = [...stored, ...legacy.filter((item) => !knownIds.has(item.id))];

  return (
    <div className="min-h-screen bg-[#F6F9FB] py-8 pb-28">
      <div className="w-full max-w-[1760px] mx-auto px-4 sm:px-6 xl:px-10 2xl:px-14">
        <div className="mb-4">
          <Link href={`/dashboard/records/${patient.id}`} className="inline-flex min-h-9 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-teal-700 transition-colors hover:bg-teal-50 focus-visible:ring-2 focus-visible:ring-teal-500">
            <span aria-hidden>←</span>
            Back to patient record
          </Link>
        </div>
        <PatientProfileHeader patient={patient} showActions={false} />
        <ImmunizationsPageClient patientId={String(id)} initialItems={initialItems} />
      </div>
    </div>
  );
}
