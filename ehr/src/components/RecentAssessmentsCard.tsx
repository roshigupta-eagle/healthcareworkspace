"use client";

import React from 'react';
import Link from 'next/link';

export default function RecentAssessmentsCard({ patient }: { patient: any }) {
  const items = [
    ...(patient.notes || []),
    ...(patient.labResults || []),
    ...(patient.tests || []),
  ];

  return (
    <div className="bg-white rounded-lg p-4 border border-[#DDE7F0] shadow-sm">
      <h5 className="text-sm font-semibold">Recent Assessments</h5>
      <div className="mt-3 text-sm text-gray-700 space-y-2">
        {items.length ? items.slice(0,5).map((it:any) => (
          <div key={it.id || it.name} className="flex items-center justify-between">
            <div>
              <div className="font-medium">{it.name || it.author || it.title || 'Assessment'}</div>
              <div className="text-xs text-gray-500">{it.date || it.id}</div>
            </div>
            <div className="text-sm text-teal-600">View</div>
          </div>
        )) : <div className="text-sm text-gray-500">No recent assessments.</div>}
      </div>
    </div>
  );
}
