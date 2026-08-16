import React from 'react';

export default function CareGapHelpBanner({ onOpen }: { onOpen?: () => void }) {
  return (
    <div className="mt-6 p-4 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="text-sky-700 text-lg">ⓘ</div>
        <div>
          <div className="font-semibold text-sky-700">Need help closing gaps?</div>
          <button onClick={onOpen} className="text-sky-700 text-sm underline">View guidelines & recommendations →</button>
        </div>
      </div>
      <div className="hidden sm:block text-sky-700">📋</div>
    </div>
  );
}
