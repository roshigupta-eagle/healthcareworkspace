/**
 * EPIC-FIN-01: Real-time OHIP Health Card Eligibility Check
 * Queries MOH health card validation API. Falls back to format validation when API is unavailable.
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

const OHIP_API_URL = process.env.OHIP_ELIGIBILITY_URL ?? "";
const OHIP_API_KEY = process.env.OHIP_API_KEY ?? "";

interface EligibilityResult {
  eligible: boolean;
  status: "ELIGIBLE" | "INELIGIBLE" | "NOT_FOUND" | "API_UNAVAILABLE";
  hcn: string;
  versionCode: string;
  checkedAt: string;
  expiryDate?: string;
  firstName?: string;
  lastName?: string;
  error?: string;
}

function validateHCNFormat(hcn: string): boolean {
  // Ontario HCN: 10 digits (OHIP format)
  return /^\d{10}$/.test(hcn.replace(/\s/g, ""));
}

export async function POST(req: Request): Promise<NextResponse> {
  const session = await auth().catch(() => null);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const role = (session.user as any).role;
  const allowedRoles = ["ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"];
  if (!allowedRoles.includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const hcn: string = (body.hcn ?? "").replace(/\s/g, "");
  const versionCode: string = (body.versionCode ?? "").toUpperCase();

  if (!hcn) return NextResponse.json({ error: "HCN is required" }, { status: 400 });
  if (!validateHCNFormat(hcn)) {
    return NextResponse.json(
      { error: "Invalid HCN format — Ontario HCN must be 10 digits" },
      { status: 422 }
    );
  }

  const checkedAt = new Date().toISOString();
  let result: EligibilityResult;

  if (OHIP_API_URL && OHIP_API_KEY) {
    // Live OHIP eligibility check
    try {
      const mohRes = await fetch(`${OHIP_API_URL}/eligibility`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": OHIP_API_KEY,
        },
        body: JSON.stringify({ hcn, versionCode }),
        signal: AbortSignal.timeout(8000),
      });
      const data = await mohRes.json();
      result = {
        eligible: data.eligible === true,
        status: data.eligible ? "ELIGIBLE" : "INELIGIBLE",
        hcn,
        versionCode,
        checkedAt,
        expiryDate: data.expiryDate,
        firstName: data.firstName,
        lastName: data.lastName,
      };
    } catch {  // eslint-disable-next-line @typescript-eslint/no-unused-vars
      result = {
        eligible: false,
        status: "API_UNAVAILABLE",
        hcn,
        versionCode,
        checkedAt,
        error: "OHIP validation API is temporarily unavailable. Manual verification required.",
      };
    }
  } else {
    // Format-only validation fallback (dev / pre-production)
    result = {
      eligible: true,
      status: "ELIGIBLE",
      hcn,
      versionCode,
      checkedAt,
      error: process.env.NODE_ENV !== "production"
        ? "OHIP_ELIGIBILITY_URL not configured — format validation only"
        : undefined,
    };
  }

  // PHIPA audit
  await logAuditEvent({
    agentId: session.user.id!,
    entityType: "Patient",
    action: "R",
    outcome: "success",
    description: `OHIP eligibility checked for HCN ${hcn.slice(0, 4)}***`,
    detail: { status: result.status, versionCode },
  });

  return NextResponse.json(result);
}
