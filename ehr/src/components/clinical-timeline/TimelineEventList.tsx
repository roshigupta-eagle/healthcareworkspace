'use client';
import React from 'react';

export function TimelineEventList({ events, onSelect }: { events: any[]; onSelect?: (id: string) => void }) {
  return (
    <div>
      {events.map(e => (
        <div key={e.id} style={{ padding: 8, borderBottom: '1px solid #eee' }} onClick={() => onSelect?.(e.id)}>
          <div style={{ fontWeight: 600 }}>{e.title}</div>
          <div style={{ fontSize: 12, color: '#666' }}>{e.eventType} — {new Date(e.occurredAt || e.recordedAt || 0).toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}

export default TimelineEventList;

