import { recordManualDeliveryConfirmation } from '@/lib/clinicalCommunicationStore';
import { communicationProblem, communicationSuccess, getCommunicationAccess, idempotencyKey, problemFromError, readRecord, stringValue } from '@/lib/communicationBff';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ messageId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { access, response } = await getCommunicationAccess(request);
  if (response) return response;
  const body = await readRecord(request);
  const key = idempotencyKey(request, body);
  if (!key) return communicationProblem(400, 'IDEMPOTENCY_REQUIRED', 'A unique idempotency key is required before recording confirmation.', access!.correlationId);
  const method = stringValue(body?.method, 60);
  const confirmedWith = stringValue(body?.confirmedWith, 160);
  const note = stringValue(body?.note, 2000);
  const deliveryId = stringValue(body?.deliveryId, 160);
  if (!method || !confirmedWith || !note || !deliveryId) return communicationProblem(400, 'VALIDATION_FAILED', 'Method, delivery record, confirmed contact, and note are required.', access!.correlationId);
  const { messageId } = await context.params;
  const patientId = new URL(request.url).searchParams.get('patientId') || undefined;
  try {
    const updated = await recordManualDeliveryConfirmation({ messageId, deliveryId, patientId, actor: access!.actor, method, confirmedWith, confirmedAt: new Date().toISOString(), note, idempotencyKey: key });
    return updated ? communicationSuccess(updated, access!.correlationId, 201) : communicationProblem(404, 'MESSAGE_NOT_FOUND', 'This message is not available in the current clinical context.', access!.correlationId);
  } catch (error) {
    return problemFromError(error, access!.correlationId);
  }
}
