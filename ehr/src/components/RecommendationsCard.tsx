"use client";

import React from 'react';

export default function RecommendationsCard({ patient }: { patient?: { id: string } }) {
  const recs = [
    { id: 'r1', title: 'Prioritize medication reconciliation', priority: 'High', evidence: 'Medication list has >10 entries' },
    { id: 'r2', title: 'Schedule nephrology follow-up', priority: 'High', evidence: 'CKD Stage III' },
    { id: 'r3', title: 'Enroll in chronic disease management', priority: 'Medium', evidence: 'Multiple chronic conditions' },
  ];

  return (
    <div className="bg-white rounded-lg p-4 border border-[#DDE7F0] shadow-sm">
      <h5 className="text-sm font-semibold">Recommended Interventions</h5>
      <div className="mt-3 space-y-3 text-sm">
        {recs.map((r) => (
          <div key={r.id} className="flex items-start justify-between gap-3">
            <div>
              <div className="font-medium">{r.title}</div>
              <div className="text-xs text-gray-500">{r.evidence}</div>
            </div>
            <div className="text-right">
              <div className={`px-2 py-1 rounded text-xs font-semibold ${r.priority === 'High' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{r.priority}</div>
              <div className="mt-2"><button className="px-3 py-1 bg-white border rounded text-sm">Add to Plan</button></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
