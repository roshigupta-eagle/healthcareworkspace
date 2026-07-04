import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { fetchDashboard, getAllMockUsers } from '@/cardiology/services/api.mock';
import { CardiovascularDashboard } from '@/cardiology/components/CardiovascularDashboard';
import { CardiologyRole } from '@/cardiology/types/fhir-domain';
import React from 'react';

export default async function DoctorPage({ searchParams }: { searchParams?: Record<string, string | string[]> }) {
  let session: any = null;
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    session = await auth();
  } catch (e) {
    // ignore — auth may be unavailable in some dev setups
  }

  // Support dev override via ?asUser=USER_ID (only outside production)
  if (!session && searchParams && searchParams.asUser && process.env.NODE_ENV !== 'production') {
    const override = Array.isArray(searchParams.asUser) ? searchParams.asUser[0] : searchParams.asUser;
    const all = getAllMockUsers();
    if (override && all[override]) {
      session = { user: { id: override, name: all[override].name, role: all[override].role } };
    }
  }

  if (!session) redirect('/login');
  const role = session.user.role;
  if (role !== 'DOCTOR' && role !== 'ADMIN') redirect('/unauthorized');

  const dashboard = await fetchDashboard();

  // Map application-level role names to cardiology domain roles
  const cardioRole = role === 'DOCTOR' ? CardiologyRole.CARDIOLOGIST : CardiologyRole.ADMIN;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{session.user.name}</h1>
          <p className="text-sm text-neutral-600">Overview of all</p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/doctor/patients" className="inline-flex items-center px-3 py-1.5 rounded-md bg-neutral-100 text-sm text-neutral-900 hover:bg-neutral-200">View Patients</Link>
          <Link href="/doctor/encounters" className="inline-flex items-center px-3 py-1.5 rounded-md bg-neutral-100 text-sm text-neutral-900 hover:bg-neutral-200">View Encounters</Link>
          <Link href="/doctor/orders" className="inline-flex items-center px-3 py-1.5 rounded-md bg-neutral-100 text-sm text-neutral-900 hover:bg-neutral-200">View Orders</Link>
          <Link href="/doctor/health-records" className="inline-flex items-center px-3 py-1.5 rounded-md bg-neutral-100 text-sm text-neutral-900 hover:bg-neutral-200">View Health Records</Link>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CardiovascularDashboard
            userId={session.user.id}
            userName={session.user.name}
            // types in the cardiology component accept CardiologyRole, which maps to the same strings
            userRole={cardioRole}
            dashboard={dashboard}
          />
        </div>

        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-neutral-800">Appointments</h3>
                <p className="mt-1 text-sm text-neutral-600">Open the full schedule and manage bookings.</p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <Link href="/dashboard/appointments" className="inline-flex items-center px-3 py-1.5 rounded-md bg-sky-600 text-white text-sm hover:bg-sky-700">Open Appointments</Link>
              <Link href="/dashboard/appointments#book" className="inline-flex items-center px-3 py-1.5 rounded-md bg-neutral-100 text-sm text-neutral-900 hover:bg-neutral-200">Book New</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
