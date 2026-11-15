import { redirect } from 'next/navigation';

export default async function PatientReferralsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/dashboard/referrals?${new URLSearchParams({ patientId: id }).toString()}`);
}
