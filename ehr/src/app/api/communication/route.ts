import { NextResponse } from 'next/server';
import { getCommunicationSnapshot } from '@/lib/communicationStore';
import { resolveDoctorWorkspaceActor } from '@/lib/doctorWorkspaceAuth';

export const dynamic = 'force-dynamic';

const channels = new Set(['all', 'email', 'message', 'call', 'voicemail']);

export async function GET(request: Request) {
  const access = await resolveDoctorWorkspaceActor(request);
  if (access.response) return access.response;
  const params = new URL(request.url).searchParams;
  const channelValue = params.get('channel') || 'all';
  const channel = channels.has(channelValue) ? channelValue as 'all' | 'email' | 'message' | 'call' | 'voicemail' : 'all';
  return NextResponse.json(await getCommunicationSnapshot(access.actor!.id, access.actor!.name, access.actor!.role, { query: params.get('q') || '', channel, includeArchived: params.get('includeArchived') === 'true' }), { headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
}
