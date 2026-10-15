import { communicationProblem, communicationSuccess, getCommunicationAccess } from '@/lib/communicationBff';
import { getCommunicationCall, getTelehealthMeetingContext } from '@/lib/clinicalCommunicationStore';
import { isTelehealthMeetingError, requestTelehealthMeetingJoin } from '@/lib/telehealthMeetingProvider';

export const dynamic = 'force-dynamic';
type RouteContext = { params: Promise<{ callId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { access, response } = await getCommunicationAccess(request);
  if (response) return response;
  const { callId } = await context.params;
  if (!callId.trim()) return communicationProblem(400, 'VALIDATION_FAILED', 'A call identifier is required.', access!.correlationId);
  try {
    const patientId = new URL(request.url).searchParams.get('patientId') || undefined;
    const meeting = await getTelehealthMeetingContext(callId, access!.actor, patientId);
    if (!meeting) return communicationProblem(404, 'CALL_NOT_FOUND', 'This call is not available in the current clinical context.', access!.correlationId);
    if (!meeting.eligible) return communicationProblem(409, meeting.code || 'TELEHEALTH_ELIGIBILITY_REQUIRED', meeting.detail || 'Telehealth eligibility must be verified before media access is granted.', access!.correlationId);
    const call = await getCommunicationCall(callId, access!.actor, patientId);
    if (!call?.controlPlaneCallId) return communicationProblem(409, 'MEDIA_JOIN_NOT_AVAILABLE', 'This call does not have a LiveKit control-plane session.', access!.correlationId);
    const localGuest = new URL(request.url).searchParams.get('localGuest') === 'true';
    if (localGuest && !meeting.localDemoAllowed) return communicationProblem(403, 'LOCAL_DEMO_FORBIDDEN', 'Synthetic local participants are not available for this telehealth visit.', access!.correlationId);
    const join = await requestTelehealthMeetingJoin({ actor: access!.actor, correlationId: access!.correlationId, callId: call.controlPlaneCallId, localGuest });
    return communicationSuccess({ join }, access!.correlationId);
  } catch (error) {
    if (isTelehealthMeetingError(error)) return communicationProblem(error.status, error.code, error.detail, access!.correlationId, error.retryable);
    return communicationProblem(503, 'MEDIA_JOIN_UNAVAILABLE', 'The local media service cannot be reached.', access!.correlationId, true);
  }
}
