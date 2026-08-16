export type Role =
  | 'ADMIN'
  | 'DOCTOR'
  | 'NURSE'
  | 'PHARMACIST'
  | 'LAB_TECH'
  | 'RECEPTIONIST'
  | 'PCA'
  | 'PATIENT';

export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type Status = 'todo' | 'in_progress' | 'delegated' | 'completed' | 'overdue';

export interface User {
  id: string;
  name: string;
  role: Role;
  avatar?: string;
  email?: string;
}

export interface Patient {
  id: string;
  givenName: string;
  familyName: string;
  mrn?: string;
  dob?: string; // ISO date
  gender?: string;
}

export interface LabResult {
  id: string;
  test: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  date: string; // ISO
  abnormal?: boolean;
  high?: boolean;
  low?: boolean;
}

export interface TaskNote {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface TaskActivity {
  id: string;
  type: 'note' | 'status' | 'assignment' | 'system';
  detail: string;
  actorId?: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  patientId: string;
  patient?: Patient;
  assignedTo?: string | null;
  assignedToUser?: User | null;
  status: Status;
  priority: Priority;
  category?: string;
  dueAt?: string | null; // ISO
  createdAt: string;
  createdBy: string;
  relatedEncounterId?: string | null;
  relatedLabResultId?: string | null;
  updatedAt?: string;
  completedAt?: string;
  clinicalSeverity?: string | null;
  notes?: TaskNote[];
  activity?: TaskActivity[];
}

export type TabKey = 'all' | 'my' | 'delegated' | 'completed';

// Lightweight helpers
export function fullName(p: Patient) {
  return `${p.givenName} ${p.familyName}`;
}

export function isoDate(d: Date) {
  return d.toISOString();
}
