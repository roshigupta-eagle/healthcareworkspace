import { describe, expect, it } from 'vitest';
import { getMockPatients } from '@/app/dashboard/records/mockPatients';
import { listDocuments, toFhirDocumentReference } from '@/lib/documentStore';
import { getOrderSnapshot, orderPatientReference } from '@/lib/orderStore';

describe('canonical Patient reference integrity', () => {
  it('keeps order and document subjects resolvable in the local directory', async () => {
    const patients = getMockPatients();
    const patientIds = new Set(patients.map((patient) => patient.id));
    const orders = getOrderSnapshot().data;
    expect(orders.filter((order) => order.patientId).every((order) => patientIds.has(order.patientId as string))).toBe(true);
    for (const patient of patients) {
      const documents = await listDocuments(patient.id, patient);
      expect(documents.every((document) => toFhirDocumentReference(document, patient).subject.reference === `Patient/${patient.id}`)).toBe(true);
    }
    expect(orders.filter((order) => order.patientId).every((order) => orderPatientReference(order) === `Patient/${order.patientId}`)).toBe(true);
  });
});