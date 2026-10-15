import { isCommunicationCallState, listCommunicationCalls, startCommunicationCall } from '@/lib/clinicalCommunicationStore';
import { communicationProblem, communicationSuccess, getCommunicationAccess, idempotencyKey, problemFromError, readRecord, stringValue } from '@/lib/communicationBff';
import { isCallProviderError } from '@/lib/communicationProviders';

export const dynamic = 'force-dynamic';

function callProblemFromError(error: unknown, correlationId: string) {
  if (isCallProviderError(error)) return communicationProblem(error.status, error.code, error.detail, correlationId, error.retryable);
  const code = error instanceof Error ? error.message : 'COMMUNICATION_FAILED';
  const details: Record<string, { status: number; detail: string; retryable?: boolean }> = {
    CALL_CURSOR_INVALID: { status: 400, detail: 'The call-history cursor is invalid. Refresh the list and try again.' },
    CALL_STATUS_INVALID: { status: 400, detail: 'Use one or more supported call statuses.' },
    CALL_DATE_INVALID: { status: 400, detail: 'Use an ISO-8601 date-time for from and to filters.' },
    CALL_DATE_RANGE_INVALID: { status: 400, detail: 'The from filter must be earlier than or equal to the to filter.' },
    CALL_LIMIT_INVALID: { status: 400, detail: 'Use a call-history limit from 1 through 100.' },
    CALL_TYPE_INVALID: { status: 400, detail: 'Use a supported audio or video call type.' },
    TELEHEALTH_PATIENT_PARTICIPANT_REQUIRED: { status: 422, detail: 'A patient video visit requires the verified patient to be an authorized participant.' },
    TELEHEALTH_PATIENT_RECIPIENT_REQUIRED: { status: 422, detail: 'A patient video visit must be directed to the verified patient rather than an organization or contact endpoint.' },
    TELEHEALTH_VISIT_CONTEXT_REQUIRED: { status: 422, detail: 'A patient video visit requires a verified Appointment or Encounter context.' },
    TELEHEALTH_ELIGIBILITY_UNAVAILABLE: { status: 503, detail: 'Patient-account, care-relationship, and visit eligibility are not configured for telehealth video.', retryable: false },
    CALL_STORE_UNAVAILABLE: { status: 503, detail: 'Call history is temporarily unavailable. No media-provider request was made.', retryable: true },
  };
  const mapped = details[code];
  return mapped ? communicationProblem(mapped.status, code, mapped.detail, correlationId, mapped.retryable === true) : problemFromError(error, correlationId);
}

function callStatuses(params: URLSearchParams) {
  const statuses = params.getAll('status').flatMap((value) => value.split(',')).map((value) => value.trim()).filter(Boolean);
  if (!statuses.every(isCommunicationCallState)) throw new Error('CALL_STATUS_INVALID');
  return statuses;
}

export async function GET(request: Request) {
  const { access, response } = await getCommunicationAccess(request);
  if (response) return response;
  const params = new URL(request.url).searchParams;
  try {
    const rawLimit = params.get('limit');
    const conversationId = stringValue(params.get('conversationId'), 160) || undefined;
    const page = await listCommunicationCalls(access!.actor, {
      patientId: stringValue(params.get('patientId'), 120) || undefined,
      ...(conversationId ? { conversationId } : {}),
      statuses: callStatuses(params),
      from: stringValue(params.get('from'), 80) || undefined,
      to: stringValue(params.get('to'), 80) || undefined,
      limit: rawLimit === null ? undefined : Number(rawLimit),
      cursor: stringValue(params.get('cursor'), 512) || undefined,
    });
    return communicationSuccess(page, access!.correlationId);
  } catch (error) {
    return callProblemFromError(error, access!.correlationId);
  }
}

export async function POST(request: Request) {
  const { access, response } = await getCommunicationAccess(request);
  if (response) return response;
  const body = await readRecord(request);
  const key = idempotencyKey(request, body);
  if (!key) return communicationProblem(400, 'IDEMPOTENCY_REQUIRED', 'A unique idempotency key is required before starting a call.', access!.correlationId);
  const conversationId = stringValue(body?.conversationId, 160);
  if (!conversationId) return communicationProblem(400, 'VALIDATION_FAILED', 'A conversation is required before starting a call.', access!.correlationId);
  const patientId = stringValue(body?.patientId, 120) || undefined;
  const callType = stringValue(body?.callType, 32) || undefined;
  const scopedPatientId = new URL(request.url).searchParams.get('patientId') || undefined;
  if (scopedPatientId && patientId !== scopedPatientId) return communicationProblem(422, 'PATIENT_CONTEXT_MISMATCH', 'The selected patient does not match this patient-scoped communication workspace.', access!.correlationId);
  try {
    const call = await startCommunicationCall({ actor: access!.actor, conversationId, patientId, recipientId: stringValue(body?.recipientId, 160) || undefined, callType: callType as 'audio' | 'video' | 'group_audio' | 'group_video' | undefined, idempotencyKey: key, correlationId: access!.correlationId });
    return call ? communicationSuccess(call, access!.correlationId, 201) : communicationProblem(404, 'CONVERSATION_NOT_FOUND', 'This conversation is not available in the current clinical context.', access!.correlationId);
  } catch (error) {
    return callProblemFromError(error, access!.correlationId);
  }
}
