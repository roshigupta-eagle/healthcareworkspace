import { acknowledgeCommunicationMessage } from '@/lib/clinicalCommunicationStore';
import { communicationProblem, communicationSuccess, getCommunicationAccess, idempotencyKey, problemFromError, readRecord, stringValue } from '@/lib/communicationBff';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ messageId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { access, response } = await getCommunicationAccess(request);
  if (response) return response;
  const body = await readRecord(request);
  const key = idempotencyKey(request, body);
  if (!key) return communicationProblem(400, 'IDEMPOTENCY_REQUIRED', 'A unique idempotency key is required before recording acknowledgement.', access!.correlationId);
  const { messageId } = await context.params;
  const patientId = new URL(request.url).searchParams.get('patientId') || undefined;
  try {
    const updated = await acknowledgeCommunicationMessage(messageId, access!.actor, stringValue(body?.note, 1000) || undefined, key, patientId);
    return updated ? communicationSuccess(updated, access!.correlationId, 201) : communicationProblem(404, 'MESSAGE_NOT_FOUND', 'This message is not available in the current clinical context.', access!.correlationId);
  } catch (error) {
    return problemFromError(error, access!.correlationId);
  }
}
