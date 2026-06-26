"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewEncounterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const patientName = (form.get('patientName') as string) || '';
    const patientDOB = (form.get('patientDOB') as string) || '';
    const mrn = (form.get('mrn') as string) || '';
    const chiefComplaint = (form.get('chiefComplaint') as string) || '';
    const priority = (form.get('priority') as string) || '';

    try {
      const res = await fetch('/api/cardiology/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientName, patientDOB, mrn, chiefComplaint, priority }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data?.error || 'Failed to create encounter');
        setLoading(false);
        return;
      }

      // Navigate back to encounters list which will fetch fresh data
      router.push('/dashboard/encounters');
    } catch (err) {
      setError('Failed to create encounter');
      setLoading(false);
    }
  }

  return (
    <main className="max-w-3xl">
      <h2 className="text-2xl font-bold text-sky-600 mb-4">New Encounter</h2>
      {error && <div className="p-3 mb-4 bg-red-50 text-red-700 rounded-md">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg shadow-sm">
        <div>
          <label className="block text-sm font-medium text-gray-700">Patient name</label>
          <input name="patientName" className="mt-1 block w-full rounded-md border px-3 py-2" required />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Date of birth</label>
          <input name="patientDOB" type="date" className="mt-1 block w-full rounded-md border px-3 py-2" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">MRN</label>
          <input name="mrn" className="mt-1 block w-full rounded-md border px-3 py-2" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Chief complaint</label>
          <textarea name="chiefComplaint" className="mt-1 block w-full rounded-md border px-3 py-2" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Priority</label>
          <select name="priority" defaultValue="NORMAL" className="mt-1 block w-full rounded-md border px-3 py-2">
            <option value="NORMAL">Normal</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button type="submit" disabled={loading} className="rounded-md bg-sky-600 text-white px-4 py-2">{loading ? 'Creating...' : 'Create Encounter'}</button>
          <button type="button" onClick={() => router.back()} className="rounded-md border px-4 py-2">Cancel</button>
        </div>
      </form>
    </main>
  );
}
