import { getCommunicationCall, isCommunicationCallAction, updateCommunicationCall } from '@/lib/clinicalCommunicationStore';
import { communicationProblem, communicationSuccess, getCommunicationAccess, idempotencyKey, problemFromError, readRecord, stringValue } from '@/lib/communicationBff';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ callId: string }> };

function callProblemFromError(error: unknown, correlationId: string) {
  const code = error instanceof Error ? error.message : 'COMMUNICATION_FAILED';
  const details: Record<string, { status: number; detail: string; retryable?: boolean }> = {
    CALL_ACTION_UNSUPPORTED: { status: 400, detail: 'Use a supported call action.' },
    CALL_NOTE_INVALID: { status: 400, detail: 'Provide a call note from 1 through 4,000 characters.' },
    CALL_DISPOSITION_INVALID: { status: 400, detail: 'Use a valid local call disposition code.' },
    CALL_STATE_CONFLICT: { status: 409, detail: 'This call is not in a state that permits the requested action.' },
    CALL_STORE_UNAVAILABLE: { status: 503, detail: 'Call history is temporarily unavailable. No media-provider request was made.', retryable: true },
  };
  const mapped = details[code];
  return mapped ? communicationProblem(mapped.status, code, mapped.detail, correlationId, mapped.retryable === true) : problemFromError(error, correlationId);
}

export async function GET(request: Request, context: RouteContext) {
  const { access, response } = await getCommunicationAccess(request);
  if (response) return response;
  const { callId } = await context.params;
  try {
    const patientId = stringValue(new URL(request.url).searchParams.get('patientId'), 120) || undefined;
    const call = await getCommunicationCall(callId, access!.actor, patientId);
    return call ? communicationSuccess(call, access!.correlationId) : communicationProblem(404, 'CALL_NOT_FOUND', 'This call is not available in the current clinical context.', access!.correlationId);
  } catch (error) {
    return callProblemFromError(error, access!.correlationId);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { access, response } = await getCommunicationAccess(request);
  if (response) return response;
  const { callId } = await context.params;
  const body = await readRecord(request);
  const key = idempotencyKey(request, body);
  if (!key) return communicationProblem(400, 'IDEMPOTENCY_REQUIRED', 'A unique idempotency key is required before changing call state.', access!.correlationId);
  const action = stringValue(body?.action, 50);
  if (!isCommunicationCallAction(action)) return communicationProblem(400, 'CALL_ACTION_UNSUPPORTED', 'Use a supported call action.', access!.correlationId);
  try {
    const patientId = stringValue(new URL(request.url).searchParams.get('patientId'), 120) || undefined;
    const updated = await updateCommunicationCall({
      callId,
      actor: access!.actor,
      patientId,
      action,
      idempotencyKey: key,
      note: stringValue(body?.note, 4001) || undefined,
      dispositionCode: stringValue(body?.dispositionCode, 101) || undefined,
    });
    if (!updated) return communicationProblem(404, 'CALL_NOT_FOUND', 'This call is not available in the current clinical context.', access!.correlationId);
    if (updated.providerUnavailable) return communicationProblem(503, 'TELEPHONY_UNAVAILABLE', 'No approved telephony provider is configured. The requested call action was recorded without changing media state.', access!.correlationId, true);
    return communicationSuccess({ call: updated.call, replayed: updated.replayed }, access!.correlationId);
  } catch (error) {
    return callProblemFromError(error, access!.correlationId);
  }
}
