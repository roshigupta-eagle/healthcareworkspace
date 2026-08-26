'use client';

import React, { useState, useEffect } from 'react';

export default function AllergyFormClient({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState<boolean>(defaultOpen);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => { if (defaultOpen) setOpen(true); }, [defaultOpen]);

  async function handleSubmit(form: FormData) {
    setSaving(true);
    try {
      const body: any = {
        patientId: 'patient-001',
        substance: { display: String(form.get('allergen') || '') },
        category: [String(form.get('type') || '').toLowerCase()],
        clinicalStatus: String(form.get('status') || 'active'),
        verificationStatus: String(form.get('source') || 'patient reported'),
        reactions: [{ manifestation: String(form.get('reaction') || ''), severity: String(form.get('severity') || '') }],
        recordedAt: new Date().toISOString(),
      };
      const res = await fetch('/api/allergies', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) {
        setSuccess('Allergy added');
      } else {
        setSuccess('Failed to save');
      }
    } catch (e) {
      setSuccess('Failed to save');
    }
    setSaving(false);
    setTimeout(()=>setSuccess(null),2000);
  }

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
        <form onSubmit={async (e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); await handleSubmit(fd); }} className="mt-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col text-sm">
              <span className="text-xs text-gray-600">Allergy Type</span>
              <select name="type" required className="mt-1 p-2 border rounded">
                <option>Medication</option>
                <option>Food</option>
                <option>Environmental</option>
                <option>Latex</option>
                <option>Other</option>
              </select>
            </label>

            <label className="flex flex-col text-sm">
              <span className="text-xs text-gray-600">Allergen Name</span>
              <input name="allergen" required className="mt-1 p-2 border rounded" placeholder="e.g. Penicillin" />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="flex flex-col text-sm">
              <span className="text-xs text-gray-600">Reaction</span>
              <input name="reaction" className="mt-1 p-2 border rounded" placeholder="Rash, Hives, Swelling" />
            </label>
            <label className="flex flex-col text-sm">
              <span className="text-xs text-gray-600">Severity</span>
              <select name="severity" className="mt-1 p-2 border rounded">
                <option>Mild</option>
                <option>Moderate</option>
                <option>Severe</option>
                <option>Life-Threatening</option>
              </select>
            </label>
            <label className="flex flex-col text-sm">
              <span className="text-xs text-gray-600">Onset Date</span>
              <input type="date" className="mt-1 p-2 border rounded" />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col text-sm">
              <span className="text-xs text-gray-600">Status</span>
              <select name="status" className="mt-1 p-2 border rounded">
                <option>active</option>
                <option>inactive</option>
                <option>resolved</option>
                <option>entered-in-error</option>
              </select>
            </label>
            <label className="flex flex-col text-sm">
              <span className="text-xs text-gray-600">Source</span>
              <select name="source" className="mt-1 p-2 border rounded">
                <option>patient reported</option>
                <option>clinician documented</option>
                <option>external record</option>
                <option>unknown</option>
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
