"use client";
/**
 * EPIC-NOTIF-01: Real-time notification bell — SSE-powered.
 */
import { useEffect, useRef, useState, useCallback } from "react";

interface NotificationEvent {
  id: string; type: string; severity: "critical" | "warning" | "info";
  title: string; body: string; ts: string;
}

const SEVERITY_CLASSES: Record<string, string> = {
  critical: "bg-red-600 text-white animate-pulse",
  warning:  "bg-amber-500 text-white",
  info:     "bg-sky-500 text-white",
};
const SEVERITY_BORDER: Record<string, string> = {
  critical: "border-l-4 border-red-500 bg-red-50",
  warning:  "border-l-4 border-amber-400 bg-amber-50",
  info:     "border-l-4 border-sky-400 bg-sky-50",
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);
  const [open, setOpen] = useState(false);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const unread = notifications.filter(n => !n.id.startsWith("read:")).length;

  useEffect(() => {
    const es = new EventSource("/api/notifications/stream");
    esRef.current = es;
    es.addEventListener("connected", () => setConnected(true));
    es.onerror = () => setConnected(false);
    const handleEvent = (e: MessageEvent) => {
      try {
        const ev: NotificationEvent = JSON.parse(e.data);
        setNotifications(prev => [ev, ...prev].slice(0, 50));
        if (ev.severity === "critical") {
          if (typeof window !== "undefined" && "Notification" in window && window.Notification.permission === "granted") {
            new window.Notification(ev.title, { body: ev.body, icon: "/favicon.ico" });
          }
        }
      } catch { /* malformed event */ }
    };
    ["critical_value","patient_arrived","new_order","new_message","system"].forEach(t =>
      es.addEventListener(t, handleEvent as EventListener)
    );
    return () => { es.close(); setConnected(false); };
  }, []);

  const clearAll = useCallback(() => setNotifications([]), []);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={`Notifications — ${unread} unread`}
        className="relative p-2 rounded-lg hover:bg-neutral-100 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-600 text-white text-xs font-bold px-1">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
        <span className={`absolute bottom-1 right-1 w-2 h-2 rounded-full ${connected ? "bg-green-400" : "bg-neutral-300"}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-neutral-200 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
            <span className="font-semibold text-neutral-900 text-sm">Notifications</span>
            <div className="flex gap-2 items-center">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${connected ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-500"}`}>
                {connected ? "Live" : "Offline"}
              </span>
              {notifications.length > 0 && (
                <button onClick={clearAll} className="text-xs text-neutral-400 hover:text-neutral-600">Clear</button>
              )}
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-neutral-100">
            {notifications.length === 0 && (
              <p className="text-sm text-neutral-400 text-center py-6">No notifications</p>
            )}
            {notifications.map((n) => (
              <div key={n.id} className={`px-4 py-3 ${SEVERITY_BORDER[n.severity] ?? ""}`}>
                <p className="font-medium text-sm text-neutral-900">{n.title}</p>
                <p className="text-xs text-neutral-600 mt-0.5">{n.body}</p>
                <p className="text-xs text-neutral-400 mt-1">{new Date(n.ts).toLocaleTimeString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}