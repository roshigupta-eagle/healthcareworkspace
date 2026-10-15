import { NextResponse } from 'next/server';
import { logAuditEvent } from '@/lib/audit';
import { resolveDoctorWorkspaceActor } from '@/lib/doctorWorkspaceAuth';
import { getPatientById } from '@/app/dashboard/records/mockPatients';
import {
  ORDER_CATEGORIES,
  ORDER_PRIORITIES,
  createClinicalOrder,
  getOrderSnapshot,
  readOrders,
  type CreateOrderInput,
  type OrderCategory,
  type OrderFilters,
  type OrderPriority,
} from '@/lib/orderStore';

export const dynamic = 'force-dynamic';

function text(value: unknown, max = 240) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function category(value: unknown): OrderCategory | undefined {
  return ORDER_CATEGORIES.includes(value as OrderCategory) ? value as OrderCategory : undefined;
}

function priority(value: unknown): OrderPriority | undefined {
  return ORDER_PRIORITIES.includes(value as OrderPriority) ? value as OrderPriority : undefined;
}

function queryFilters(request: Request): OrderFilters {
  const params = new URL(request.url).searchParams;
  const categoryValue = category(params.get('category'));
  const priorityValue = priority(params.get('priority'));
  return {
    q: text(params.get('q'), 160) || undefined,
    category: categoryValue,
    status: text(params.get('status')) || undefined,
    priority: priorityValue,
    provider: text(params.get('provider'), 160) || undefined,
    destination: text(params.get('destination'), 160) || undefined,
    patientId: text(params.get('patientId'), 160) || undefined,
    dateFrom: text(params.get('dateFrom'), 40) || undefined,
    dateTo: text(params.get('dateTo'), 40) || undefined,
  };
}

function bodyInput(body: Record<string, unknown>): Omit<CreateOrderInput, 'patientId'> & { patientId: string } {
  const selectedCategory = category(body.category);
  const selectedPriority = priority(body.priority);
  return {
    patientId: text(body.patientId, 160),
    orderName: text(body.orderName, 160),
    orderCode: text(body.orderCode, 80) || undefined,
    category: (selectedCategory || text(body.category, 40)) as OrderCategory,
    priority: (selectedPriority || text(body.priority, 40)) as OrderPriority,
    orderingProvider: text(body.orderingProvider, 160),
    destination: text(body.destination, 160),
    destinationType: text(body.destinationType, 40) as CreateOrderInput['destinationType'],
    clinicalIndication: text(body.clinicalIndication, 500) || undefined,
    instructions: text(body.instructions, 1000) || undefined,
    specimenType: text(body.specimenType, 120) || undefined,
    collectionLocation: text(body.collectionLocation, 160) || undefined,
    bodySite: text(body.bodySite, 160) || undefined,
    laterality: text(body.laterality, 80) || undefined,
    contrast: text(body.contrast, 80) || undefined,
    requestedDate: text(body.requestedDate, 40) || undefined,
    idempotencyKey: text(body.idempotencyKey, 160) || undefined,
  };
}

function validate(input: CreateOrderInput) {
  if (!input.patientId || !input.orderName || !input.orderingProvider || !input.destination) return 'Patient, order, ordering clinician, and destination are required.';
  if (!input.clinicalIndication) return 'Clinical indication is required for a new order.';
  if (!ORDER_CATEGORIES.includes(input.category)) return 'Order category is invalid.';
  if (!ORDER_PRIORITIES.includes(input.priority)) return 'Order priority is invalid.';
  if (input.category === 'Laboratory' && !input.specimenType) return 'Specimen type is required for laboratory orders.';
  if (input.category === 'Imaging' && !input.bodySite) return 'Body site is required for imaging orders.';
  if (!['LIMS', 'RIS/PACS', 'Hospital service', 'Local'].includes(input.destinationType)) return 'Destination type is invalid.';
  return null;
}

export async function GET(request: Request) {
  const access = await resolveDoctorWorkspaceActor(request);
  if (access.response) return access.response;
  const snapshot = getOrderSnapshot(queryFilters(request));
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
    return NextResponse.json({ error: 'Invalid order request.' }, { status: 400 });
  }
  const input = bodyInput(body);
  const validationError = validate(input);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
  const patient = getPatientById(input.patientId);
  if (!patient) return NextResponse.json({ error: 'The selected patient record could not be found. No orphan order was created.' }, { status: 400 });
  try {
    if (body.confirmDuplicate !== true) {
      const normalizedName = input.orderName.toLowerCase();
      const recentDuplicate = (await readOrders()).find((order) => order.patientId === input.patientId && order.orderName.toLowerCase() === normalizedName && Date.parse(order.orderedAt) >= Date.now() - 24 * 60 * 60 * 1000 && !['completed', 'revoked', 'entered-in-error'].includes(order.fhirStatus));
      if (recentDuplicate) return NextResponse.json({ error: 'A recent open order for this patient and test already exists.', code: 'POTENTIAL_DUPLICATE', duplicates: [{ id: recentDuplicate.id, orderName: recentDuplicate.orderName, patientName: recentDuplicate.patientName, orderedAt: recentDuplicate.orderedAt, workflowStatus: recentDuplicate.workflowStatus }] }, { status: 409 });
    }
    const result = await createClinicalOrder(input, access.actor!, { name: patient.name, mrn: patient.mrn, birthDate: patient.dob });
    if (!result.reused) await logAuditEvent({ agentId: access.actor!.id, entityType: 'ServiceRequest', entityId: result.order.id, action: 'C', outcome: 'success', description: 'Created order draft in the Roshi order registry' });
    return NextResponse.json({ data: result.order, reused: result.reused }, { status: result.reused ? 200 : 201 });
  } catch {
    return NextResponse.json({ error: 'The order could not be saved. No order was submitted to a destination.' }, { status: 500 });
  }
}
