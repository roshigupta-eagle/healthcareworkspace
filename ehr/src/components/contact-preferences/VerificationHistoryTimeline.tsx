import React from 'react';

export type VerificationEvent = {
  id: string;
  timestamp: string;
  event: string;
  actor?: string;
  method?: string;
  result?: string;
  notes?: string;
};

export default function VerificationHistoryTimeline({ events }: { events: VerificationEvent[] }) {
  if (!events || events.length === 0) {
    return <div className="mt-3 text-sm text-gray-600">No verification events recorded.</div>;
  }

  return (
    <div className="mt-3 space-y-3">
      {events.map((e) => (
        <div key={e.id} className="flex items-start gap-3">
          <div className="w-10 text-xs text-gray-400">{new Date(e.timestamp).toLocaleString()}</div>
          <div className="flex-1 bg-gray-50 rounded-md p-3">
            <div className="text-sm font-semibold text-[#121A2D]">{e.event}</div>
            <div className="text-xs text-gray-500 mt-1">{e.method ? `${e.method} • ` : ''}{e.actor ?? 'System'}</div>
            {e.notes && <div className="mt-2 text-xs text-gray-700">{e.notes}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
