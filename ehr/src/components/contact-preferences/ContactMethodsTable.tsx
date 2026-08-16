import React from 'react';
import Link from 'next/link';

export type ContactMethod = {
  id: string;
  system: 'phone' | 'email' | 'postal' | 'other';
  value: string;
  use?: string;
  purpose?: string;
  verified?: boolean;
  lastUpdated?: string;
  status?: string;
};

export default function ContactMethodsTable({ methods }: { methods: ContactMethod[] }) {
  if (!methods || methods.length === 0) {
    return <div className="mt-4 text-sm text-gray-600">No contact methods recorded.</div>;
  }

  return (
    <div className="mt-4 divide-y divide-gray-100">
      {methods.map((m) => (
        <div key={m.id} className="py-3 flex items-center justify-between">
          <div className="flex items-start gap-4">
            <div className="w-10 flex-shrink-0">
              {m.system === 'phone' ? (
                <div className="w-10 h-10 rounded-md bg-[#F6F9FB] flex items-center justify-center">📞</div>
              ) : m.system === 'email' ? (
                <div className="w-10 h-10 rounded-md bg-[#F6F9FB] flex items-center justify-center">✉️</div>
              ) : (
                <div className="w-10 h-10 rounded-md bg-[#F6F9FB] flex items-center justify-center">🏠</div>
              )}
            </div>

            <div>
              <div className="text-sm font-semibold text-[#121A2D]">{m.value}</div>
              <div className="text-xs text-gray-500">{m.use ? `${m.use} • ${m.purpose ?? ''}` : m.purpose}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs text-gray-500">{m.verified ? <span className="text-emerald-700 font-semibold">Verified</span> : <span className="text-amber-700">Unverified</span>}</div>
            <div className="text-xs text-gray-400">{m.lastUpdated ? new Date(m.lastUpdated).toLocaleDateString() : '—'}</div>
            <div className="flex items-center gap-2">
              <Link href={`#`} className="text-sm text-teal-600">Edit</Link>
              <button className="text-sm text-gray-600">More</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
