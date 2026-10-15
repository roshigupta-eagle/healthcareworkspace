import { describe, expect, it } from 'vitest';
import { buildServiceRequest, filterOrders, type ClinicalOrder } from '@/lib/orderStore';

const orders: ClinicalOrder[] = [
  {
    id: 'order-1',
    version: 1,
    patientId: 'patient-1',
    patientName: 'Sarah Jenkins',
    patientMrn: '8839201',
    orderName: 'Hemoglobin A1c',
    orderCode: 'A1C',
    category: 'Laboratory',
    priority: 'Routine',
    orderedAt: '2026-08-28T09:22:00.000Z',
    orderingProvider: 'Dr. Aris Thorne',
    destination: 'Maple Health Laboratory',
    destinationType: 'LIMS',
    clinicalIndication: 'Diabetes monitoring',
    fhirStatus: 'active',
    workflowStatus: 'Awaiting Collection',
    transmission: { state: 'accepted', attempts: 1 },
    result: { status: 'no-result', reviewStatus: 'not-applicable' },
    nextStep: 'Collect specimen',
    history: [],
    createdBy: 'Dr. Aris Thorne',
    source: 'local',
    updatedAt: '2026-08-28T09:22:00.000Z',
  },
  {
    id: 'order-2',
    version: 1,
    patientId: 'patient-2',
    patientName: 'Michael Thompson',
    patientMrn: '9922100',
    orderName: 'Chest X-Ray',
    orderCode: 'XR-CHEST',
    category: 'Imaging',
    priority: 'Urgent',
    orderedAt: '2026-08-27T09:22:00.000Z',
    orderingProvider: 'Dr. Chen',
    destination: 'Toronto Diagnostic Imaging',
    destinationType: 'RIS/PACS',
    fhirStatus: 'completed',
    workflowStatus: 'Completed',
    transmission: { state: 'accepted', attempts: 1 },
    result: { status: 'final', reviewStatus: 'needs-review', resourceType: 'DiagnosticReport', resourceId: 'report-2' },
    nextStep: 'Review result',
    history: [],
    createdBy: 'Dr. Chen',
    source: 'local',
    updatedAt: '2026-08-27T09:22:00.000Z',
  },
];

describe('order store projections', () => {
  it('searches authorized order fields and filters by patient and category', () => {
    expect(filterOrders(orders, { q: '8839201' }).map((order) => order.id)).toEqual(['order-1']);
    expect(filterOrders(orders, { category: 'Imaging', status: 'completed' }).map((order) => order.id)).toEqual(['order-2']);
  });

  it('keeps FHIR order status and result status as separate concepts', () => {
    const resource = buildServiceRequest(orders[1]);
    expect(resource.status).toBe('completed');
    expect(orders[1].result.status).toBe('final');
    expect(orders[1].result.reviewStatus).toBe('needs-review');
    expect(resource.code.text).toBe('Chest X-Ray');
  });
});
