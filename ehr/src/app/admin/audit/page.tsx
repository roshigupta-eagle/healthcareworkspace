import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card } from "@/design-system";
import AuditTableClient from "./AuditTableClient";

async function getAuditEvents(limit = 200) {
  try {
    return await prisma.auditEvent.findMany({
      orderBy: { recorded: "desc" },
      take: limit,
      include: {
        agent: { select: { id: true, name: true, email: true, role: true } },
      },
    });
  } catch {
    return [];
  }
}

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
