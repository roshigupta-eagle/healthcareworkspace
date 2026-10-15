import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getDoctorWorkSnapshot } from '@/lib/doctorWorkStore';
import { CLINICAL_WORKSPACE_ROLES } from '@/lib/doctorWorkspaceAuth';
import { getCanonicalPatientDirectory } from '@/lib/patientDirectory';
import DoctorDocumentsClient from '@/components/doctor-workspace/DoctorDocumentsClient';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || '' : value || '';
}

export default async function DoctorDocumentsPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const params = searchParams ? await searchParams : {};
  const asUser = firstValue(params.asUser);
  const noAuth = Boolean(params.noauth);
  const preview = process.env.NODE_ENV !== 'production' && (noAuth || ['dev', 'dev-doctor'].includes(asUser));
  const session = await auth().catch(() => null);
  if (!session?.user && !preview) redirect('/login?returnTo=%2Fdashboard%2Fdocuments');
  const user = session?.user as { id?: string; name?: string; role?: string } | undefined;
  const actor = preview && !session?.user
    ? { id: asUser || 'dev-doctor', name: asUser === 'dev' ? 'dev' : 'Doctor User', role: 'DEV' }
    : { id: user?.id || 'dev-doctor', name: user?.name || 'Doctor User', role: String(user?.role || 'DOCTOR').toUpperCase() };
  if (session?.user && !CLINICAL_WORKSPACE_ROLES.has(actor.role)) redirect('/unauthorized');
  const previewQuery = preview ? `${noAuth ? 'noauth=1' : ''}${noAuth && asUser ? '&' : ''}${asUser ? `asUser=${encodeURIComponent(asUser)}` : noAuth ? 'asUser=dev' : ''}` : '';
  const work = await getDoctorWorkSnapshot(actor.id, actor.name, actor.role);
  const directory = await getCanonicalPatientDirectory({ preview });
  const patients = directory.patients.map((patient) => ({ ...patient, href: `/dashboard/records/${encodeURIComponent(patient.id)}` }));
  return <DoctorDocumentsClient initialData={{ ...work, patients }} preview={previewQuery} />;
}
