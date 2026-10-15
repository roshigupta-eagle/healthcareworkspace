import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getCommunicationHubSnapshot, type CommunicationHubSnapshot } from '@/lib/clinicalCommunicationStore';
import { CLINICAL_WORKSPACE_ROLES, isDevelopmentPreviewRequest, resolveDevelopmentPreviewActor } from '@/lib/doctorWorkspaceAuth';

export type CommunicationHubPageActor = { id: string; name: string; role: string };
type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isPreview(params: SearchParams) {
  return isDevelopmentPreviewRequest(firstValue(params.asUser));
}

export async function getCommunicationHubPageData(params: SearchParams = {}): Promise<{ actor: CommunicationHubPageActor; snapshot: CommunicationHubSnapshot }> {
  const session = await auth().catch(() => null);
  if (!session?.user && !isPreview(params)) redirect('/login');
  const user = session?.user as { id?: string; name?: string; role?: string } | undefined;
  const previewActor = isPreview(params) ? resolveDevelopmentPreviewActor(firstValue(params.asUser)) : undefined;
  if (!previewActor && !user?.id) redirect('/unauthorized');
  const actor: CommunicationHubPageActor = previewActor || { id: user!.id!, name: user?.name || 'Clinical workspace user', role: String(user?.role || 'DOCTOR').toUpperCase() };
  if (session?.user && !CLINICAL_WORKSPACE_ROLES.has(actor.role)) redirect('/unauthorized');
  const snapshot = await getCommunicationHubSnapshot({ id: actor.id, name: actor.name, role: actor.role }, { patientId: firstValue(params.patientId) || undefined });
  return { actor, snapshot };
}
