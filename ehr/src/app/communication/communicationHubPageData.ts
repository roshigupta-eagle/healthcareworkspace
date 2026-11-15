import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getCommunicationHubSnapshot, type CommunicationHubSnapshot } from '@/lib/clinicalCommunicationStore';
import { CLINICAL_WORKSPACE_ROLES } from '@/lib/doctorWorkspaceAuth';

export type CommunicationHubPageActor = { id: string; name: string; role: string };
type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function getCommunicationHubPageData(params: SearchParams = {}): Promise<{ actor: CommunicationHubPageActor; snapshot: CommunicationHubSnapshot }> {
  const session = await auth().catch(() => null);
  if (!session?.user) redirect('/login?returnTo=%2Fcommunication');
  const user = session.user as { id?: string; name?: string; role?: string };
  if (!user.id) redirect('/unauthorized');
  const actor: CommunicationHubPageActor = { id: user.id, name: user.name || 'Clinical workspace user', role: String(user.role || '').toUpperCase() };
  if (!CLINICAL_WORKSPACE_ROLES.has(actor.role)) redirect('/unauthorized');
  const snapshot = await getCommunicationHubSnapshot({ id: actor.id, name: actor.name, role: actor.role }, { patientId: firstValue(params.patientId) || undefined });
  return { actor, snapshot };
}
