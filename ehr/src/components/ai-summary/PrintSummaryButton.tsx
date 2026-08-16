'use client';

import React from 'react';

export default function PrintSummaryButton() {
  function handlePrint() {
    window.print();
  }
  return (
    <button onClick={handlePrint} className="px-3 py-2 rounded bg-white border text-sm" aria-label="Print Summary">Print Summary</button>
  );
}
