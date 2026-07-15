import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";

// GET /api/audit?entityType=Patient&entityId=xxx&from=2026-01-01&limit=100
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const entityType = url.searchParams.get("entityType") ?? undefined;
  const entityId = url.searchParams.get("entityId") ?? undefined;
  const from = url.searchParams.get("from") ?? undefined;
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 500);

  try {
    const events = await prisma.auditEvent.findMany({
      where: {
        ...(entityType ? { entityType } : {}),
        ...(entityId ? { entityId } : {}),
        ...(from ? { recorded: { gte: new Date(from) } } : {}),
      },
      orderBy: { recorded: "desc" },
      take: limit,
      include: { agent: { select: { id: true, name: true, email: true, role: true } } },
    });

    // Log this audit query itself (meta-audit — PHIPA requirement)
    await logAuditEvent({
      agentId: session.user.id!,
      action: "R",
      outcome: "success",
      entityType: "AuditEvent",
      description: `Audit log query: entityType=${entityType ?? "*"} entityId=${entityId ?? "*"}`,
    });

    return NextResponse.json({ events, total: events.length });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[audit] GET error", err);
    return NextResponse.json({ error: "Failed to retrieve audit log" }, { status: 500 });
  }
}
