import { redirect } from 'next/navigation';

export default async function LegacyLabResultPage({
  params,
}: {
  params: Promise<{ id: string; labId: string }> | { id: string; labId: string };
}) {
  const resolvedParams = await params;
  redirect(`/dashboard/records/${resolvedParams.id}/labs/${resolvedParams.labId}`);
}
