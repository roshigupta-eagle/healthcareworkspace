import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import LinkCard from '@/components/LinkCard';
import { PageHeader } from '@/design-system';
import { getAllMockUsers } from '@/cardiology/services/api.mock';

export default async function AdminPage({ searchParams }: { searchParams?: Record<string, string | string[]> }) {
  let session: any = null;
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    session = await auth();
  } catch (e) {
    // ignore
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
  if (session.user.role !== 'ADMIN') redirect('/unauthorized');

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <PageHeader title="Admin Console" subtitle="Manage users, audit logs and system settings." />

      <div className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="col-span-1">
          <LinkCard href="/admin/users" title="User Management" value="—" description="Manage users, roles and access" />
        </div>
        <div className="col-span-1">
          <LinkCard href="/admin/audit" title="Audit Log" value="—" description="Inspect audit events and logs" />
        </div>
      </div>
    </div>
  );
}
