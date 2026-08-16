import React from 'react';

export type ConsentRecord = {
  id: string;
  status: 'active' | 'inactive' | 'entered-in-error' | 'unknown';
  date?: string;
  source?: string;
  sharedWith?: string[];
  notes?: string;
  expiresAt?: string;
};

export default function ConsentCard({ consent }: { consent: ConsentRecord }) {
  return (
    <div className="bg-white rounded-2xl p-4 border shadow-sm">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-[#121A2D]">Consent for Communication</h4>
        <button className="text-sm text-teal-600">Manage</button>
      </div>

      <div className="mt-3 text-sm text-gray-700 space-y-2">
        <div className="flex justify-between"><div>Status</div><div className="font-medium">{consent.status}</div></div>
        <div className="flex justify-between"><div>Consent date</div><div className="font-medium">{consent.date ? new Date(consent.date).toLocaleString() : '—'}</div></div>
        <div className="flex justify-between"><div>Source</div><div className="font-medium">{consent.source ?? '—'}</div></div>
        <div className="flex justify-between"><div>Notes</div><div className="font-medium">{consent.notes ?? '—'}</div></div>
        {consent.expiresAt && (<div className="flex justify-between"><div>Expires</div><div className="font-medium">{new Date(consent.expiresAt).toLocaleDateString()}</div></div>)}
      </div>
    </div>
  );
}
