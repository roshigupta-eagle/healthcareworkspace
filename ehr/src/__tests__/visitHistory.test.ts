import { describe, expect, it } from 'vitest';
import { buildVisitHistory } from '../lib/visitHistory';
import type { Patient } from '../app/dashboard/records/mockPatients';

const patient: Patient = {
  id: 'patient-test',
  name: 'Test Patient',
  dob: '1980-01-01',
  mrn: 'MRN-1',
  history: [{ id: 'enc-1', date: '2024-09-28', provider: 'Dr. Lee', reason: 'Annual review', status: 'Completed' }],
  upcoming: [
    {
      id: 'appt-completed',
      date: '2026-05-15T09:00:00.000Z',
      end: '2026-05-15T09:30:00.000Z',
      doctor: 'Dr. Chen',
      type: 'Follow-up',
      status: 'Completed',
      location: 'Primary Care Clinic',
      documentation: { status: 'signed', noteId: 'note-1', author: 'Dr. Chen', signedAt: '2026-05-15T09:52:00.000Z' },
      followUp: [{ id: 'task-1', title: 'Review home log', status: 'open' }],
    },
    {
      id: 'appt-cancelled',
      date: '2025-03-15T09:00:00.000Z',
      doctor: 'Dr. Chen',
      type: 'Consultation',
      status: 'Cancelled',
    },
    {
      id: 'appt-future',
      date: '2099-03-15T09:00:00.000Z',
      doctor: 'Dr. Chen',
      type: 'Follow-up',
      status: 'Scheduled',
    },
  ],
};

describe('buildVisitHistory', () => {
  it('keeps documented historical records and excludes future scheduled appointments', () => {
    const model = buildVisitHistory(patient.id, patient);

    expect(model.allItems.map((item) => item.id)).toEqual(['appointment-appt-completed', 'appointment-appt-cancelled', 'encounter-enc-1']);
    expect(model.summary.totalVisits).toBe(3);
    expect(model.summary.completedVisits).toBe(2);
    expect(model.summary.cancelledVisits).toBe(1);
    expect(model.summary.providersSeen).toBe(2);
    expect(model.summary.openFollowUps).toBe(1);
    expect(model.summary.lastVisit?.appointmentId).toBe('appt-completed');
  });

  it('filters by status and preserves documentation metadata', () => {
    const model = buildVisitHistory(patient.id, patient, { status: 'cancelled' });

    expect(model.items).toHaveLength(1);
    expect(model.items[0].lifecycle).toBe('cancelled');
    expect(buildVisitHistory(patient.id, patient).items[0].documentation.status).toBe('signed');
  });
});