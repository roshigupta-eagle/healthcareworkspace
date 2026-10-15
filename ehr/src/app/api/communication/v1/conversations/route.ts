import { createCommunicationConversation, getCommunicationHubSnapshot, type CommunicationChannel, type CommunicationPriority } from '@/lib/clinicalCommunicationStore';
import { communicationProblem, communicationSuccess, getCommunicationAccess, idempotencyKey, problemFromError, readRecord, stringValue } from '@/lib/communicationBff';

export const dynamic = 'force-dynamic';

function attachmentIds(value: unknown): string[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  const ids = value.map((item) => typeof item === 'string' ? item.trim() : '');
  return ids.every((id) => id.length > 0 && id.length <= 160) ? ids : null;
}

export async function GET(request: Request) {
  const { access, response } = await getCommunicationAccess(request);
  if (response) return response;
  const params = new URL(request.url).searchParams;
  const snapshot = await getCommunicationHubSnapshot(access!.actor, { query: params.get('q') || '', folder: params.get('folder') || undefined, channel: params.get('channel') || undefined, patientId: params.get('patientId') || undefined });
  return communicationSuccess(snapshot, access!.correlationId);
}

export async function POST(request: Request) {
  const { access, response } = await getCommunicationAccess(request);
  if (response) return response;
  const body = await readRecord(request);
  const key = idempotencyKey(request, body);
  if (!key) return communicationProblem(400, 'IDEMPOTENCY_REQUIRED', 'A unique idempotency key is required before submitting a communication.', access!.correlationId);
  const patientId = stringValue(body?.patientId, 120) || undefined;
  const scopedPatientId = new URL(request.url).searchParams.get('patientId') || undefined;
  const recipientId = stringValue(body?.recipientId, 160);
  const subject = stringValue(body?.subject, 240);
  const bodyText = stringValue(body?.bodyText || body?.body, 20000);
  const category = stringValue(body?.category, 80) || 'General';
  const priority = ['routine', 'urgent', 'asap', 'stat'].includes(String(body?.priority)) ? String(body?.priority) as CommunicationPriority : 'routine';
  const channel = ['secure_message', 'email'].includes(String(body?.channel)) ? String(body?.channel) as CommunicationChannel : 'secure_message';
  const isInternalNote = body?.isInternalNote === true;
  const draftId = stringValue(body?.draftId, 160) || undefined;
  const issuedAttachmentIds = attachmentIds(body?.attachmentIds);
  if (scopedPatientId && patientId !== scopedPatientId) return communicationProblem(422, 'PATIENT_CONTEXT_MISMATCH', 'The selected patient does not match this patient-scoped communication workspace.', access!.correlationId);
  if ((!recipientId && !isInternalNote) || !subject || !bodyText) return communicationProblem(400, 'VALIDATION_FAILED', isInternalNote ? 'Subject and message text are required.' : 'Recipient, subject, and message text are required.', access!.correlationId);
  if (body?.attachments !== undefined || issuedAttachmentIds === null) return communicationProblem(400, 'VALIDATION_FAILED', 'Use server-issued attachment IDs when submitting a communication.', access!.correlationId);
  try {
    const created = await createCommunicationConversation({ actor: access!.actor, patientId, recipientId: recipientId || undefined, subject, bodyText, category, priority, channel, idempotencyKey: key, attachmentIds: issuedAttachmentIds, draftId, requiresAcknowledgement: body?.requiresAcknowledgement === true, isInternalNote });
    return communicationSuccess(created, access!.correlationId, 201);
  } catch (error) {
    return problemFromError(error, access!.correlationId);
  }
}
