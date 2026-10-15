import { getCommunicationDrafts, saveCommunicationDraft, type CommunicationPriority } from '@/lib/clinicalCommunicationStore';
import { communicationProblem, communicationSuccess, getCommunicationAccess, problemFromError, readRecord, stringValue } from '@/lib/communicationBff';

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
  const patientId = new URL(request.url).searchParams.get('patientId') || undefined;
  return communicationSuccess(await getCommunicationDrafts(access!.actor, patientId), access!.correlationId);
}

export async function POST(request: Request) {
  const { access, response } = await getCommunicationAccess(request);
  if (response) return response;
  const body = await readRecord(request);
  const bodyText = stringValue(body?.bodyText, 20000);
  const draftId = stringValue(body?.id, 160);
  const patientId = stringValue(body?.patientId, 120) || undefined;
  const scopedPatientId = new URL(request.url).searchParams.get('patientId') || undefined;
  if (!draftId) return communicationProblem(400, 'VALIDATION_FAILED', 'Draft ID is required.', access!.correlationId);
  if (scopedPatientId && patientId !== scopedPatientId) return communicationProblem(422, 'PATIENT_CONTEXT_MISMATCH', 'The draft patient context must match the selected patient.', access!.correlationId);
  const revision = body?.revision;
  if (typeof revision !== 'number' || !Number.isInteger(revision) || revision < 0) return communicationProblem(400, 'VALIDATION_FAILED', 'A non-negative draft revision is required.', access!.correlationId);
  const issuedAttachmentIds = attachmentIds(body?.attachmentIds);
  if (issuedAttachmentIds === null) return communicationProblem(400, 'VALIDATION_FAILED', 'Use server-issued attachment IDs when saving a draft.', access!.correlationId);
  try {
    const draft = await saveCommunicationDraft({ id: draftId, revision, actor: access!.actor, conversationId: stringValue(body?.conversationId, 160) || undefined, patientId, recipientId: stringValue(body?.recipientId, 160) || undefined, channel: ['secure_message', 'email'].includes(String(body?.channel)) ? String(body?.channel) as 'secure_message' | 'email' : 'secure_message', subject: stringValue(body?.subject, 240), bodyText, category: stringValue(body?.category, 80) || 'General', priority: ['routine', 'urgent', 'asap', 'stat'].includes(String(body?.priority)) ? String(body?.priority) as CommunicationPriority : 'routine', requiresAcknowledgement: body?.requiresAcknowledgement === true, isInternalNote: body?.isInternalNote === true, attachmentIds: issuedAttachmentIds });
    return communicationSuccess(draft, access!.correlationId, 200);
  } catch (error) {
    return problemFromError(error, access!.correlationId);
  }
}
