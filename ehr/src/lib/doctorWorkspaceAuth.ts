import { NextResponse } from 'next/server';
import { resolveSession } from '@/lib/serverAuth';

export const CLINICAL_WORKSPACE_ROLES = new Set(['ADMIN', 'DOCTOR', 'NURSE', 'CLINICIAN', 'PRACTITIONER', 'DEV']);

export type DoctorWorkspaceActor = { id: string; name: string; role: string };

export async function resolveDoctorWorkspaceActor(request: Request): Promise<{ actor?: DoctorWorkspaceActor; response?: NextResponse }> {
  const session = await resolveSession(request);
  const url = new URL(request.url);
  const asUser = url.searchParams.get('asUser');
  const noAuth = ['1', 'true'].includes(url.searchParams.get('noauth') || '');
  const explicitDevPreview = process.env.NODE_ENV !== 'production' && (noAuth || asUser === 'dev' || asUser === 'dev-doctor');
  if (!session?.user && !explicitDevPreview) return { response: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) };
  if (process.env.NODE_ENV !== 'production' && (asUser === 'dev' || asUser === 'dev-doctor')) return { actor: { id: asUser, name: asUser === 'dev' ? 'dev' : 'Doctor User', role: 'DEV' } };
  const user = session?.user as { id?: string; name?: string; role?: string } | undefined;
  const role = String(user?.role || 'DOCTOR').toUpperCase();
  if (session?.user && !CLINICAL_WORKSPACE_ROLES.has(role)) return { response: NextResponse.json({ error: 'This workspace is restricted to authorized clinical staff.' }, { status: 403 }) };
  return { actor: { id: user?.id || 'dev-doctor', name: user?.name || 'Doctor User', role: session?.user ? role : 'DEV' } };
}
