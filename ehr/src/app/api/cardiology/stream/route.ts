import { fetchDashboard, mockQueueItems } from '@/cardiology/services/api.mock';
import { getCache, setCache } from '@/lib/cache';

const DEFAULT_INTERVAL = 3000;

function formatSSE(event: string, data: any) {
  return `event: ${event}\n` + `data: ${JSON.stringify(data)}\n\n`;
}

export async function GET() {
  const encoder = new TextEncoder();

  let intervalId: any = null;
  const stream = new ReadableStream({
    start(controller) {
      async function sendUpdate() {
        try {
          const dashKey = 'cardio_dashboard_v1';
          const queueKey = 'cardio_queue_v1';

          let dash = getCache(dashKey);
          if (!dash) {
            dash = await fetchDashboard();
            setCache(dashKey, dash, DEFAULT_INTERVAL);
          }

          let queue = getCache(queueKey);
          if (!queue) {
            queue = mockQueueItems;
            setCache(queueKey, queue, DEFAULT_INTERVAL);
          }

          const payload = { dashboard: dash, queueItems: queue };
          controller.enqueue(encoder.encode(formatSSE('update', payload)));
        } catch (err) {
          controller.enqueue(encoder.encode(formatSSE('error', { message: 'stream error' })));
        }
      }

      // initial
      sendUpdate().catch(() => {});

      intervalId = setInterval(() => {
        sendUpdate().catch(() => {});
      }, DEFAULT_INTERVAL);
    },
    cancel() {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
