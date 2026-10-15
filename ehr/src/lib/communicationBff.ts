import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { resolveDoctorWorkspaceActor } from '@/lib/doctorWorkspaceAuth';
import type { CommunicationActor } from '@/lib/clinicalCommunicationStore';

export type CommunicationAccess = {
  actor: CommunicationActor;
  correlationId: string;
};

export async function getCommunicationAccess(request: Request): Promise<{ access?: CommunicationAccess; response?: NextResponse }> {
  const resolved = await resolveDoctorWorkspaceActor(request);
  if (resolved.response) return { response: resolved.response };
  const correlationId = request.headers.get('X-Correlation-ID')?.trim() || randomUUID();
  const actor = resolved.actor!;
  return { access: { actor: { id: actor.id, name: actor.name, role: actor.role }, correlationId } };
}

export function communicationSuccess<T>(data: T, correlationId: string, status = 200, warnings: Array<{ code: string; detail: string }> = []) {
  return NextResponse.json({ data, warnings, meta: { correlationId, generatedAt: new Date().toISOString(), projectionRevision: 'local-file-store' } }, { status, headers: { 'Cache-Control': 'private, no-store, max-age=0', 'X-Correlation-ID': correlationId } });
}

export function communicationProblem(status: number, code: string, detail: string, correlationId: string, retryable = false) {
  const type = `https://roshi.health/problems/${code.toLowerCase().replaceAll('_', '-')}`;
  return NextResponse.json({ type, title: code.replaceAll('_', ' ').toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase()), status, code, detail, retryable, correlationId }, { status, headers: { 'Cache-Control': 'no-store', 'X-Correlation-ID': correlationId, 'Content-Type': 'application/problem+json' } });
}

export function problemFromError(error: unknown, correlationId: string) {
  const code = error instanceof Error ? error.message : 'COMMUNICATION_FAILED';
  const details: Record<string, { status: number; detail: string; retryable?: boolean }> = {
    RECIPIENT_NOT_FOUND: { status: 422, detail: 'Choose a recipient from the authorized clinical directory.' },
    RECIPIENT_SELECTION_REQUIRED: { status: 422, detail: 'Choose one authorized recipient before replying to a multi-party conversation.' },
    CONVERSATION_NOT_FOUND: { status: 404, detail: 'The selected conversation is not available in the current clinical context.' },
    CONVERSATION_CLOSED: { status: 409, detail: 'Closed or archived conversations cannot accept new messages.' },
    MESSAGE_NOT_FOUND: { status: 404, detail: 'The referenced message is not available in the current clinical context.' },
    PATIENT_CONTEXT_MISMATCH: { status: 422, detail: 'The selected patient or clinical context does not match this communication.' },
    IDEMPOTENCY_REQUIRED: { status: 400, detail: 'A unique idempotency key is required for this command.' },
    IDEMPOTENCY_CONFLICT: { status: 409, detail: 'This idempotency key was already used with different communication content. Generate a new key before retrying.' },
    TELEPHONY_UNAVAILABLE: { status: 503, detail: 'No approved telephony provider is configured. The call attempt was recorded; use secure messaging or create a callback task.', retryable: true },
    ENDPOINT_UNAVAILABLE: { status: 503, detail: 'The destination endpoint is unavailable. The communication remains safely queued.', retryable: true },
    ATTACHMENT_NOT_SAFE: { status: 422, detail: 'Remove or replace attachments that have not passed safety validation.' },
    ATTACHMENT_NOT_FOUND: { status: 422, detail: 'One or more attachments were not issued for this communication. Attach the file again before sending.' },
    ATTACHMENT_NOT_OWNED: { status: 403, detail: 'You are not authorized to use one or more selected attachments.' },
    ATTACHMENT_ALREADY_USED: { status: 422, detail: 'An attachment can be submitted only once. Attach a new copy before sending again.' },
    ATTACHMENT_EXPIRED: { status: 422, detail: 'One or more attachment references expired. Attach the file again before sending.' },
    ATTACHMENT_INVALID: { status: 422, detail: 'Attachment identifiers must be unique, server-issued values.' },
    RECIPIENT_NOT_AUTHORIZED: { status: 403, detail: 'You are not authorized to communicate with this recipient in the selected context.' },
    ACKNOWLEDGEMENT_NOT_AUTHORIZED: { status: 403, detail: 'Only an addressed recipient can acknowledge a communication that requires acknowledgement.' },
    DELIVERY_NOT_FOUND: { status: 404, detail: 'No delivery record is available for this manual confirmation.' },
    DRAFT_NOT_OWNED: { status: 403, detail: 'You are not authorized to update this draft.' },
    DRAFT_ALREADY_SUBMITTED: { status: 409, detail: 'This draft was already submitted and cannot be saved again.' },
    DRAFT_VERSION_CONFLICT: { status: 409, detail: 'This draft changed in another save. Refresh the draft before saving again.' },
  };
  const mapped = details[code] || { status: 500, detail: 'The communication could not be completed. Retry using the saved draft.', retryable: true };
  return communicationProblem(mapped.status, code, mapped.detail, correlationId, mapped.retryable === true);
}

export async function readRecord(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const value: unknown = await request.json();
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

export function idempotencyKey(request: Request, body?: Record<string, unknown> | null) {
  return request.headers.get('Idempotency-Key')?.trim() || (typeof body?.idempotencyKey === 'string' ? body.idempotencyKey.trim() : '');
}

export function stringValue(value: unknown, maxLength = 10000) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

export function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean) : [];
}
