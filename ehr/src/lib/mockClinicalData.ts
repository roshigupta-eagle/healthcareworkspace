import {
  Task,
  User,
  Patient,
  LabResult,
  isoDate,
  TaskActivity,
} from './clinicalTypes';

const now = new Date();
const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const addDays = (d: Date, n: number) => {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
};

export const mockUsers: User[] = [
  { id: 'u1', name: 'Dr. A. Patel', role: 'DOCTOR', avatar: '' },
  { id: 'u2', name: 'Nurse J. Lee', role: 'NURSE', avatar: '' },
  { id: 'u3', name: 'Pharmacist R. Kim', role: 'PHARMACIST', avatar: '' },
];

export const mockPatients: Patient[] = [
  { id: 'p1', givenName: 'John', familyName: 'Doe', mrn: 'MRN-001', dob: '1978-04-12', gender: 'M' },
  { id: 'p2', givenName: 'Mary', familyName: 'Smith', mrn: 'MRN-002', dob: '1991-07-22', gender: 'F' },
  { id: 'p3', givenName: 'Carlos', familyName: 'Ramirez', mrn: 'MRN-003', dob: '1956-11-03', gender: 'M' },
];

export const mockLabResults: LabResult[] = [
  {
    id: 'r1',
    test: 'Hemoglobin',
    value: '7.9',
    unit: 'g/dL',
    referenceRange: '13.5 - 17.5',
    date: isoDate(addDays(startOfDay, -14)),
    abnormal: true,
    low: true,
  },
  {
    id: 'r2',
    test: 'Sodium',
    value: '139',
    unit: 'mmol/L',
    referenceRange: '135 - 145',
    date: isoDate(addDays(startOfDay, -7)),
    abnormal: false,
  },
];

const makeActivity = (text: string, actorId?: string): TaskActivity => ({
  id: String(Math.random()).slice(2, 8),
  type: 'system',
  detail: text,
  actorId: actorId,
  createdAt: isoDate(new Date()),
});

export const mockTasks: Task[] = [
  {
    id: 't1',
    title: 'Review abnormal lab results',
    patientId: 'p1',
    patient: mockPatients[0],
    assignedTo: 'u1',
    assignedToUser: mockUsers[0],
    status: 'todo',
    priority: 'high',
    category: 'Labs',
    dueAt: isoDate(startOfDay),
    createdAt: isoDate(addDays(startOfDay, -3)),
    createdBy: 'u2',
    relatedLabResultId: 'r1',
    notes: [
      { id: 'n1', authorId: 'u2', body: 'Flagged by lab tech. Needs clinician review.', createdAt: isoDate(addDays(startOfDay, -2)) },
    ],
    activity: [makeActivity('Task created by Nurse J. Lee', 'u2')],
  },

  {
    id: 't2',
    title: 'Sign visit note',
    patientId: 'p2',
    patient: mockPatients[1],
    assignedTo: 'u1',
    assignedToUser: mockUsers[0],
    status: 'in_progress',
    priority: 'critical',
    category: 'Documentation',
    dueAt: isoDate(addDays(startOfDay, 1)),
    createdAt: isoDate(addDays(startOfDay, -1)),
    createdBy: 'u2',
    notes: [],
    activity: [makeActivity('Draft note ready for signature', 'u2')],
  },

  {
    id: 't3',
    title: 'Medication refill request',
    patientId: 'p1',
    patient: mockPatients[0],
    assignedTo: 'u3',
    assignedToUser: mockUsers[2],
    status: 'delegated',
    priority: 'medium',
    category: 'Medications',
    dueAt: isoDate(addDays(startOfDay, 3)),
    createdAt: isoDate(addDays(startOfDay, -10)),
    createdBy: 'u1',
    notes: [],
    activity: [makeActivity('Patient requested refill via portal', 'u1')],
  },

  {
    id: 't4',
    title: 'Care plan review',
    patientId: 'p3',
    patient: mockPatients[2],
    assignedTo: 'u2',
    assignedToUser: mockUsers[1],
    status: 'todo',
    priority: 'low',
    category: 'Care Plan',
    dueAt: isoDate(addDays(startOfDay, 5)),
    createdAt: isoDate(addDays(startOfDay, -6)),
    createdBy: 'u1',
    notes: [],
    activity: [makeActivity('Assigned to nursing for review', 'u1')],
  },

  {
    id: 't5',
    title: 'Patient message: chest pain follow-up',
    patientId: 'p2',
    patient: mockPatients[1],
    assignedTo: 'u1',
    assignedToUser: mockUsers[0],
    status: 'todo',
    priority: 'high',
    category: 'Message',
    dueAt: isoDate(addDays(startOfDay, 0)),
    createdAt: isoDate(addDays(startOfDay, -2)),
    createdBy: 'u2',
    notes: [],
    activity: [makeActivity('Patient message received via portal', 'u2')],
  },
];
