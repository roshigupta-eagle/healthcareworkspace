import { endCommunicationCall } from '@/lib/clinicalCommunicationStore';
import { communicationProblem, communicationSuccess, getCommunicationAccess, problemFromError, stringValue } from '@/lib/communicationBff';
import { isCallProviderError } from '@/lib/communicationProviders';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ callId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { access, response } = await getCommunicationAccess(request);
  if (response) return response;
  const { callId } = await context.params;
  if (!callId.trim()) return communicationProblem(400, 'VALIDATION_FAILED', 'A call identifier is required.', access!.correlationId);

  try {
    const patientId = stringValue(new URL(request.url).searchParams.get('patientId'), 120) || undefined;
    const call = await endCommunicationCall({ callId, actor: access!.actor, patientId, correlationId: access!.correlationId });
    if (!call) return communicationProblem(404, 'CALL_NOT_FOUND', 'This call is not available in the current clinical context.', access!.correlationId);
    return communicationSuccess({ call }, access!.correlationId);
  } catch (error) {
    if (isCallProviderError(error)) return communicationProblem(error.status, error.code, error.detail, access!.correlationId, error.retryable);
    if (error instanceof Error && error.message === 'MEDIA_END_NOT_AVAILABLE') {
      return communicationProblem(409, 'MEDIA_END_NOT_AVAILABLE', 'This call does not have an active LiveKit control-plane session to end.', access!.correlationId);
    }
    return problemFromError(error, access!.correlationId);
  }
}
