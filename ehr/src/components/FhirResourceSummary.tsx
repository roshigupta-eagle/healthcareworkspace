"use client";

import React, { useState } from 'react';
import FHIRViewer from './FHIRViewer';

export default function FhirResourceSummary({ bundle }: { bundle: any }) {
  const [open, setOpen] = useState(false);
  const counts = {
    Patient: bundle?.entry?.filter((e: any) => e.resource?.resourceType === 'Patient').length || 0,
    Condition: bundle?.entry?.filter((e: any) => e.resource?.resourceType === 'Condition').length || 0,
    Observation: bundle?.entry?.filter((e: any) => e.resource?.resourceType === 'Observation').length || 0,
    DocumentReference: bundle?.entry?.filter((e: any) => e.resource?.resourceType === 'DocumentReference').length || 0,
  };

  return (
    <div>
      <div className="text-sm text-gray-700">
        <div>Patient: {counts.Patient}</div>
        <div>Conditions: {counts.Condition}</div>
        <div>Observations: {counts.Observation}</div>
        <div>Documents: {counts.DocumentReference}</div>
      </div>
      <div className="mt-3">
        <button onClick={() => setOpen((s)=>!s)} className="px-3 py-2 bg-white border rounded text-sm">{open ? 'Hide FHIR JSON' : 'View FHIR JSON'}</button>
      </div>
      {open && <div className="mt-3"><FHIRViewer data={bundle} /></div>}
    </div>
  );
}
