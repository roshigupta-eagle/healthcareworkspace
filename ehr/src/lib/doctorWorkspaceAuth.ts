import { NextResponse } from 'next/server';
import { resolveSession } from '@/lib/serverAuth';
export const CLINICAL_WORKSPACE_ROLES = new Set(['DOCTOR', 'NURSE', 'CLINICIAN', 'PRACTITIONER']);
export const LABORATORY_WORKSPACE_ROLES = new Set([...CLINICAL_WORKSPACE_ROLES, 'LAB_TECH']);
export const MEDICATION_WORKSPACE_ROLES = new Set([...CLINICAL_WORKSPACE_ROLES, 'PHARMACIST']);
// Administrative scheduling does not expose clinical records, so administrators and receptionists may book.
export const SCHEDULING_WORKSPACE_ROLES = new Set([...CLINICAL_WORKSPACE_ROLES, 'RECEPTIONIST', 'ADMIN']);

export type DoctorWorkspaceActor = { id: string; name: string; role: string };

// Doctors may assign or reassign work to other clinicians; every other role may only keep work for themselves.
export const canAssignWorkToOthers = (role: string | undefined) => String(role ?? '').toUpperCase() === 'DOCTOR';

export async function resolveDoctorWorkspaceActor(request: Request, allowedRoles: ReadonlySet<string> = CLINICAL_WORKSPACE_ROLES): Promise<{ actor?: DoctorWorkspaceActor; response?: NextResponse }> {
  const session = await resolveSession(request);
  if (!session?.user) return { response: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) };
  const user = session.user as { id?: string; name?: string; role?: string };
  if (!user.id) return { response: NextResponse.json({ error: 'A stable authenticated actor ID is required.' }, { status: 401 }) };
  const role = String(user.role || 'DOCTOR').toUpperCase();
  if (!allowedRoles.has(role)) return { response: NextResponse.json({ error: 'This workspace is restricted to authorized staff.' }, { status: 403 }) };
  return { actor: { id: user.id, name: user.name || 'Clinical workspace user', role } };
}
