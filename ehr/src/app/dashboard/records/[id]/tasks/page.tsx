import { redirect } from 'next/navigation';

export default async function PatientTasksPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  redirect(`/dashboard/tasks?patientId=${encodeURIComponent(resolvedParams.id)}`);
}
