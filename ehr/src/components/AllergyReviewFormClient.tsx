'use client';

import React, { useState, useEffect } from 'react';

export default function AllergyReviewFormClient({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState<boolean>(defaultOpen);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => { if (defaultOpen) setOpen(true); }, [defaultOpen]);

  return (
    <div className="bg-white rounded-2xl p-6 border border-[#DDE7F0] shadow-sm">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold">Update Allergy Review</h4>
        <div>
          <button onClick={() => setOpen(!open)} className="text-sm text-teal-600 underline">{open ? 'Close' : 'Open'}</button>
        </div>
      </div>

      {open && (
        <form onSubmit={(e) => { e.preventDefault(); setSaving(true); setTimeout(() => { setSaving(false); setSuccess('Review saved'); setTimeout(()=>setSuccess(null),2000); }, 800); }} className="mt-4 space-y-3">
          <label className="flex flex-col text-sm">
            <span className="text-xs text-gray-600">Review status</span>
            <select required className="mt-1 p-2 border rounded">
              <option>No known allergies confirmed</option>
              <option>Allergy reported</option>
              <option>Unable to verify</option>
            </select>
          </label>

          <label className="flex flex-col text-sm">
            <span className="text-xs text-gray-600">Reviewed by</span>
            <input className="mt-1 p-2 border rounded" placeholder="Clinician name" />
          </label>

          <label className="flex flex-col text-sm">
            <span className="text-xs text-gray-600">Review date</span>
            <input type="date" className="mt-1 p-2 border rounded" />
          </label>

          <label className="flex flex-col text-sm">
            <span className="text-xs text-gray-600">Notes</span>
            <textarea className="mt-1 p-2 border rounded" rows={3} placeholder="Optional notes" />
          </label>

          <div className="flex items-center gap-3">
            <button type="submit" className="px-4 py-2 bg-teal-600 text-white rounded" disabled={saving}>{saving ? 'Saving...' : 'Save Review'}</button>
            <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 border rounded">Cancel</button>
            {success && <div className="text-sm text-green-700">{success}</div>}
          </div>
        </form>
      )}
    </div>
  );
}
