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

export default async function AuditPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[]>;
}) {
  const session = await auth().catch(() => null);
  if (!session) redirect("/login");
  if ((session as any).user?.role !== "ADMIN") redirect("/unauthorized");

  const rawFilter = searchParams?.entityType;
  const entityType = Array.isArray(rawFilter) ? rawFilter[0] : rawFilter;

  const events = await getAuditEvents(200);
  const filtered = entityType
    ? events.filter((e) => e.entityType === entityType)
    : events;

  const rows = filtered.map((e) => ({
    id: e.id,
    ts: e.recorded.toISOString(),
    user: (e.agent as any)?.email ?? e.agentId,
    role: (e.agent as any)?.role ?? "—",
    action: e.action,
    outcome: e.outcome,
    entityType: e.entityType ?? "—",
    entityId: e.entityId ?? "—",
    detail: JSON.stringify(e.detail ?? {}),
  }));

  const entityTypes = [...new Set(events.map((e) => e.entityType).filter(Boolean))];

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <PageHeader
        title="PHIPA Audit Log"
        subtitle={`${rows.length} events shown. All PHI access is logged immutably per PHIPA §12.`}
      />
      <Card>
        <AuditTableClient
          rows={rows}
          entityTypes={entityTypes as string[]}
          currentFilter={entityType}
        />
      </Card>
    </div>
  );
}
