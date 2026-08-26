import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getCommunicationSnapshot, type CommunicationSnapshot } from '@/lib/communicationStore';
import { CLINICAL_WORKSPACE_ROLES } from '@/lib/doctorWorkspaceAuth';

export type CommunicationPageActor = { id: string; name: string; role: string };

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isPreview(params: SearchParams) {
  return process.env.NODE_ENV !== 'production' && (Boolean(params.noauth) || ['dev', 'dev-doctor'].includes(firstValue(params.asUser) || ''));
}

export async function getCommunicationPageData(params: SearchParams = {}, input: { channel?: CommunicationSnapshot['channel'] } = {}) {
  const session = await auth().catch(() => null);
  if (!session?.user && !isPreview(params)) redirect('/login');
  const user = session?.user as { id?: string; name?: string; role?: string } | undefined;
  const actor: CommunicationPageActor = { id: user?.id || firstValue(params.asUser) || 'dev-doctor', name: user?.name || 'Doctor User', role: String(user?.role || 'DEV').toUpperCase() };
  if (session?.user && !CLINICAL_WORKSPACE_ROLES.has(actor.role)) redirect('/unauthorized');
  const query = firstValue(params.q) || '';
  const channelValue = firstValue(params.channel);
  const channel = input.channel || (['all', 'email', 'message', 'call', 'voicemail'].includes(channelValue || '') ? channelValue as CommunicationSnapshot['channel'] : 'all');
  const snapshot = await getCommunicationSnapshot(actor.id, actor.name, actor.role, { query, channel });
  return { actor, snapshot };
}

export function communicationSearchParams(params: SearchParams) {
  const query = new URLSearchParams();
  const asUser = firstValue(params.asUser);
  if (asUser) query.set('asUser', asUser);
  else if (firstValue(params.noauth) === '1' || firstValue(params.noauth) === 'true') query.set('noauth', '1');
  return query.toString();
}
