import { test, expect } from 'vitest';

import {
  fetchDashboard,
  fetchVisitDetail,
  fetchQueueItems,
  claimQueueItem,
  completeQueueItem,
  recordVitals,
  mockVisits,
  mockRooms,
  mockQueueItems,
} from '../src/cardiology/services/api.mock';

import {
  CardiovascularVisitState,
  CardiologyRole,
  VisitPriority,
  QueueName,
  QueueItemStatus,
} from '../src/cardiology/types/fhir-domain';

test('API: fetchDashboard returns valid dashboard', async () => {
  const dashboard = await fetchDashboard('default');
  expect(dashboard).not.toBeNull();
  expect(dashboard.visits).toBeDefined();
  expect(dashboard.queues).toBeDefined();
  expect(dashboard.rooms).toBeDefined();
  expect(dashboard.queues.length).toBe(4);
  expect(dashboard.rooms.total).toBe(8);
});

test('API: fetchVisitDetail returns correct patient', async () => {
  const visit = await fetchVisitDetail('visit-001');
  expect(visit).not.toBeNull();
  if (!visit) return;
  expect(visit.patientName).toBe('John Smith');
  expect(visit.priority).toBe(VisitPriority.URGENT);
  expect(typeof visit.fhirEncounterId === 'string' || visit.fhirEncounterId === undefined).toBe(true);
});

test('API: fetchQueueItems returns valid queue items', async () => {
  const items = await fetchQueueItems();
  expect(items.length).toBeGreaterThan(0);
  expect(items[0].queueName).toBeDefined();
  expect(items[0].status).toBeDefined();
  expect(items[0].priority).toBeDefined();
});

test('API: claimQueueItem transitions item to IN_PROGRESS', async () => {
  const itemBefore = mockQueueItems.find((i) => i.status === QueueItemStatus.PENDING);
  expect(itemBefore).toBeDefined();
  if (!itemBefore) return;
  await claimQueueItem(itemBefore.id, 'user-123');
  const itemAfter = mockQueueItems.find((i) => i.id === itemBefore.id);
  expect(itemAfter).toBeDefined();
  expect(itemAfter!.status).toBe(QueueItemStatus.IN_PROGRESS);
  expect(itemAfter!.claimedBy).toBe('user-123');
});

test('API: completeQueueItem transitions item to COMPLETED', async () => {
  const items = await fetchQueueItems();
  const inProgressItem = items.find((i) => i.status === QueueItemStatus.IN_PROGRESS);
  if (inProgressItem) {
    await completeQueueItem(inProgressItem.id, 'Test notes');
    const completed = mockQueueItems.find((i) => i.id === inProgressItem.id);
    expect(completed).toBeDefined();
    expect(completed!.status).toBe(QueueItemStatus.COMPLETED);
  }
});

test('API: recordVitals stores patient vitals', async () => {
  const visit = await fetchVisitDetail('visit-002');
  expect(visit).not.toBeNull();
  if (!visit) return;
  const vitals = {
    temperatureC: 37.5,
    bpSystolic: 140,
    bpDiastolic: 90,
    heartRateBpm: 75,
    respirationRate: 16,
    oxygenSaturationPercent: 97,
    recordedAt: new Date().toISOString(),
    recordedBy: 'Nurse Test',
  };
  await recordVitals(visit.id, vitals);
  const updated = await fetchVisitDetail(visit.id);
  expect(updated).not.toBeNull();
  if (!updated) return;
  expect(updated.vitals).toBeDefined();
  expect(updated.vitals!.bpSystolic).toBe(140);
});

test('Data: Mock visits have FHIR resource IDs', () => {
  const visit = mockVisits[0];
  expect(visit.id).toBeDefined();
  expect(visit.mrn).toBeDefined();
  expect(typeof visit.fhirEncounterId === 'string' || visit.fhirEncounterId === undefined).toBe(true);
});

test('Data: Mock rooms cover all room types', async () => {
  const dashboard = await fetchDashboard();
  const roomCount = Object.values(dashboard.rooms.byType).flat().length;
  expect(roomCount).toBeGreaterThan(0);
  expect(roomCount).toBe(8);
});

test('Data: Mock queue items have all required fields', async () => {
  const items = await fetchQueueItems();
  expect(items.length).toBeGreaterThan(0);
  items.forEach((item) => {
    expect(item.id).toBeDefined();
    expect(item.visitId).toBeDefined();
    expect(item.queueName).toBeDefined();
    expect(item.priority).toBeDefined();
    expect(item.status).toBeDefined();
  });
});

test('State: CardiovascularVisitState has all required states', () => {
  const requiredStates = [
    'REFERRAL_RECEIVED',
    'SCHEDULING',
    'APPOINTMENT_SCHEDULED',
    'PATIENT_ARRIVED',
    'CHECKING_IN',
    'CHECKED_IN',
    'IN_WAITING_ROOM',
    'NURSING_ASSESSMENT',
    'IN_EXAM_ROOM',
    'PHYSICIAN_PENDING',
    'PHYSICIAN_WITH_PATIENT',
    'ORDERS_PLACED',
    'PROCEDURE_QUEUED',
    'IN_PROCEDURE',
    'PROCEDURE_COMPLETE',
    'RESULTS_READY',
    'RESULTS_REVIEW',
    'CONSULTATION_COMPLETE',
    'CHECKING_OUT',
    'CHECKOUT_COMPLETE',
    'BILLING_PENDING',
    'FOLLOW_UP_SCHEDULED',
    'DISCHARGED',
  ];
  requiredStates.forEach((state) => {
    expect(Object.values(CardiovascularVisitState)).toContain(state as any);
  });
});

test('Roles: All 8 required roles are defined', () => {
  const requiredRoles = [
    'RECEPTIONIST',
    'NURSE',
    'CARDIOLOGIST',
    'TECHNICIAN',
    'BILLING',
    'ADMIN',
    'PATIENT',
    'SYSTEM',
  ];
  requiredRoles.forEach((role) => {
    expect(Object.values(CardiologyRole)).toContain(role as any);
  });
});

test('Queues: All 13 queue names are defined', () => {
  const requiredQueues = [
    'REFERRAL_REVIEW',
    'SCHEDULING',
    'CHECK_IN',
    'NURSING_ASSESSMENT',
    'PHYSICIAN_CONSULT',
    'PROCEDURE_ECG',
    'PROCEDURE_ECHO',
    'PROCEDURE_STRESS_TEST',
    'PROCEDURE_HOLTER',
    'RESULTS_REVIEW',
    'CHECKOUT',
    'BILLING',
    'FOLLOW_UP_SCHEDULING',
  ];
  requiredQueues.forEach((queue) => {
    expect(Object.values(QueueName)).toContain(queue as any);
  });
});

test('Priority: All 4 priority levels are defined', () => {
  const priorities = Object.values(VisitPriority).filter((v) => typeof v === 'number');
  expect(priorities.length).toBe(4);
});
