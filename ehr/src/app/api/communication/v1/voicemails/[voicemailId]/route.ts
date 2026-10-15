import { updateCommunicationVoicemail } from '@/lib/clinicalCommunicationStore';
import { communicationProblem, communicationSuccess, getCommunicationAccess, idempotencyKey, problemFromError, readRecord, stringValue } from '@/lib/communicationBff';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ voicemailId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { access, response } = await getCommunicationAccess(request);
  if (response) return response;
  const body = await readRecord(request);
  const key = idempotencyKey(request, body);
  if (!key) return communicationProblem(400, 'IDEMPOTENCY_REQUIRED', 'A unique idempotency key is required before changing voicemail state.', access!.correlationId);
  const action = stringValue(body?.action, 40);
  if (!['review', 'callback', 'resolve'].includes(action)) return communicationProblem(400, 'VALIDATION_FAILED', 'Use review, callback, or resolve.', access!.correlationId);
  const { voicemailId } = await context.params;
  const patientId = new URL(request.url).searchParams.get('patientId') || undefined;
  try {
    const voicemail = await updateCommunicationVoicemail(voicemailId, access!.actor, action as 'review' | 'callback' | 'resolve', key, patientId);
    return voicemail ? communicationSuccess(voicemail, access!.correlationId, 200) : communicationProblem(404, 'VOICEMAIL_NOT_FOUND', 'This voicemail is not available in the current clinical context.', access!.correlationId);
  } catch (error) {
    return problemFromError(error, access!.correlationId);
  }
}
