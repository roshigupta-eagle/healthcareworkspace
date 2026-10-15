import { getCommunicationConversation, subscribeCommunicationEvents, type CommunicationEvent } from '@/lib/clinicalCommunicationStore';
import { getCommunicationAccess } from '@/lib/communicationBff';

export const dynamic = 'force-dynamic';

function eventLine(event: string, data: unknown, id?: string) {
  return `${id ? `id: ${id}\n` : ''}event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(request: Request) {
  const { access, response } = await getCommunicationAccess(request);
  if (response) return response;
  const patientId = new URL(request.url).searchParams.get('patientId') || undefined;
  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(eventLine('connected', { correlationId: access!.correlationId, generatedAt: new Date().toISOString() })));
      unsubscribe = subscribeCommunicationEvents((event: CommunicationEvent) => {
        void getCommunicationConversation(event.conversationId, access!.actor).then((conversation) => {
          if (!conversation) return;
          if (patientId && conversation.patientId !== patientId) return;
          if (event.messageId && !conversation.messages.some((message) => message.id === event.messageId)) return;
          controller.enqueue(encoder.encode(eventLine('communication.updated', { eventType: event.eventType, conversationId: event.conversationId, messageId: event.messageId, deliveryId: event.deliveryId, callId: event.callId, description: event.description }, event.id)));
        }).catch(() => {
          // A transient local-store read must not terminate the subscriber stream.
        });
      });
      heartbeat = setInterval(() => controller.enqueue(encoder.encode(': heartbeat\n\n')), 15_000);
      request.signal.addEventListener('abort', () => { unsubscribe?.(); if (heartbeat) clearInterval(heartbeat); try { controller.close(); } catch { /* stream already closed */ } }, { once: true });
    },
    cancel() {
      unsubscribe?.();
      if (heartbeat) clearInterval(heartbeat);
    },
  });
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-store', Connection: 'keep-alive', 'X-Correlation-ID': access!.correlationId } });
}
