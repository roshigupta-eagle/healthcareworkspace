import React from 'react';

export default function FhirResourceInfoCard({ resource }: { resource: { resourceType: string; id: string; fhirVersion?: string; lastUpdated?: string } }) {
  return (
    <div className="bg-white rounded-2xl p-4 border shadow-sm text-sm">
      <div className="flex items-center justify-between">
        <h5 className="font-semibold text-[#121A2D]">FHIR Resource Info</h5>
        <a href="#" className="text-teal-600">View</a>
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
