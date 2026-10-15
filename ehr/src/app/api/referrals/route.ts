import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { getPatientById } from '@/app/dashboard/records/mockPatients';
import { logAuditEvent } from '@/lib/audit';
import { canAccessTaskPatient } from '@/lib/doctorWorkStore';
import { resolveDoctorWorkspaceActor } from '@/lib/doctorWorkspaceAuth';
import { createReferral, listReferrals, type CreateReferralInput, type ReferralPriority } from '@/lib/referralStore';
import { getReferralWorkspace, type ReferralFilter, type ReferralSort, type ReferralWorkspaceFilters } from '@/lib/referralWorkspace';

export const dynamic = 'force-dynamic';

const FILTERS = new Set<ReferralFilter>(['all', 'needs-action', 'urgent', 'pending', 'awaiting-specialist', 'scheduled', 'overdue', 'completed']);
const SORTS = new Set<ReferralSort>(['most-urgent', 'newest', 'oldest', 'recently-updated', 'patient', 'due']);
const PRIORITIES = new Set<ReferralPriority>(['routine', 'high', 'urgent']);

function text(value: unknown, maximum = 240) {
  return typeof value === 'string' ? value.trim().slice(0, maximum) : '';
}

function queryFilters(request: Request): ReferralWorkspaceFilters {
  const params = new URL(request.url).searchParams;
  const filter = text(params.get('filter')) as ReferralFilter;
  const sort = text(params.get('sort')) as ReferralSort;
  const page = Number(params.get('page'));
  const pageSize = Number(params.get('pageSize'));
  return {
    q: text(params.get('q'), 160) || undefined,
    filter: FILTERS.has(filter) ? filter : undefined,
    sort: SORTS.has(sort) ? sort : undefined,
    patientId: text(params.get('patientId'), 160) || undefined,
    page: Number.isFinite(page) && page > 0 ? page : undefined,
    pageSize: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : undefined,
  };
}

function input(body: Record<string, unknown>, actor: { id: string; name: string }): CreateReferralInput {
  const priority = text(body.priority, 40) as ReferralPriority;
  return {
    patientId: text(body.patientId, 160),
    subject: text(body.subject, 500),
    serviceCode: text(body.serviceCode, 120) || undefined,
    specialty: text(body.specialty, 160) || undefined,
    destination: text(body.destination, 160) || undefined,
    priority: PRIORITIES.has(priority) ? priority : 'routine',
    dueAt: text(body.dueAt, 40) || undefined,
    note: text(body.note, 2000) || undefined,
    requester: { id: actor.id, name: actor.name },
  };
}

function validationError(value: CreateReferralInput) {
  if (!value.patientId || !value.subject || !value.specialty || !value.destination) return 'Patient, referral reason, specialty, and destination are required.';
  if (value.dueAt && Number.isNaN(Date.parse(value.dueAt))) return 'Due date is invalid.';
  return null;
}

export async function GET(request: Request) {
  const access = await resolveDoctorWorkspaceActor(request);
  if (access.response) return access.response;
  const snapshot = await getReferralWorkspace(access.actor!, queryFilters(request));
  await logAuditEvent({ agentId: access.actor!.id, entityType: 'ServiceRequest', action: 'R', outcome: 'success', description: 'Viewed referral worklist' });
  return NextResponse.json(snapshot, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
}

export async function POST(request: Request) {
  const access = await resolveDoctorWorkspaceActor(request);
  if (access.response) return access.response;
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    body = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return NextResponse.json({ error: 'Invalid referral request.' }, { status: 400 });
  }
  const value = input(body, access.actor!);
  const error = validationError(value);
  if (error) return NextResponse.json({ error }, { status: 400 });
  if (!getPatientById(value.patientId) || !canAccessTaskPatient(value.patientId, access.actor!)) return NextResponse.json({ error: 'You do not have access to the selected patient record. No referral was created.' }, { status: 403 });
  const idempotencyKey = request.headers.get('idempotency-key')?.trim();
  const id = idempotencyKey ? `ref-${createHash('sha256').update(idempotencyKey).digest('hex').slice(0, 24)}` : undefined;
  if (id) {
    const existing = (await listReferrals()).find((referral) => referral.id === id);
    if (existing) return NextResponse.json({ item: existing, reused: true });
  }
  try {
    const created = await createReferral({ ...value, id });
    await logAuditEvent({ agentId: access.actor!.id, entityType: 'ServiceRequest', entityId: created.id, action: 'C', outcome: 'success', description: 'Created referral request', detail: { patientId: created.patientId, priority: created.priority, specialty: created.specialty } });
    return NextResponse.json({ item: created, reused: false }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'The referral could not be created. No referral was sent to a destination.' }, { status: 500 });
  }
}
