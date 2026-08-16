'use client';

import React, { useState, useEffect } from 'react';

export default function AllergyFormClient({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState<boolean>(defaultOpen);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => { if (defaultOpen) setOpen(true); }, [defaultOpen]);

  return (
    <div className="bg-white rounded-2xl p-6 border border-[#DDE7F0] shadow-sm">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold">Add Allergy</h4>
        <div className="flex items-center gap-2">
          <button onClick={() => setOpen(!open)} className="text-sm text-teal-600 underline">
            {open ? 'Close' : 'Open'}
          </button>
        </div>
      </div>

      {open && (
        <form onSubmit={(e) => { e.preventDefault(); setSaving(true); setTimeout(() => { setSaving(false); setSuccess('Allergy added'); setTimeout(()=>setSuccess(null),2000); }, 800); }} className="mt-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col text-sm">
              <span className="text-xs text-gray-600">Allergy type</span>
              <select required className="mt-1 p-2 border rounded">
                <option>Drug</option>
                <option>Food</option>
                <option>Environmental</option>
                <option>Latex</option>
                <option>Other</option>
              </select>
            </label>

            <label className="flex flex-col text-sm">
              <span className="text-xs text-gray-600">Allergen name</span>
              <input required className="mt-1 p-2 border rounded" placeholder="e.g. Penicillin" />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="flex flex-col text-sm">
              <span className="text-xs text-gray-600">Reaction</span>
              <input className="mt-1 p-2 border rounded" placeholder="Rash, hives, swelling" />
            </label>
            <label className="flex flex-col text-sm">
              <span className="text-xs text-gray-600">Severity</span>
              <select className="mt-1 p-2 border rounded">
                <option>Mild</option>
                <option>Moderate</option>
                <option>Severe</option>
                <option>Life-threatening</option>
              </select>
            </label>
            <label className="flex flex-col text-sm">
              <span className="text-xs text-gray-600">Onset date</span>
              <input type="date" className="mt-1 p-2 border rounded" />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col text-sm">
              <span className="text-xs text-gray-600">Status</span>
              <select className="mt-1 p-2 border rounded">
                <option>Active</option>
                <option>Inactive</option>
                <option>Resolved</option>
                <option>Entered in error</option>
              </select>
            </label>
            <label className="flex flex-col text-sm">
              <span className="text-xs text-gray-600">Source</span>
              <select className="mt-1 p-2 border rounded">
                <option>Patient reported</option>
                <option>Clinician documented</option>
                <option>External record</option>
                <option>Unknown</option>
              </select>
            </label>
          </div>

          <label className="flex flex-col text-sm">
            <span className="text-xs text-gray-600">Notes</span>
            <textarea className="mt-1 p-2 border rounded" rows={3} placeholder="Optional clinical notes" />
          </label>

          <div className="flex items-center gap-3">
            <button type="submit" className="px-4 py-2 bg-teal-600 text-white rounded" disabled={saving}>{saving ? 'Saving...' : 'Add Allergy'}</button>
            <button type="button" onClick={() => { setOpen(false); }} className="px-4 py-2 border rounded">Cancel</button>
            {success && <div className="text-sm text-green-700">{success}</div>}
          </div>
        </form>
      )}
    </div>
  );
}
