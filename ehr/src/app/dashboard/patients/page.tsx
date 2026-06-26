import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function PatientsPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const role = session.user.role;
  if (role !== 'DOCTOR' && role !== 'ADMIN') redirect('/unauthorized');

  const patients = [
    { id: 'p1', name: 'John Doe', dob: '1980-02-10', mrn: 'MRN-001', lastVisit: '2026-05-02' },
    { id: 'p2', name: 'Maria Lopez', dob: '1992-11-30', mrn: 'MRN-102', lastVisit: '2026-06-01' },
    { id: 'p3', name: 'Aisha Khan', dob: '1975-08-19', mrn: 'MRN-210', lastVisit: '2026-04-22' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-sky-600">Patients</h1>
          <p className="mt-1 text-sm text-gray-600">Active patients assigned to your practice.</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            aria-label="Search patients"
            placeholder="Search patients by name or MRN"
            className="rounded-md border border-gray-200 px-3 py-2 text-sm w-72"
          />
          <a href="#" className="inline-flex items-center gap-2 rounded-md bg-sky-600 text-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-sky-500">New Patient</a>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">DOB</th>
              <th className="px-4 py-3 font-medium">MRN</th>
              <th className="px-4 py-3 font-medium">Last visit</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {patients.map((p) => (
              <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3">{p.name}</td>
                <td className="px-4 py-3">{p.dob}</td>
                <td className="px-4 py-3">{p.mrn}</td>
                <td className="px-4 py-3">{p.lastVisit}</td>
                <td className="px-4 py-3">
                  <a className="text-sky-600 hover:underline" href={`/dashboard/patients/${p.id}`}>Open</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
