/**
 * EPIC-SAFE-01: Critical Lab Value Alert Ingestion Endpoint
 * LIMS/PharmacyMS POST here when a critical result is detected.
 * Publishes to the SSE notificationBus for real-time delivery to clinical staff.
 */
import { NextResponse } from "next/server";
import { notificationBus } from "@/app/api/notifications/stream/route";
import { z } from "zod";

const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN ?? "";

const alertSchema = z.object({
  patientFhirId: z.string(),
  patientName:   z.string().optional(),
  testName:      z.string(),
  value:         z.string(),
  unit:          z.string().optional(),
  referenceRange: z.string().optional(),
  interpretation: z.enum(["HH", "LL", "H", "L"]),
  orderId:       z.string().optional(),
  orderedBy:     z.string().optional(),   // FHIR practitioner ID
  reportedAt:    z.string().optional(),
});

export const runtime = "nodejs";

export async function POST(req: Request): Promise<NextResponse> {
  // Service-to-service auth
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (INTERNAL_TOKEN && token !== INTERNAL_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = alertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.issues }, { status: 400 });
  }
  const a = parsed.data;

  const severity = a.interpretation === "HH" || a.interpretation === "LL" ? "critical" : "warning";
  const label = a.interpretation === "HH" ? "CRITICAL HIGH" : a.interpretation === "LL" ? "CRITICAL LOW" : a.interpretation;

  const event = {
    id: crypto.randomUUID(),
    type:    "critical_value" as const,
    severity,
    title:   `${label}: ${a.testName}`,
    message: `${a.patientName ?? a.patientFhirId} — ${a.testName}: ${a.value}${a.unit ? " " + a.unit : ""}${a.referenceRange ? " (ref: " + a.referenceRange + ")" : ""}`,
    patientFhirId: a.patientFhirId,
    orderId:  a.orderId,
    targetRoles: ["DOCTOR", "NURSE", "ADMIN"],
    reportedAt: a.reportedAt ?? new Date().toISOString(),
  };

  try {
    notificationBus.publish(event);
  } catch {
    // Bus may not be initialized yet in some serverless contexts — log and continue
    console.error("[lab-alerts] notificationBus.publish failed");
  }

  return NextResponse.json({ received: true, eventId: event.id }, { status: 202 });
}