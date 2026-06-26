import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardCard from "@/components/DashboardCard";
import LinkCard from '@/components/LinkCard';
import DashboardSummaryClient from '@/components/DashboardSummaryClient';
import { getAllMockUsers } from '@/cardiology/services/api.mock';

export default async function DashboardPage({ searchParams }: { searchParams?: Record<string, string | string[]> }) {
  let session: any = null;
  try {
    // Attempt to read real session
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    session = await auth();
  } catch (e) {
    // ignore — auth may not be available in some dev setups
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

  return (
    <>
      <h1 className="text-2xl font-bold text-blue-600">Welcome, {session.user.name}</h1>
      <p className="mt-2 text-gray-600">
        Role: <span className="font-medium capitalize">{role?.toLowerCase()}</span>
      </p>

      <DashboardSummaryClient />

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {role === "PATIENT" && (
          <>
            <div className="col-span-1">
              <LinkCard href="/dashboard/appointments" title="Upcoming Appointments" value="—" description="View or manage your upcoming visits" />
            </div>
            <div className="col-span-1">
              <DashboardCard title="Active Medications" value="—" />
            </div>
            <div className="col-span-1">
              <LinkCard href="/dashboard/records" title="Health Records" value="—" description="View your medications, allergies and results" />
            </div>
          </>
        )}
        {role === "DOCTOR" && (
          <>
            <div className="col-span-1">
              <LinkCard href="/dashboard/patients" title="Patients" value="—" description="Open patient list and records" />
            </div>
            <div className="col-span-1">
              <LinkCard href="/dashboard/encounters" title="Encounters" value="—" description="Open clinical encounters" />
            </div>
            <div className="col-span-1">
              <LinkCard href="/dashboard/orders" title="Orders" value="—" description="Review and manage orders" />
            </div>
          </>
        )}
        {role === "ADMIN" && (
          <>
            <div className="col-span-1">
              <LinkCard href="/admin/users" title="User Management" value="—" description="Manage users, roles and access" />
            </div>
            <div className="col-span-1">
              <LinkCard href="/dashboard/encounters" title="Encounters" value="—" description="View ongoing encounters" />
            </div>
            <div className="col-span-1">
              <LinkCard href="/admin/audit" title="Audit Log" value="—" description="Inspect audit events and logs" />
            </div>
          </>
        )}
      </div>
    </>
  );
}
