import { describe, expect, it } from 'vitest';
import { canAccessTaskPatient, canActorUpdateTask, taskCanComplete } from '@/lib/doctorWorkStore';
import { mapToFhirTask } from '@/lib/tasksStore';
import type { ClinicalTask } from '@/types/clinicalTask';

function task(overrides: Partial<ClinicalTask> = {}): ClinicalTask {
  return { id: 'task-1', patientId: 'patient-001', title: 'Review care plan', category: 'Follow-up', priority: 'normal', status: 'requested', createdAt: '2026-08-25T12:00:00.000Z', ...overrides };
}

describe('clinical task workflow safety', () => {
  it('locks source-linked tasks and terminal states from generic completion', () => {
    expect(taskCanComplete(task())).toBe(true);
    expect(taskCanComplete(task({ relatedResources: [{ type: 'Observation', id: 'obs-1' }] }))).toBe(false);
    expect(taskCanComplete(task({ status: 'failed' }))).toBe(false);
    expect(taskCanComplete(task({ status: 'rejected' }))).toBe(false);
  });

  it('limits updates to the assigned actor unless elevated', () => {
    const assigned = task({ assignee: { id: 'doctor-1', name: 'Dr. Chen' } });
    expect(canActorUpdateTask(assigned, { id: 'doctor-1', name: 'Dr. Chen', role: 'DOCTOR' })).toBe(true);
    expect(canActorUpdateTask(assigned, { id: 'doctor-2', name: 'Dr. Lee', role: 'DOCTOR' })).toBe(false);
    expect(canActorUpdateTask(assigned, { id: 'admin-1', name: 'Admin', role: 'ADMIN' })).toBe(true);
  });

  it('maps patient and source references into the FHIR Task projection', () => {
    const projected = mapToFhirTask(task({ priority: 'urgent', dueDate: '2026-08-30T00:00:00.000Z', requester: { id: 'doctor-1', name: 'Dr. Chen' }, relatedResources: [{ type: 'DocumentReference', id: 'doc-1', display: 'Discharge summary' }] }));
    expect(projected.for).toEqual({ reference: 'Patient/patient-001' });
    expect(projected.focus).toEqual({ reference: 'DocumentReference/doc-1', display: 'Discharge summary' });
    expect(projected.status).toBe('requested');
    expect(projected.priority).toBe('stat');
    expect(projected.requester).toEqual({ reference: 'Practitioner/doctor-1', display: 'Dr. Chen' });
    expect(projected.restriction).toEqual({ period: { end: '2026-08-30T00:00:00.000Z' } });
    expect(projected.executionPeriod).toBeUndefined();
  });

  it('honors configured patient scope for non-elevated actors', () => {
    const previous = process.env.TASK_WORKSPACE_PATIENT_IDS;
    process.env.TASK_WORKSPACE_PATIENT_IDS = 'patient-001';
    try {
      expect(canAccessTaskPatient('patient-001', { id: 'doctor-1', name: 'Dr. Chen', role: 'DOCTOR' })).toBe(true);
      expect(canAccessTaskPatient('patient-002', { id: 'doctor-1', name: 'Dr. Chen', role: 'DOCTOR' })).toBe(false);
    } finally {
      if (previous === undefined) delete process.env.TASK_WORKSPACE_PATIENT_IDS;
      else process.env.TASK_WORKSPACE_PATIENT_IDS = previous;
    }
  });
});
