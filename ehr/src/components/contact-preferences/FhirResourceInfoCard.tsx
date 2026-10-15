import React from 'react';
import Link from 'next/link';

export default function FhirResourceInfoCard({ resource }: { resource: { resourceType: string; id: string; fhirVersion?: string; lastUpdated?: string } }) {
  const href = resource.resourceType === 'Patient' ? `/dashboard/records/${encodeURIComponent(resource.id)}` : undefined;
  return (
    <div className="bg-white rounded-2xl p-4 border shadow-sm text-sm">
      <div className="flex items-center justify-between">
        <h5 className="font-semibold text-[#121A2D]">FHIR Resource Info</h5>
        {href ? <Link href={href} className="text-teal-600">View</Link> : <span className="text-slate-400">Source details</span>}
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex justify-between"><div>Resource</div><div className="font-medium">{resource.resourceType}</div></div>
        <div className="flex justify-between"><div>Resource ID</div><div className="font-medium">{resource.id}</div></div>
        <div className="flex justify-between"><div>FHIR Version</div><div className="font-medium">{resource.fhirVersion ?? 'R4'}</div></div>
        <div className="flex justify-between"><div>Last updated</div><div className="font-medium">{resource.lastUpdated ? new Date(resource.lastUpdated).toLocaleString() : '—'}</div></div>
      </div>
    </div>
  );
}
