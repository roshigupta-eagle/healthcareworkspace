import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const role = session.user.role;

  return (
    <div className="min-h-screen flex">
      {/* Sidebar navigation */}
      <nav
        aria-label="Main navigation"
        className="w-64 bg-white border-r border-gray-200 p-4"
      >
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900">Healthcare EHR</h2>
          <p className="text-xs text-gray-500 mt-1">
            {session.user.name} &bull; {role}
          </p>
        </div>

        <ul className="space-y-1" role="list">
          <li>
            <Link
              href="/dashboard"
              className="block px-3 py-2 rounded-md text-sm font-medium text-gray-900 bg-gray-100"
              aria-current="page"
            >
              Dashboard
            </Link>
          </li>

          {/* Patient-visible links */}
          {(role === "PATIENT" || role === "DOCTOR" || role === "ADMIN") && (
            <>
              <li>
                <Link href="/dashboard/appointments" className="block px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-50">
                  Appointments
                </Link>
              </li>
              <li>
                <Link href="/dashboard/records" className="block px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-50">
                  Health Records
                </Link>
              </li>
            </>
          )}

          {/* Doctor-only links */}
          {(role === "DOCTOR" || role === "ADMIN") && (
            <>
              <li>
                <Link href="/dashboard/patients" className="block px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-50">
                  Patient List
                </Link>
              </li>
              <li>
                <Link href="/dashboard/encounters" className="block px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-50">
                  Encounters
                </Link>
              </li>
              <li>
                <Link href="/dashboard/orders" className="block px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-50">
                  Orders
                </Link>
              </li>
            </>
          )}

          {/* Admin-only links */}
          {role === "ADMIN" && (
            <>
              <li>
                <Link href="/admin/users" className="block px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-50">
                  User Management
                </Link>
              </li>
              <li>
                <Link href="/admin/audit" className="block px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-50">
                  Audit Log
                </Link>
              </li>
            </>
          )}
        </ul>
      </nav>

      {/* Main content */}
      <main id="main-content" className="flex-1 p-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, {session.user.name}
        </h1>
        <p className="mt-2 text-gray-600">
          Role: <span className="font-medium capitalize">{role?.toLowerCase()}</span>
        </p>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {role === "PATIENT" && (
            <>
              <DashboardCard title="Upcoming Appointments" value="—" />
              <DashboardCard title="Active Medications" value="—" />
              <DashboardCard title="Care Plans" value="—" />
            </>
          )}
          {role === "DOCTOR" && (
            <>
              <DashboardCard title="Today&apos;s Patients" value="—" />
              <DashboardCard title="Pending Orders" value="—" />
              <DashboardCard title="Open Encounters" value="—" />
            </>
          )}
          {role === "ADMIN" && (
            <>
              <DashboardCard title="Total Users" value="—" />
              <DashboardCard title="Active Encounters" value="—" />
              <DashboardCard title="Audit Events (24h)" value="—" />
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function DashboardCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}
