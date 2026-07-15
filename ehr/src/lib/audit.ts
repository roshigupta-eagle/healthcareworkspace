/**
 * EPIC-SEC-01: PHIPA-Compliant PHI Audit Logging
 *
 * Every PHI read, write, update, and delete MUST produce an AuditEvent.
 * This helper wraps Prisma with structured audit creation.
 * For FHIR-layer events, a companion function writes to the FHIR server.
 */
import { prisma } from "@/lib/prisma";

export type AuditAction = "C" | "R" | "U" | "D" | "E"; // Create/Read/Update/Delete/Execute
export type AuditOutcome = "success" | "failure" | "denied";

export interface AuditPayload {
  /** ID of the authenticated user performing the action */
  agentId: string;
  /** FHIR resource type or domain entity type (e.g. "Patient", "Observation") */
  entityType?: string;
  /** FHIR logical ID or DB primary key of the affected resource */
  entityId?: string;
  /** CRUD action */
  action: AuditAction;
  /** Outcome of the action */
  outcome: AuditOutcome;
  /** Optional: which data fields were accessed or changed */
  detail?: Record<string, unknown>;
  /** Short description for log readability */
  description?: string;
}

/**
 * Write a PHIPA audit event to the local database.
 * This is fire-and-forget — failures are logged but never thrown to callers.
 */
export async function logAuditEvent(payload: AuditPayload): Promise<void> {
  try {
    await prisma.auditEvent.create({
      data: {
        type: "rest",
        action: payload.action,
        outcome: payload.outcome,
        agentId: payload.agentId,
        entityType: payload.entityType ?? null,
        entityId: payload.entityId ?? null,
        detail: payload.detail
          ? { ...payload.detail, description: payload.description }
          : payload.description
          ? { description: payload.description }
          : undefined,
      },
    });
  } catch (err) {
    // Never block the caller — audit failure is logged to stderr
    // eslint-disable-next-line no-console
    console.error("[audit] Failed to write AuditEvent:", err);
  }
}

/**
 * Middleware-friendly wrapper for server actions.
 * Automatically catches outcome=failure when the wrapped fn throws.
 */
export async function withAudit<T>(
  payload: Omit<AuditPayload, "outcome">,
  fn: () => Promise<T>
): Promise<T> {
  try {
    const result = await fn();
    await logAuditEvent({ ...payload, outcome: "success" });
    return result;
  } catch (err) {
    await logAuditEvent({ ...payload, outcome: "failure", detail: { error: String(err) } });
    throw err;
  }
}
