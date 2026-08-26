import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getPatientById } from '../../mockPatients';
import { generateSummaryFromPatient, getLatestSummary, listVersions } from '@/lib/aiSummaryStore';
import ClinicalSummaryLayout from '@/features/clinical-summary/ClinicalSummaryLayout.server';

type SearchParams = Record<string, string | string[] | undefined>;
type SessionLike = { user?: { id?: string; name?: string; role?: string } } | null;

function firstValue(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }

export default async function AIClinicalSummaryPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<SearchParams> }) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  let session: SessionLike = null;
  try { session = await auth() as SessionLike; } catch { session = null; }
  const asUser = firstValue(resolvedSearchParams.asUser);
  if (!session && asUser && process.env.NODE_ENV !== 'production') session = { user: { id: asUser, name: asUser, role: 'DEV' } };
  if (!session) redirect('/login');

  const patient = getPatientById(String(id));
  if (!patient) redirect('/dashboard/records');

  const simulate = firstValue(resolvedSearchParams.simulate);
  if (simulate === 'loading') return <div className="clinical-summary-page"><div className="clinical-summary-container"><div className="clinical-summary-skeleton" aria-label="Generating AI clinical summary" /></div></div>;
  if (simulate === 'error') return <div className="clinical-summary-page"><div className="clinical-summary-container"><div role="alert" className="clinical-summary-inline-error">Could not generate the AI clinical summary. Check the configured provider and retry.</div></div></div>;

  let latestSummary = await getLatestSummary(String(id));
  let summaryError: string | undefined;
  if (!latestSummary && simulate !== 'empty') {
    try { latestSummary = await generateSummaryFromPatient(String(id), session.user?.id || session.user?.name || 'unknown-clinician'); }
    catch (error) { summaryError = error instanceof Error ? error.message : 'AI clinical summary generation failed.'; }
  }

  const requestedVersion = firstValue(resolvedSearchParams.version);
  if (requestedVersion) {
    const matchingVersion = (await listVersions(String(id))).find((version) => version.versionId === requestedVersion);
    if (matchingVersion) latestSummary = matchingVersion;
  }
  const fromDoctorView = firstValue(resolvedSearchParams.from) === 'doctor-view';
  const returnTo = firstValue(resolvedSearchParams.returnTo);
  const doctorViewHref = returnTo?.startsWith('/doctor') ? returnTo : '/doctor';
  return <ClinicalSummaryLayout patient={patient} latestSummary={latestSummary} summaryError={summaryError} fromDoctorView={fromDoctorView} doctorViewHref={doctorViewHref} />;
}