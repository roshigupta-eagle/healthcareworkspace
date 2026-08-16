'use client';

import React from 'react';

export default function FHIRExportClient({ bundle, filename = 'allergy-bundle.json' }: { bundle: any; filename?: string }) {
  const onDownload = () => {
    const data = JSON.stringify(bundle, null, 2);
    const blob = new Blob([data], { type: 'application/fhir+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mt-3">
      <button onClick={onDownload} className="px-3 py-2 bg-white border rounded text-teal-600 hover:bg-gray-50">Export FHIR JSON</button>
    </div>
  );
}
