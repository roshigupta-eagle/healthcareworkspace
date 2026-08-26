import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { listAllergiesRecords } from '@/lib/allergyStore';
import { getReviewRecord } from '@/lib/allergyReviewStore';
import { getAllergySafetyResult } from '@/lib/allergySafetyStore';
import { getPatientById } from '../../mockPatients';
import AllergyCommandCenterClient from '@/components/allergies/AllergyCommandCenterClient';

export default async function AllergyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ asUser?: string | string[] }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const id = resolvedParams?.id;

  let session: any = null;
  try {
    // @ts-ignore
    session = await auth();
  } catch {
    /* dev fallback */
  }

  if (!session && resolvedSearchParams?.asUser && process.env.NODE_ENV !== 'production') {
    const override = Array.isArray(resolvedSearchParams.asUser)
      ? resolvedSearchParams.asUser[0]
      : resolvedSearchParams.asUser;
    if (override) session = { user: { id: override, name: override } };
  }

  if (!session) redirect('/login');

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
