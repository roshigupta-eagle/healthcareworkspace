import { DashboardSummary, UrgentAlert, AppointmentSummary } from '@/types/dashboard';

function delay<T>(value: T, ms = 300) {
  return new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const summary: DashboardSummary = {
    patientsToday: { total: 42, checkedIn: 12, seen: 8, remaining: 22 },
    waitingNow: { count: 6, longestWaitingMinutes: 34 },
    urgentAlerts: { total: 3, unacknowledged: 2, highestSeverity: 'urgent' },
    resultsToReview: { total: 7, critical: 1 },
    notesToSign: { draft: 5, unsigned: 2 },
    tasksDue: { dueToday: 9, overdue: 2 },
  };
  return delay(summary, 240);
}

export async function getUrgentAlerts(): Promise<UrgentAlert[]> {
  const now = new Date().toISOString();
  const alerts: UrgentAlert[] = [
    { id: 'a1', patientId: 'patient-001', patientName: 'John Smith', mrn: 'MRN001', age: 64, reason: 'Chest pain on exertion', severity: 'urgent', createdAt: now, assignedTo: 'Dr. Sarah Lee', acknowledged: false },
    { id: 'a2', patientId: 'patient-002', patientName: 'Emma Brown', mrn: 'MRN002', age: 54, reason: 'Hypotension', severity: 'critical', createdAt: now, assignedTo: null as any, acknowledged: false },
  ];
  return delay(alerts, 320);
}

export async function getAppointmentsToday(): Promise<AppointmentSummary[]> {
  const appointments: AppointmentSummary[] = [
    { id: 'ap1', time: new Date().toISOString(), patientId: 'patient-003', patientName: 'Sarah Jenkins', type: 'Follow-up', provider: 'Dr. Sarah Lee', status: 'Arrived', room: '101' },
    { id: 'ap2', time: new Date(Date.now() + 15 * 60000).toISOString(), patientId: 'patient-004', patientName: 'John Smith', type: 'Cardiology consult', provider: 'Dr. Sarah Lee', status: 'Scheduled', room: '102' },
    { id: 'ap3', time: new Date(Date.now() + 45 * 60000).toISOString(), patientId: 'patient-005', patientName: 'Emma Brown', type: 'Test review', provider: 'Dr. Sarah Lee', status: 'Scheduled', room: '103' },
  ];
  return delay(appointments, 240);
}

export async function getMyQueueItems(): Promise<any[]> {
  return delay([
    { id: 'q1', patientId: 'patient-006', patientName: 'Daniel Lee', type: 'Result review', priority: 'High', due: '2026-07-30T10:00:00Z' },
  ], 180);
}

export async function getActionCenterCounts() {
  return delay({ criticalResults: 1, abnormalResults: 4, unsignedNotes: 2, refills: 3, ordersAwaitingSignature: 2 }, 100);
}
