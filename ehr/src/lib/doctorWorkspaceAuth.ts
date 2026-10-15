import { NextResponse } from 'next/server';
import { resolveSession } from '@/lib/serverAuth';
import { isDevelopmentPreviewRequest, resolveDevelopmentPreviewActor, type DevelopmentPreviewActor } from '@/lib/communicationPreview';

export const CLINICAL_WORKSPACE_ROLES = new Set(['ADMIN', 'DOCTOR', 'NURSE', 'CLINICIAN', 'PRACTITIONER']);

export type DoctorWorkspaceActor = DevelopmentPreviewActor;
export { isDevelopmentPreviewRequest, resolveDevelopmentPreviewActor } from '@/lib/communicationPreview';

export async function resolveDoctorWorkspaceActor(request: Request): Promise<{ actor?: DoctorWorkspaceActor; response?: NextResponse }> {
  const session = await resolveSession(request);
  const url = new URL(request.url);
  const asUser = url.searchParams.get('asUser');
  const explicitDevPreview = isDevelopmentPreviewRequest(asUser);
  const previewActor = explicitDevPreview ? resolveDevelopmentPreviewActor(asUser) : undefined;
  if (!session?.user && !explicitDevPreview) return { response: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) };
  if (previewActor) return { actor: previewActor };
  const user = session?.user as { id?: string; name?: string; role?: string } | undefined;
  if (!user?.id) return { response: NextResponse.json({ error: 'A stable authenticated actor ID is required.' }, { status: 401 }) };
  const role = String(user?.role || 'DOCTOR').toUpperCase();
  if (session?.user && !CLINICAL_WORKSPACE_ROLES.has(role)) return { response: NextResponse.json({ error: 'This workspace is restricted to authorized clinical staff.' }, { status: 403 }) };
  return { actor: { id: user.id, name: user.name || 'Clinical workspace user', role } };
}
