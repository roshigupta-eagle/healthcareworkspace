import { markCommunicationMessageRead } from '@/lib/clinicalCommunicationStore';
import { communicationProblem, communicationSuccess, getCommunicationAccess, problemFromError } from '@/lib/communicationBff';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ messageId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { access, response } = await getCommunicationAccess(request);
  if (response) return response;
  const { messageId } = await context.params;
  try {
    const updated = await markCommunicationMessageRead(messageId, access!.actor, new URL(request.url).searchParams.get('patientId') || undefined);
    return updated ? communicationSuccess(updated, access!.correlationId) : communicationProblem(404, 'MESSAGE_NOT_FOUND', 'This message is not available in the current clinical context.', access!.correlationId);
  } catch (error) {
    return problemFromError(error, access!.correlationId);
  }
}
