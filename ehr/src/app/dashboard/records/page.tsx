import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAllMockUsers } from '@/cardiology/services/api.mock';
import { getMockPatients } from './mockPatients';
import PatientCard from '@/components/PatientCard';

export default async function RecordsPage({ searchParams }: { searchParams?: Record<string, string | string[]> }) {
  const sp = await (searchParams as any);

  let session: any = null;
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    session = await auth();
  } catch (e) {
    // ignore — allow dev previews
  }

  // Support dev override via ?asUser=USER_ID (only outside production)
  if (!session && sp && sp.asUser && process.env.NODE_ENV !== 'production') {
    const override = Array.isArray(sp.asUser) ? sp.asUser[0] : sp.asUser;
    const all = getAllMockUsers();
    if (override && all[override]) {
      session = { user: { id: override, name: all[override].name, role: all[override].role } };
    }
  }

  if (!session) redirect('/login');

  const qRaw = sp?.q;
  const q = Array.isArray(qRaw) ? qRaw[0] : (qRaw || '');
  const allPatients = getMockPatients();
  const patients = q && String(q).trim() !== '' ? allPatients.filter((p) => ((p.name || '').toLowerCase().includes(String(q).toLowerCase()) || (p.mrn || '').includes(String(q)))) : allPatients;

  const totalPatients = patients.length;
  const upcomingAppointments = patients.reduce((acc, p) => acc + (p.upcoming?.length || 0), 0);
  const pendingLabs = patients.reduce((acc, p) => acc + (p.tests?.filter((t: any) => t.status === 'Pending').length || 0), 0);
  const criticalList = ['Hypertension', 'Type 2 Diabetes', 'Heart Failure', 'CAD', 'Asthma', 'Hyperlipidemia'];
  const criticalAlerts = patients.reduce((acc, p) => acc + ((p.conditions || []).some((c: string) => criticalList.includes(c)) ? 1 : 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-teal-700">Health Records</h1>
          <p className="mt-2 text-base text-gray-600">Manage and view comprehensive patient health profiles.</p>
        </div>
        <div className="flex items-center gap-3">
          <form method="get" className="flex items-center gap-3">
            <input name="q" defaultValue={q as string} placeholder="Search patients or MRN" className="px-4 py-2 border rounded-lg w-80 border-gray-200" />
            <button type="submit" className="inline-flex items-center gap-2 rounded-md bg-white border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50">Search</button>
          </form>
          <Link href="/dashboard/records/new" className="inline-flex items-center gap-2 rounded-md bg-teal-700 text-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-teal-600">New Record</Link>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <div className="text-sm text-gray-500">Patients</div>
          <div className="mt-1 text-2xl font-bold text-teal-700">{totalPatients}</div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <div className="text-sm text-gray-500">Upcoming Appointments</div>
          <div className="mt-1 text-2xl font-bold text-indigo-600">{upcomingAppointments}</div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <div className="text-sm text-gray-500">Pending Labs</div>
          <div className="mt-1 text-2xl font-bold text-amber-600">{pendingLabs}</div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <div className="text-sm text-gray-500">Critical Alerts</div>
          <div className="mt-1 text-2xl font-bold text-red-600">{criticalAlerts}</div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {patients.map((p) => (
          <PatientCard key={p.id} patient={p} />
        ))}
      </div>
    </div>
  );
}
