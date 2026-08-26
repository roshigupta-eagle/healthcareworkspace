import { NextResponse } from 'next/server';
import { logAuditEvent } from '@/lib/audit';
import { resolveDoctorWorkspaceActor } from '@/lib/doctorWorkspaceAuth';
import { createPatientRecord, findPotentialDuplicates, type CreatePatientInput } from '@/lib/patientRecordStore';
import { getHealthRecordsResponse } from '@/lib/healthRecords';
import { getMockPatients } from '@/app/dashboard/records/mockPatients';

export const dynamic = 'force-dynamic';

const SORTS = new Set(['clinical-priority', 'recently-updated', 'name', 'upcoming', 'last-seen']);

function text(value: unknown, max = 240) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function queryFilters(request: Request) {
  const params = new URL(request.url).searchParams;
  const sortValue = text(params.get('sort'));
  const pageSizeValue = Number(params.get('pageSize'));
  const pageValue = Number(params.get('page'));
  return {
    q: text(params.get('q'), 160) || undefined,
    status: text(params.get('status')) || undefined,
    risk: text(params.get('risk')) || undefined,
    appointment: params.get('appointment') === 'upcoming' ? 'upcoming' as const : undefined,
    pendingLab: params.get('pendingLab') === 'pending' ? 'pending' as const : undefined,
    careGap: params.get('careGap') === 'open' ? 'open' as const : undefined,
    attention: params.get('attention') === 'needs-attention' ? 'needs-attention' as const : undefined,
    criticalAlert: params.get('criticalAlert') === 'critical' ? 'critical' as const : undefined,
    physician: text(params.get('physician')) || undefined,
    organization: text(params.get('organization')) || undefined,
    sort: SORTS.has(sortValue) ? sortValue as 'clinical-priority' | 'recently-updated' | 'name' | 'upcoming' | 'last-seen' : undefined,
    page: Number.isFinite(pageValue) && pageValue > 0 ? pageValue : undefined,
    pageSize: Number.isFinite(pageSizeValue) && pageSizeValue > 0 ? pageSizeValue : undefined,
  };
}

function patientInput(body: Record<string, unknown>): CreatePatientInput {
  return {
    firstName: text(body.firstName, 80),
    middleName: text(body.middleName, 80) || undefined,
    lastName: text(body.lastName, 80),
    preferredName: text(body.preferredName, 80) || undefined,
    birthDate: text(body.birthDate, 40),
    gender: text(body.gender, 80),
    mrn: text(body.mrn, 80),
    phone: text(body.phone, 80) || undefined,
    email: text(body.email, 160) || undefined,
    preferredLanguage: text(body.preferredLanguage, 80) || undefined,
    preferredContactMethod: text(body.preferredContactMethod, 80) || undefined,
    primaryPhysician: text(body.primaryPhysician, 160) || undefined,
    organization: text(body.organization, 160) || undefined,
    insuranceProvider: text(body.insuranceProvider, 160) || undefined,
    insurancePlan: text(body.insurancePlan, 160) || undefined,
  };
}

function validatePatientInput(input: CreatePatientInput) {
  if (!input.firstName || !input.lastName || !input.birthDate || !input.gender || !input.mrn) return 'First name, last name, date of birth, gender, and MRN are required.';
  if (Number.isNaN(Date.parse(input.birthDate))) return 'Date of birth is invalid.';
  if (input.email && !/^\S+@\S+\.\S+$/.test(input.email)) return 'Email address is invalid.';
  return null;
}

export async function GET(request: Request) {
  const access = await resolveDoctorWorkspaceActor(request);
  if (access.response) return access.response;
  return NextResponse.json(getHealthRecordsResponse(queryFilters(request)), { headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
}

export async function POST(request: Request) {
  const access = await resolveDoctorWorkspaceActor(request);
  if (access.response) return access.response;
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    body = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return NextResponse.json({ error: 'Invalid patient record request.' }, { status: 400 });
  }
  const input = patientInput(body);
  const validationError = validatePatientInput(input);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
  const duplicates = findPotentialDuplicates(getMockPatients(), input);
  if (duplicates.length > 0 && body.confirmDuplicate !== true) {
    return NextResponse.json({ error: 'Potential duplicate patient record.', code: 'POTENTIAL_DUPLICATE', duplicates: duplicates.map((patient) => ({ patientId: patient.id, displayName: patient.name, birthDate: patient.dob, mrn: patient.mrn, status: patient.status || 'Unknown' })) }, { status: 409 });
  }
  const patient = await createPatientRecord(input, access.actor!.name);
  await logAuditEvent({ agentId: access.actor!.id, entityType: 'Patient', entityId: patient.id, action: 'C', outcome: 'success', description: 'Created patient record from Health Records' });
  return NextResponse.json({ data: patient }, { status: 201 });
}
