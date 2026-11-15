import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getHealthRecordsResponse } from '@/lib/healthRecords';
import HealthRecordsWorkspace from './HealthRecordsWorkspace';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function RecordsPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const session = await auth().catch(() => null);
  if (!session?.user) redirect('/login?returnTo=%2Fdashboard%2Frecords');
  const role = String(session.user.role || '').toUpperCase();
  if (!['DOCTOR', 'NURSE', 'CLINICIAN', 'PRACTITIONER'].includes(role)) redirect('/unauthorized');

  const initialData = getHealthRecordsResponse({ q: firstValue(resolvedSearchParams.q) });
  return <HealthRecordsWorkspace initialData={initialData} />;
}
