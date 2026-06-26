import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function RecordsPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const records = [
    { id: 'r1', date: '2026-06-01', type: 'Lab Result', summary: 'CBC — Normal' },
    { id: 'r2', date: '2026-05-20', type: 'Allergy', summary: 'Penicillin — Rash' },
    { id: 'r3', date: '2026-04-15', type: 'Medication', summary: 'Atorvastatin 20mg — Ongoing' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-sky-600">Health Records</h1>
          <p className="mt-1 text-sm text-gray-600">Your medical history, allergies, medications and results.</p>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-lg border border-gray-200 shadow-sm">
        <ul role="list" className="divide-y divide-gray-100">
          {records.map((r) => (
            <li key={r.id} className="px-4 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{r.type}</p>
                <p className="mt-1 text-sm text-gray-500">{r.summary}</p>
              </div>
              <div className="text-sm text-gray-500">
                <p>{r.date}</p>
                <a className="mt-2 inline-block text-sky-600 hover:underline" href="#">View</a>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
