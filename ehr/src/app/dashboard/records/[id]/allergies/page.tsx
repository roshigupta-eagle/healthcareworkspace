import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { listAllergiesRecords } from '@/lib/allergyStore';
import { getReviewRecord } from '@/lib/allergyReviewStore';
import { getAllergySafetyResult } from '@/lib/allergySafetyStore';
import { getPatientById } from '../../mockPatients';
import AllergyCommandCenterClient from '@/components/allergies/AllergyCommandCenterClient';

export default async function AllergyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const id = resolvedParams?.id;

  const session = await auth().catch(() => null);
  if (!session?.user) redirect('/login');

  const patient = getPatientById(String(id));
  if (!patient) redirect('/dashboard/records');

  // Load initial server-side records
  const [initialAllergies, initialReview, initialSafety] = await Promise.all([
    listAllergiesRecords(patient.id),
    getReviewRecord(patient.id),
    getAllergySafetyResult(patient.id),
  ]);

  return (
    <AllergyCommandCenterClient
      patient={patient}
      initialAllergies={initialAllergies}
      initialReview={initialReview}
      initialSafety={initialSafety}
    />
  );
}
