import { auth } from '@/lib/auth';

const CLINICAL_ROLES = new Set(['ADMIN', 'DOCTOR', 'NURSE', 'CLINICIAN', 'PRACTITIONER']);

export type WeightAccessResult =
  | { allowed: true; session: Awaited<ReturnType<typeof auth>> }
  | { allowed: false; status: 401 | 403; error: string };

export async function checkWeightClinicalAccess(): Promise<WeightAccessResult> {
  let session: Awaited<ReturnType<typeof auth>> = null;
  try { session = await auth(); } catch {}
  if (!session && process.env.NODE_ENV === 'production') return { allowed: false, status: 401, error: 'authentication required' };
  const role = typeof (session?.user as { role?: unknown } | undefined)?.role === 'string' ? String((session?.user as { role: string }).role).toUpperCase() : undefined;
  if (role && !CLINICAL_ROLES.has(role)) return { allowed: false, status: 403, error: 'clinical weight access is restricted to authorized clinicians' };
  return { allowed: true, session };
}
