import { createCommunicationTask, type CommunicationPriority } from '@/lib/clinicalCommunicationStore';
import { communicationProblem, communicationSuccess, getCommunicationAccess, idempotencyKey, problemFromError, readRecord, stringValue } from '@/lib/communicationBff';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ conversationId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { access, response } = await getCommunicationAccess(request);
  if (response) return response;
  const body = await readRecord(request);
  const key = idempotencyKey(request, body);
  if (!key) return communicationProblem(400, 'IDEMPOTENCY_REQUIRED', 'A unique idempotency key is required before creating a task.', access!.correlationId);
  const { conversationId } = await context.params;
  const patientId = new URL(request.url).searchParams.get('patientId') || undefined;
  try {
    const task = await createCommunicationTask({ conversationId, patientId, actor: access!.actor, title: stringValue(body?.title, 240) || 'Follow up on communication', priority: ['routine', 'urgent', 'asap', 'stat'].includes(String(body?.priority)) ? String(body?.priority) as CommunicationPriority : 'routine', dueAt: stringValue(body?.dueAt, 80) || undefined, idempotencyKey: key });
    return task ? communicationSuccess(task, access!.correlationId, 201) : communicationProblem(404, 'CONVERSATION_NOT_FOUND', 'This conversation is not available in the current clinical context.', access!.correlationId);
  } catch (error) {
    return problemFromError(error, access!.correlationId);
  }
}
