"use client";

import React from 'react';

export default function ConcernTimeline({ events }: { events: any[] }) {
  if (!events || events.length === 0) return <div className="text-sm text-gray-500">No timeline events</div>;
  const sorted = [...events].sort((a,b)=> (new Date(b.date||b.id||0).getTime() - new Date(a.date||a.id||0).getTime()));
  return (
    <div className="space-y-3">
      {sorted.map((e:any, i:number)=> (
        <div key={e.id || i} className="flex items-start gap-3">
          <div className="w-10 text-xs text-gray-400">{e.date ? new Date(e.date).toLocaleDateString() : '—'}</div>
          <div className="flex-1 bg-gray-50 p-3 rounded-md">
            <div className="text-sm font-medium text-gray-900">{e.title || e.reason || e.name || 'Event'}</div>
            <div className="text-xs text-gray-500 mt-1">{e.author || e.provider || e.source || ''}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
