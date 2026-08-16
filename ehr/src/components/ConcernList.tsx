"use client";

import React, { useState } from 'react';
import Link from 'next/link';

type Concern = { id: string; name: string; status?: string; firstNoted?: string | null; lastUpdated?: string | null; severity?: string | null; source?: string | null; context?: string | null };

export default function ConcernList({ patientId, concerns }: { patientId: string; concerns: Concern[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!concerns || concerns.length === 0) return <div className="text-sm text-gray-500">No active health concerns currently documented.</div>;

  return (
    <div className="space-y-2">
      {concerns.map((c) => (
        <div key={c.id} className="bg-gray-50 p-3 rounded-md flex items-center justify-between hover:bg-gray-100">
          <div className="flex items-start gap-3">
            <div>
              <div className="font-medium text-[#0F1724]">{c.name}</div>
              <div className="text-xs text-gray-500">{c.status || 'Active'} • First noted: {c.firstNoted || '—'}</div>
              {expanded === c.id && c.context && <div className="mt-2 text-sm text-gray-700">{c.context}</div>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/patients/${patientId}/conditions/${encodeURIComponent(c.name)}`} className="text-sm text-teal-600">Open</Link>
            <button onClick={() => setExpanded(expanded === c.id ? null : c.id)} className="text-sm text-gray-600">{expanded === c.id ? 'Collapse' : 'Details'}</button>
          </div>
        </div>
      ))}
    </div>
  );
}
