import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getCommunicationSnapshot, type CommunicationSnapshot } from '@/lib/communicationStore';
import { CLINICAL_WORKSPACE_ROLES } from '@/lib/doctorWorkspaceAuth';

export type CommunicationPageActor = { id: string; name: string; role: string };

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function getCommunicationPageData(params: SearchParams = {}, input: { channel?: CommunicationSnapshot['channel'] } = {}) {
  const session = await auth().catch(() => null);
  if (!session?.user) redirect('/login?returnTo=%2Fcommunication');
  const user = session.user as { id?: string; name?: string; role?: string };
  if (!user.id) redirect('/unauthorized');
  const actor: CommunicationPageActor = { id: user.id, name: user.name || 'Clinical workspace user', role: String(user.role || '').toUpperCase() };
  if (!CLINICAL_WORKSPACE_ROLES.has(actor.role)) redirect('/unauthorized');
  const query = firstValue(params.q) || '';
  const channelValue = firstValue(params.channel);
  const channel = input.channel || (['all', 'email', 'message', 'call', 'voicemail'].includes(channelValue || '') ? channelValue as CommunicationSnapshot['channel'] : 'all');
  const snapshot = await getCommunicationSnapshot(actor.id, actor.name, actor.role, { query, channel });
  return { actor, snapshot };
}
