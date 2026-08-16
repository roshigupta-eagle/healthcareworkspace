"use client";

import React from 'react';

export default function FHIRViewer({ data }: { data: unknown }) {
  const json = JSON.stringify(data, null, 2);

  function copy() {
    navigator.clipboard.writeText(json);
  }

  return (
    <div className="border border-[#E6EEF8] rounded bg-white p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium">FHIR Bundle</div>
        <div className="flex items-center gap-2">
          <button onClick={copy} className="px-2 py-1 bg-white border rounded text-sm">Copy</button>
          <a href={`data:application/fhir+json;charset=utf-8,${encodeURIComponent(json)}`} download={`bundle.json`} className="px-2 py-1 bg-white border rounded text-sm">Download</a>
        </div>
      </div>
      <pre className="text-xs leading-snug overflow-auto max-h-80 p-2 bg-[#0F1724] text-white rounded">{json}</pre>
    </div>
  );
}
