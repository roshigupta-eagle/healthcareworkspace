import { getCommunicationHubSnapshot } from '@/lib/clinicalCommunicationStore';
import { communicationSuccess, getCommunicationAccess } from '@/lib/communicationBff';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { access, response } = await getCommunicationAccess(request);
  if (response) return response;
  const params = new URL(request.url).searchParams;
  const snapshot = await getCommunicationHubSnapshot(access!.actor, { query: params.get('q') || '', folder: params.get('folder') || undefined, channel: params.get('channel') || undefined, patientId: params.get('patientId') || undefined });
  return communicationSuccess(snapshot, access!.correlationId);
}
