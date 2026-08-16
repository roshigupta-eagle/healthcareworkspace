"use client";

import React from 'react';

export default function CarePlanGoalsCard({ goals }: { goals: any[] }) {
  return (
    <div className="bg-white rounded-lg p-4 border border-[#DDE7F0] shadow-sm">
      <h5 className="text-sm font-semibold">Care Plan Goals</h5>
      <div className="mt-3 text-sm text-gray-700 space-y-2">
        {goals && goals.length ? goals.map((g:any) => (
          <div key={g.id || g.text} className="flex items-center justify-between">
            <div>
              <div className="font-medium">{g.text || g.title}</div>
              <div className="text-xs text-gray-500">Target: {g.target || '—'}</div>
            </div>
            <div className="text-sm text-gray-700">{g.status || 'in-progress'}</div>
          </div>
        )) : <div className="text-sm text-gray-500">No care plan goals found.</div>}
      </div>
    </div>
  );
}
