import { redirect } from 'next/navigation';

export default async function NewPatientTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/dashboard/tasks?patientId=${encodeURIComponent(id)}&new=1`);
}