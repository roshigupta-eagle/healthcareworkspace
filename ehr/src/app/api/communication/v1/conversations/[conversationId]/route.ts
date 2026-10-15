import { appendCommunicationMessage, getCommunicationConversation, markCommunicationRead, resolveCommunicationConversation, type CommunicationChannel, type CommunicationPriority, type ConversationState } from '@/lib/clinicalCommunicationStore';
import { communicationProblem, communicationSuccess, getCommunicationAccess, idempotencyKey, problemFromError, readRecord, stringValue } from '@/lib/communicationBff';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ conversationId: string }> };

function attachmentIds(value: unknown): string[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  const ids = value.map((item) => typeof item === 'string' ? item.trim() : '');
  return ids.every((id) => id.length > 0 && id.length <= 160) ? ids : null;
}

export async function GET(request: Request, context: RouteContext) {
  const { access, response } = await getCommunicationAccess(request);
  if (response) return response;
  const { conversationId } = await context.params;
  const conversation = await getCommunicationConversation(conversationId, access!.actor);
  const scopedPatientId = new URL(request.url).searchParams.get('patientId') || undefined;
  return conversation && (!scopedPatientId || conversation.patientId === scopedPatientId) ? communicationSuccess(conversation, access!.correlationId) : communicationProblem(404, 'CONVERSATION_NOT_FOUND', 'This conversation is not available in the current clinical context.', access!.correlationId);
}

export async function POST(request: Request, context: RouteContext) {
  const { access, response } = await getCommunicationAccess(request);
  if (response) return response;
  const { conversationId } = await context.params;
  const body = await readRecord(request);
  const key = idempotencyKey(request, body);
  if (!key) return communicationProblem(400, 'IDEMPOTENCY_REQUIRED', 'A unique idempotency key is required before sending.', access!.correlationId);
  const bodyText = stringValue(body?.bodyText || body?.body, 20000);
  const recipientId = stringValue(body?.recipientId, 160) || undefined;
  const draftId = stringValue(body?.draftId, 160) || undefined;
  const scopedPatientId = new URL(request.url).searchParams.get('patientId') || undefined;
  const issuedAttachmentIds = attachmentIds(body?.attachmentIds);
  if (!bodyText || (body?.recipientId !== undefined && !recipientId)) return communicationProblem(400, 'VALIDATION_FAILED', 'Message text and a valid recipient are required.', access!.correlationId);
  if (body?.attachments !== undefined || issuedAttachmentIds === null) return communicationProblem(400, 'VALIDATION_FAILED', 'Use server-issued attachment IDs when submitting a communication.', access!.correlationId);
  try {
    const updated = await appendCommunicationMessage({ conversationId, actor: access!.actor, patientId: scopedPatientId, recipientId, bodyText, subject: stringValue(body?.subject, 240) || undefined, channel: ['secure_message', 'email'].includes(String(body?.channel)) ? String(body?.channel) as CommunicationChannel : 'secure_message', category: stringValue(body?.category, 80) || undefined, priority: ['routine', 'urgent', 'asap', 'stat'].includes(String(body?.priority)) ? String(body?.priority) as CommunicationPriority : undefined, idempotencyKey: key, attachmentIds: issuedAttachmentIds, draftId, isInternalNote: body?.isInternalNote === true, requiresAcknowledgement: body?.requiresAcknowledgement === true });
    return updated ? communicationSuccess(updated, access!.correlationId, 201) : communicationProblem(404, 'CONVERSATION_NOT_FOUND', 'This conversation is not available in the current clinical context.', access!.correlationId);
  } catch (error) {
    return problemFromError(error, access!.correlationId);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { access, response } = await getCommunicationAccess(request);
  if (response) return response;
  const { conversationId } = await context.params;
  const scopedPatientId = new URL(request.url).searchParams.get('patientId') || undefined;
  const body = await readRecord(request);
  const action = stringValue(body?.action, 50);
  try {
    if (action === 'read') {
      const updated = await markCommunicationRead(conversationId, access!.actor, scopedPatientId);
      return updated ? communicationSuccess(updated, access!.correlationId) : communicationProblem(404, 'CONVERSATION_NOT_FOUND', 'This conversation is not available in the current clinical context.', access!.correlationId);
    }
    const key = idempotencyKey(request, body);
    if (!key) return communicationProblem(400, 'IDEMPOTENCY_REQUIRED', 'A unique idempotency key is required before changing conversation state.', access!.correlationId);
    const state: ConversationState | undefined = action === 'resolve' ? 'resolved' : action === 'close' ? 'closed' : action === 'archive' ? 'archived' : undefined;
    if (!state) return communicationProblem(400, 'VALIDATION_FAILED', 'Use a supported conversation action.', access!.correlationId);
    const updated = await resolveCommunicationConversation(conversationId, access!.actor, state, key, scopedPatientId);
    return updated ? communicationSuccess(updated, access!.correlationId) : communicationProblem(404, 'CONVERSATION_NOT_FOUND', 'This conversation is not available in the current clinical context.', access!.correlationId);
  } catch (error) {
    return problemFromError(error, access!.correlationId);
  }
}
