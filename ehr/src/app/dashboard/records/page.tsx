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
  const preview = process.env.NODE_ENV !== 'production' && (Boolean(resolvedSearchParams.noauth) || ['dev', 'dev-doctor'].includes(firstValue(resolvedSearchParams.asUser) || ''));
  if (!session && !preview) redirect('/login');
  const role = String(session?.user?.role || 'DEV').toUpperCase();
  if (session?.user && !['ADMIN', 'DOCTOR', 'NURSE', 'CLINICIAN', 'PRACTITIONER', 'DEV'].includes(role)) redirect('/unauthorized');

  const initialData = getHealthRecordsResponse({ q: firstValue(resolvedSearchParams.q) });
  return <HealthRecordsWorkspace initialData={initialData} />;
}
