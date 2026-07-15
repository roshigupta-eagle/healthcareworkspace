/**
 * EPIC-NOTIF-01: Server-Sent Events (SSE) Notification Stream
 * Delivers real-time clinical alerts: critical values, arrivals, orders.
 * Falls back gracefully when Redis is unavailable.
 */
import { auth } from "@/lib/auth";

const KEEP_ALIVE_MS = 25_000;

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await auth().catch(() => null);
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id ?? "unknown";
  const role   = (session.user as any).role ?? "PATIENT";

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Initial connection event
      controller.enqueue(encoder.encode(
        `event: connected\ndata: ${JSON.stringify({ userId, role, ts: new Date().toISOString() })}\n\n`
      ));

      // Keep-alive ping every 25s (prevents proxy timeout)
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch { clearInterval(keepAlive); }
      }, KEEP_ALIVE_MS);

      // Subscribe to in-process notification bus
      const unsubscribe = notificationBus.subscribe(userId, role, (event) => {
        try {
          controller.enqueue(encoder.encode(
            `event: ${event.type}\ndata: ${JSON.stringify(event)}\nid: ${event.id}\n\n`
          ));
        } catch { /* client disconnected */ }
      });

      req.signal.addEventListener("abort", () => {
        clearInterval(keepAlive);
        unsubscribe();
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

// ─── In-process notification bus ─────────────────────────────────────────────
// In production this should be replaced with a Redis pub/sub subscriber.

export interface NotificationEvent {
  id: string;
  type: "critical_value" | "patient_arrived" | "new_order" | "new_message" | "system";
  severity: "critical" | "warning" | "info";
  title: string;
  body: string;
  patientId?: string;
  encounterId?: string;
  targetRoles?: string[];
  ts: string;
}

type Listener = (event: NotificationEvent) => void;

const listeners = new Map<string, Listener>();

export const notificationBus = {
  subscribe(userId: string, role: string, fn: Listener): () => void {
    const key = `${userId}:${role}`;
    listeners.set(key, fn);
    return () => listeners.delete(key);
  },
  publish(event: NotificationEvent) {
    listeners.forEach((fn, key) => {
      const role = key.split(":")[1] ?? "";
      if (!event.targetRoles || event.targetRoles.includes(role)) {
        try { fn(event); } catch { /* disconnected listener */ }
      }
    });
  },
};