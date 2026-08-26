import { redirect } from 'next/navigation';

export default async function NotesRedirectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Redirect legacy /notes paths to the canonical /doctor-notes page
  redirect(`/dashboard/records/${encodeURIComponent(id)}/doctor-notes`);
}
