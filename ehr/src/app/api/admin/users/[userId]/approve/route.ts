/**
 * EPIC-SEC-02: Admin user approval — assigns role to PENDING users.
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { z } from "zod";

const approveSchema = z.object({
  role: z.enum(["DOCTOR","NURSE","PHARMACIST","LAB_TECH","RECEPTIONIST","BILLING","PCA","PATIENT","ADMIN"]),
});

export async function POST(req: Request, context: any) {
  const session = await auth().catch(() => null);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const params = context?.params && typeof context.params.then === "function" ? await context.params : context?.params ?? {};
  const { userId } = params as { userId: string };

  const body = await req.json().catch(() => ({}));
  const parsed = approveSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Valid role required", details: parsed.error.issues }, { status: 400 });

  try {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role: parsed.data.role as any },
      select: { id: true, email: true, name: true, role: true },
    });

    await logAuditEvent({
      agentId: session.user.id!,
      entityType: "User",
      entityId: userId,
      action: "U",
      outcome: "success",
      description: `Admin approved user ${updated.email} with role ${parsed.data.role}`,
      detail: { assignedRole: parsed.data.role },
    });

    return NextResponse.json({ message: "User approved", user: updated });
  } catch (err) {
    return NextResponse.json({ error: "User not found or update failed" }, { status: 404 });
  }
}

export async function DELETE(req: Request, context: any) {
  const session = await auth().catch(() => null);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const params = context?.params && typeof context.params.then === "function" ? await context.params : context?.params ?? {};
  const { userId } = params as { userId: string };

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { role: "PENDING" as any },
      select: { id: true },
    });
    await logAuditEvent({
      agentId: session.user.id!,
      entityType: "User",
      entityId: userId,
      action: "U",
      outcome: "success",
      description: "Admin rejected user registration",
    });
    return NextResponse.json({ message: "Registration rejected" });
  } catch {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
}