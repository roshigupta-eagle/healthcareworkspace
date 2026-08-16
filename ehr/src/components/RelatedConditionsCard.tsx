"use client";

import React from 'react';
import Link from 'next/link';

export default function RelatedConditionsCard({ conditions, patientId }: { conditions: string[]; patientId: string }) {
  return (
    <div className="bg-white rounded-lg p-4 border border-[#DDE7F0] shadow-sm">
      <h5 className="text-sm font-semibold">Related Conditions</h5>
      <div className="mt-3 text-sm text-gray-700 space-y-2">
        {conditions.length ? conditions.map((c) => (
          <div key={c} className="flex items-center justify-between">
            <div>{c}</div>
            <Link href={`/dashboard/records/${patientId}/conditions/${encodeURIComponent(c)}`} className="text-teal-600 text-sm">Open</Link>
          </div>
        )) : <div className="text-sm text-gray-500">No related conditions recorded.</div>}
      </div>
    </div>
  );
}
