import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getAllMockUsers } from '@/cardiology/services/api.mock';
import { PageHeader } from '@/design-system';
import { Card, DataTable } from '@/design-system';
import AuditTableClient from './AuditTableClient';

// Simple mock audit events to present until a real audit store is wired
const mockEvents = [
  { id: 'e1', ts: new Date().toISOString(), user: 'system', action: 'System started' },
  { id: 'e2', ts: new Date().toISOString(), user: 'admin@example.com', action: 'Created user: ui-register+1@example.com' },
  { id: 'e3', ts: new Date().toISOString(), user: 'dr.chen@example.com', action: 'Claimed queue item: queue-item-002' },
];

export default async function AuditPage({ searchParams }: { searchParams?: Record<string, string | string[]> }) {
  let session: any = null;
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    session = await auth();
  } catch (e) {
    // ignore
  }

  // Allow dev override via ?asUser=ID
  if (!session && searchParams && searchParams.asUser && process.env.NODE_ENV !== 'production') {
    const override = Array.isArray(searchParams.asUser) ? searchParams.asUser[0] : searchParams.asUser;
    const all = getAllMockUsers();
    if (override && all[override]) session = { user: { id: override, name: all[override].name, role: all[override].role } };
  }

  if (!session) redirect('/login');
  if (session.user.role !== 'ADMIN') redirect('/unauthorized');

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <PageHeader title="Audit Log" subtitle="Recent system events and administrator actions." />   
      <Card>

        <AuditTableClient rows={mockEvents} />
      </Card>
    </div>
  );
}
