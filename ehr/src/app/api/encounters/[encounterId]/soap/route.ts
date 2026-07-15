import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fhirCreate } from "@/lib/fhir-client";
import { logAuditEvent } from "@/lib/audit";

export async function POST(req: Request, context: any) {
  const session = await auth().catch(() => null);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "DOCTOR" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const params = context?.params && typeof context.params.then === "function" ? await context.params : context?.params ?? {};
  const { encounterId } = params as { encounterId: string };

  const body = await req.json().catch(() => ({}));
  const { subjective = "", objective = "", assessment = "", plan = "", practitionerName = "" } = body;

  const noteText = [
    `SUBJECTIVE\n${subjective}`,
    `OBJECTIVE\n${objective}`,
    `ASSESSMENT\n${assessment}`,
    `PLAN\n${plan}`,
  ].join("\n\n---\n\n");

  const encoded = Buffer.from(noteText, "utf-8").toString("base64");

  const docRef: Record<string, unknown> = {
    resourceType: "DocumentReference",
    status: "current",
    docStatus: "final",
    type: {
      coding: [{ system: "http://loinc.org", code: "11506-3", display: "Progress note" }],
    },
    context: { encounter: [{ reference: `Encounter/${encounterId}` }] },
    date: new Date().toISOString(),
    author: [{ display: practitionerName }],
    content: [{
      attachment: {
        contentType: "text/plain",
        data: encoded,
        title: "SOAP Progress Note",
        creation: new Date().toISOString(),
      },
    }],
    extension: [{
      url: "https://healthcareworkspace.ca/fhir/StructureDefinition/soap-sections",
      extension: [
        { url: "subjective", valueString: subjective },
        { url: "objective",  valueString: objective },
        { url: "assessment", valueString: assessment },
        { url: "plan",       valueString: plan },
      ],
    }],
  };

  try {
    const created = await fhirCreate("DocumentReference", docRef);
    await logAuditEvent({
      agentId: session.user.id!,
      entityType: "DocumentReference",
      entityId: (created as any).id ?? encounterId,
      action: "C",
      outcome: "success",
      description: "SOAP note created",
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    await logAuditEvent({ agentId: session.user.id!, entityType: "DocumentReference", entityId: encounterId, action: "C", outcome: "failure" });
    console.error("[soap] FHIR write error", err);
    return NextResponse.json({ error: "Failed to save note to FHIR server" }, { status: 502 });
  }
}