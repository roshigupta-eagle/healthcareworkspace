import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getPatientById } from '../../../mockPatients';
import { listAuditEvents, listVersions } from '@/lib/aiSummaryStore';
import SummaryHistoryPage from '@/features/clinical-summary/SummaryHistoryPage.server';

export default async function SummaryVersionsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<{ version?: string }> }) {
  if (!(await auth())) redirect('/login');
  const { id } = await params;
  const patient = getPatientById(id);
  if (!patient) redirect('/dashboard/records');
  const search = searchParams ? await searchParams : {};
  return <SummaryHistoryPage patient={patient} versions={await listVersions(id)} events={await listAuditEvents(id)} mode="history" selectedVersionId={search.version} />;
}