export type AlertSeverity = 'info' | 'warning' | 'urgent' | 'critical';

export type UrgentAlert = {
  id: string;
  patientId: string;
  patientName: string;
  mrn?: string;
  age?: number;
  reason: string;
  severity: AlertSeverity;
  createdAt: string;
  assignedTo?: string;
  acknowledged?: boolean;
};

export type AppointmentSummary = {
  id: string;
  time: string; // ISO
  patientId: string;
  patientName: string;
  type: string;
  provider?: string;
  status?: string;
  room?: string;
};

export type DashboardSummary = {
  patientsToday: { total: number; checkedIn: number; seen: number; remaining: number };
  waitingNow: { count: number; longestWaitingMinutes?: number };
  urgentAlerts: { total: number; unacknowledged: number; highestSeverity?: AlertSeverity };
  resultsToReview: { total: number; critical: number };
  notesToSign: { draft: number; unsigned: number };
  tasksDue: { dueToday: number; overdue: number };
};
