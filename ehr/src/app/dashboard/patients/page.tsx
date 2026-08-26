import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getSchedulingPatientDirectory } from '@/lib/schedulingData';
import PatientDirectoryClient from './PatientDirectoryClient';

type SearchParams = Record<string, string | string[] | undefined>;

export default async function PatientsPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const params = searchParams ? await searchParams : {};
  const preview = process.env.NODE_ENV !== 'production' && (Boolean(params.noauth) || ['dev', 'dev-doctor'].includes(Array.isArray(params.asUser) ? params.asUser[0] || '' : params.asUser || ''));
  const session = await auth().catch(() => null);
  if (!session && !preview) redirect('/login');
  const role = String(session?.user?.role || 'DEV').toUpperCase();
  if (session?.user && !['ADMIN', 'DOCTOR', 'NURSE', 'CLINICIAN', 'PRACTITIONER', 'DEV'].includes(role)) redirect('/unauthorized');
  const directory = await getSchedulingPatientDirectory();
  return <PatientDirectoryClient patients={directory.patients} source={directory.source} />;
}
