"use client";

import React, { useState } from 'react';
import FHIRViewer from './FHIRViewer';

export default function FHIRRiskExportClient({ bundle, filename = 'risk.json' }: { bundle: unknown; filename?: string }) {
  const [open, setOpen] = useState(false);

  function onDownload() {
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/fhir+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2">
        <button onClick={onDownload} className="px-3 py-2 bg-teal-600 text-white rounded">Download FHIR JSON</button>
        <button onClick={() => setOpen((s) => !s)} className="px-3 py-2 bg-white border rounded">{open ? 'Hide JSON' : 'View JSON'}</button>
      </div>
      {open && <div className="mt-3"><FHIRViewer data={bundle} /></div>}
    </div>
  );
}
