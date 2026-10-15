import { getTelehealthMeetingContext } from '@/lib/clinicalCommunicationStore';
import { communicationProblem, communicationSuccess, getCommunicationAccess, stringValue } from '@/lib/communicationBff';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ callId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { access, response } = await getCommunicationAccess(request);
  if (response) return response;
  const { callId } = await context.params;
  if (!callId.trim()) return communicationProblem(400, 'VALIDATION_FAILED', 'A call identifier is required.', access!.correlationId);

  try {
    const patientId = stringValue(new URL(request.url).searchParams.get('patientId'), 120) || undefined;
    const meeting = await getTelehealthMeetingContext(callId, access!.actor, patientId);
    if (!meeting) return communicationProblem(404, 'CALL_NOT_FOUND', 'This call is not available in the current clinical context.', access!.correlationId);
    return communicationSuccess(meeting, access!.correlationId);
  } catch {
    return communicationProblem(503, 'TELEHEALTH_CONTEXT_UNAVAILABLE', 'Telehealth eligibility could not be verified. No media credential was issued.', access!.correlationId, true);
  }
}
