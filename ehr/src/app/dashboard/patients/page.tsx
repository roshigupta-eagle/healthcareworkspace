import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getCanonicalPatientDirectory } from '@/lib/patientDirectory';
import ClinicalDirectoryClient from './ClinicalDirectoryClient';

type SearchParams = Record<string, string | string[] | undefined>;

export default async function PatientsPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const params = searchParams ? await searchParams : {};
  const asUser = Array.isArray(params.asUser) ? params.asUser[0] || '' : params.asUser || '';
  const noAuth = Boolean(params.noauth);
  const preview = process.env.NODE_ENV !== 'production' && (noAuth || ['dev', 'dev-doctor'].includes(asUser));
  const previewQuery = preview ? (asUser ? `asUser=${encodeURIComponent(asUser)}` : 'noauth=1&asUser=dev') : '';
  const session = await auth().catch(() => null);
  if (!session && !preview) redirect('/login');
  const role = String(session?.user?.role || 'DEV').toUpperCase();
  if (session?.user && !['ADMIN', 'DOCTOR', 'NURSE', 'CLINICIAN', 'PRACTITIONER', 'DEV'].includes(role)) redirect('/unauthorized');
  const directory = await getCanonicalPatientDirectory({ preview });
  const patients = directory.patients;
  const source = { state: directory.source.state, source: directory.source.label, fallback: false, error: directory.source.error };
  return <ClinicalDirectoryClient patients={patients} source={source} preview={previewQuery} />;
}
