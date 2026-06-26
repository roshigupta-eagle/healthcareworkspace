import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getAllMockUsers } from '@/cardiology/services/api.mock';
import { PageHeader } from '@/design-system';
import { Card, CardTitle } from '@/design-system';
import UsersTableClient from './UsersTableClient';
import UsersActionsClient from './UsersActionsClient';

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session) redirect('/login');
  if (session.user.role !== 'ADMIN') redirect('/unauthorized');

  let users: Array<{ id: string; email?: string; name?: string; role?: string }> = [];
  try {
    users = await prisma.user.findMany({ select: { id: true, email: true, name: true, role: true } });
  } catch (err) {
    // Fallback to mock users when DB is unreachable (dev-friendly)
    const all = getAllMockUsers();
    users = Object.values(all).map((u: any) => ({ id: u.id ?? u.email, email: u.email, name: u.name, role: u.role }));
  }

  // Columns and render functions moved to a client component
  // to avoid passing functions from a server component to a client component.

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <PageHeader
        title="User Management"
        subtitle="Create, edit, and manage user accounts."
        actions={<UsersActionsClient />}
      />

      <div className="mt-2">
        <Card header={<CardTitle title={`Users (${users.length})`} subtitle="All user accounts" />}>
          <UsersTableClient rows={users} />
        </Card>
      </div>
    </div>
  );
}
