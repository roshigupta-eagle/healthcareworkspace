"use client";

import React from 'react';
import Link from 'next/link';

export default function RiskFactorsCard({ contributors, patient }: { contributors?: Array<{ factor: string; weight: number; impact: string }>; patient?: { id: string } }) {
  const rows = contributors || [];
  return (
    <div className="bg-white rounded-lg p-4 border border-[#DDE7F0] shadow-sm">
      <h5 className="text-sm font-semibold">Risk Contributors</h5>
      <div className="mt-3 text-sm text-gray-700">
        <div className="grid grid-cols-12 gap-2 text-xs text-gray-500 pb-2 border-b">
          <div className="col-span-6">Factor</div>
          <div className="col-span-3">Weight</div>
          <div className="col-span-3">Impact</div>
        </div>
        <div className="mt-2 space-y-2">
          {rows.map((r) => (
            <Link key={r.factor} href={`/dashboard/conditions/${encodeURIComponent(r.factor)}`} className="group block">
              <div className="grid grid-cols-12 gap-2 items-center py-2 rounded hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-200">
                <div className="col-span-6 font-medium text-sm">{r.factor}</div>
                <div className="col-span-3">{r.weight}%</div>
                <div className="col-span-3 text-sm text-gray-600">{r.impact}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
