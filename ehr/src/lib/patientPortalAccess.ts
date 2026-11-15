import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export type PatientPortalAccess = {
  readonly patientId: string;
  readonly patientName: string;
  readonly agentId: string;
};

export async function requirePatientPortalAccess(): Promise<PatientPortalAccess> {
  const session = await auth().catch(() => null);
  if (!session?.user) redirect('/login');
  const identity = session.user as { id?: string; name?: string; role?: string; fhirId?: string; patientId?: string };
  if (identity.role !== 'PATIENT') redirect('/unauthorized');
  return {
    patientId: identity.patientId ?? identity.fhirId ?? identity.id ?? '',
    patientName: identity.name ?? 'Patient',
    agentId: identity.id ?? '',
  };
}
