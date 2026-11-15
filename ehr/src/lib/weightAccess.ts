import type { Session } from 'next-auth';
import { auth } from '@/lib/auth';

const CLINICAL_ROLES = new Set(['DOCTOR', 'NURSE', 'CLINICIAN', 'PRACTITIONER']);

export type WeightAccessResult =
  | { allowed: true; session: Session }
  | { allowed: false; status: 401 | 403; error: string };

export async function checkWeightClinicalAccess(): Promise<WeightAccessResult> {
  const session = await auth().catch(() => null);
  if (!session?.user) return { allowed: false, status: 401, error: 'authentication required' };
  const role = typeof (session.user as { role?: unknown }).role === 'string' ? String((session.user as { role: string }).role).toUpperCase() : undefined;
  if (!role || !CLINICAL_ROLES.has(role)) return { allowed: false, status: 403, error: 'clinical weight access is restricted to authorized clinicians' };
  return { allowed: true, session };
}
