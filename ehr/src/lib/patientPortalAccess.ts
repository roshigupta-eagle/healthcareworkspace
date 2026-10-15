import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export type PatientPortalAccess = {
  readonly patientId: string;
  readonly patientName: string;
  readonly agentId: string;
  readonly preview: boolean;
};

export async function requirePatientPortalAccess(asUser: string | undefined): Promise<PatientPortalAccess> {
  const preview = process.env.NODE_ENV !== 'production' && asUser === 'patient-001';
  const session = await auth().catch(() => null);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user && !preview) redirect('/login');
  if (session?.user && role !== 'PATIENT') redirect('/unauthorized');
  const identity = session?.user as { id?: string; name?: string; fhirId?: string } | undefined;
  return {
    patientId: preview ? 'patient-001' : (identity?.fhirId ?? identity?.id ?? ''),
    patientName: preview ? 'Preview Patient' : (identity?.name ?? 'Patient'),
    agentId: preview ? 'preview-patient-001' : (identity?.id ?? ''),
    preview,
  };
}

export function firstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
