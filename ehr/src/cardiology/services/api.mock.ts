/**
 * Mock Cardiology API Service
 *
 * Development-friendly mock implementation of the cardiology practice API.
 * Provides realistic data generation and client-side state management.
 *
 * In production, replace these functions with HTTP calls to the actual backend.
 */

import {
  CardiologyDashboard,
  CardiovascularVisit,
  CardiovascularVisitState,
  QueueItem,
  QueueName,
  QueueItemStatus,
  QueueStats,
  CardiovascularRoom,
  RoomType,
  VisitPriority,
  DomainEvent,
  DomainEventType,
  CardiologyRole,
  VitalSigns,
  CardiovascularProcedureType,
  ProcedureStatus,
  User,
  TransitionRequest,
} from '../types/fhir-domain';

/**
 * Mock user database — in production, from auth provider
 */
const mockUsers: Record<string, User> = {
  'user-dr-chen': {
    id: 'user-dr-chen',
    tenantId: 'default',
    name: 'Dr. Alice Chen',
    role: CardiologyRole.CARDIOLOGIST,
    fhirPractitionerId: 'practitioner-001',
    email: 'chen@hospital.org',
    department: 'Cardiology',
  },
  'user-nurse-patel': {
    id: 'user-nurse-patel',
    tenantId: 'default',
    name: 'Nurse Ravi Patel',
    role: CardiologyRole.NURSE,
    email: 'patel@hospital.org',
    department: 'Cardiovascular Unit',
  },
  'user-receptionist-davis': {
    id: 'user-receptionist-davis',
    tenantId: 'default',
    name: 'Receptionist Sarah Davis',
    role: CardiologyRole.RECEPTIONIST,
    email: 'davis@hospital.org',
    department: 'Front Desk',
  },
  'user-tech-lee': {
    id: 'user-tech-lee',
    tenantId: 'default',
    name: 'ECG Tech James Lee',
    role: CardiologyRole.TECHNICIAN,
    email: 'lee@hospital.org',
    department: 'Diagnostic Services',
  },
  'user-billing-garcia': {
    id: 'user-billing-garcia',
    tenantId: 'default',
    name: 'Billing Specialist Maria Garcia',
    role: CardiologyRole.BILLING,
    email: 'garcia@hospital.org',
    department: 'Billing',
  },
  'user-admin-khan': {
    id: 'user-admin-khan',
    tenantId: 'default',
    name: 'Admin Fatima Khan',
    role: CardiologyRole.ADMIN,
    email: 'khan@hospital.org',
    department: 'Administration',
  },
};

/**
 * Mock patient visits — seed data
 */
const mockVisits: CardiovascularVisit[] = [
  {
    id: 'visit-001',
    tenantId: 'default',
    patientId: 'patient-001',
    patientName: 'John Smith',
    patientDOB: '1959-10-15',
    mrn: '123456',
    chiefComplaint: 'Chest pain on exertion',
    currentState: CardiovascularVisitState.IN_WAITING_ROOM,
    priority: VisitPriority.URGENT,
    currentRoomId: 'room-waiting',
    arrivedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    stateEnteredAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    isNewPatient: false,
    vitals: {
      temperatureC: 37.1,
      bpSystolic: 152,
      bpDiastolic: 88,
      heartRateBpm: 98,
      respirationRate: 18,
      oxygenSaturationPercent: 98,
      recordedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      recordedBy: 'Nurse Patel',
    },
    notes: 'Patient reports 3 days of substernal chest pain, worse with exertion',
  },
  {
    id: 'visit-002',
    tenantId: 'default',
    patientId: 'patient-002',
    patientName: 'Mary Johnson',
    patientDOB: '1965-05-22',
    mrn: '234567',
    chiefComplaint: 'Post-MI follow-up',
    currentState: CardiovascularVisitState.NURSING_ASSESSMENT,
    priority: VisitPriority.NORMAL,
    currentRoomId: 'room-exam-2',
    arrivedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    stateEnteredAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    isNewPatient: false,
    vitals: {
      temperatureC: 36.8,
      bpSystolic: 128,
      bpDiastolic: 76,
      heartRateBpm: 72,
      respirationRate: 16,
      oxygenSaturationPercent: 99,
      recordedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      recordedBy: 'Nurse Patel',
    },
  },
  {
    id: 'visit-003',
    tenantId: 'default',
    patientId: 'patient-003',
    patientName: 'Robert Davis',
    patientDOB: '1951-12-08',
    mrn: '345678',
    chiefComplaint: 'Echo for cardiomyopathy',
    currentState: CardiovascularVisitState.PROCEDURE_QUEUED,
    priority: VisitPriority.NORMAL,
    currentRoomId: 'room-echo',
    arrivedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    stateEnteredAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    isNewPatient: false,
    proceduresOrdered: [
      {
        id: 'proc-001',
        visitId: 'visit-003',
        procedureType: CardiovascularProcedureType.ECHO,
        status: ProcedureStatus.QUEUED,
        orderedBy: 'Dr. Chen',
        orderedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        technicianId: undefined,
        roomId: 'room-echo',
      },
    ],
  },
  {
    id: 'visit-004',
    tenantId: 'default',
    patientId: 'patient-004',
    patientName: 'Susan Chen',
    patientDOB: '1972-03-14',
    mrn: '456789',
    chiefComplaint: 'Palpitations / SVT referral',
    currentState: CardiovascularVisitState.REFERRAL_RECEIVED,
    priority: VisitPriority.HIGH,
    arrivedAt: undefined,
    isNewPatient: true,
  },
  {
    id: 'visit-005',
    tenantId: 'default',
    patientId: 'patient-005',
    patientName: 'William Brown',
    patientDOB: '1960-07-20',
    mrn: '567890',
    chiefComplaint: 'New-onset atrial fibrillation from ED',
    currentState: CardiovascularVisitState.PHYSICIAN_WITH_PATIENT,
    priority: VisitPriority.HIGH,
    currentRoomId: 'room-exam-1',
    assignedPhysicianId: 'user-dr-chen',
    assignedPhysicianName: 'Dr. Chen',
    arrivedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    stateEnteredAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    isNewPatient: false,
    vitals: {
      temperatureC: 37.0,
      bpSystolic: 156,
      bpDiastolic: 92,
      heartRateBpm: 112,
      respirationRate: 20,
      oxygenSaturationPercent: 97,
      recordedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      recordedBy: 'Nurse Patel',
    },
  },
];

/**
 * Mock rooms
 */
const mockRooms: CardiovascularRoom[] = [
  {
    id: 'room-waiting',
    tenantId: 'default',
    roomNumber: 'Waiting Room',
    roomType: RoomType.WAITING_ROOM,
    capacity: 20,
    currentOccupancy: 5,
    occupantNames: ['Smith, John', 'Johnson, Mary', 'Brown, William'],
    isAvailable: true,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'room-checkin-1',
    tenantId: 'default',
    roomNumber: 'Check-in Desk 1',
    roomType: RoomType.CHECK_IN_DESK,
    capacity: 1,
    currentOccupancy: 0,
    occupantNames: [],
    isAvailable: true,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'room-checkin-2',
    tenantId: 'default',
    roomNumber: 'Check-in Desk 2',
    roomType: RoomType.CHECK_IN_DESK,
    capacity: 1,
    currentOccupancy: 1,
    occupantNames: ['Receptionist Davis'],
    isAvailable: false,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'room-exam-1',
    tenantId: 'default',
    roomNumber: 'Exam Room 1',
    roomType: RoomType.EXAM_ROOM,
    capacity: 2,
    currentOccupancy: 2,
    occupantNames: ['Brown, William', 'Dr. Chen'],
    isAvailable: false,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'room-exam-2',
    tenantId: 'default',
    roomNumber: 'Exam Room 2',
    roomType: RoomType.EXAM_ROOM,
    capacity: 2,
    currentOccupancy: 2,
    occupantNames: ['Johnson, Mary', 'Nurse Patel'],
    isAvailable: false,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'room-exam-3',
    tenantId: 'default',
    roomNumber: 'Exam Room 3',
    roomType: RoomType.EXAM_ROOM,
    capacity: 2,
    currentOccupancy: 0,
    occupantNames: [],
    isAvailable: true,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'room-ecg',
    tenantId: 'default',
    roomNumber: 'ECG Room',
    roomType: RoomType.ECG_ROOM,
    capacity: 1,
    currentOccupancy: 1,
    occupantNames: ['Tech Lee'],
    isAvailable: false,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'room-echo',
    tenantId: 'default',
    roomNumber: 'Echo Lab',
    roomType: RoomType.ECHO_LAB,
    capacity: 2,
    currentOccupancy: 0,
    occupantNames: [],
    isAvailable: true,
    lastUpdated: new Date().toISOString(),
  },
];

/**
 * Mock queue items
 */
const mockQueueItems: QueueItem[] = [
  {
    id: 'queue-item-001',
    queueName: QueueName.NURSING_ASSESSMENT,
    visitId: 'visit-002',
    patientName: 'Mary Johnson',
    priority: VisitPriority.NORMAL,
    status: QueueItemStatus.IN_PROGRESS,
    createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    claimedBy: 'user-nurse-patel',
    claimedAt: new Date(Date.now() - 19 * 60 * 1000).toISOString(),
    estimatedDurationMinutes: 15,
  },
  {
    id: 'queue-item-002',
    queueName: QueueName.PHYSICIAN_CONSULT,
    visitId: 'visit-005',
    patientName: 'William Brown',
    priority: VisitPriority.HIGH,
    status: QueueItemStatus.IN_PROGRESS,
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    claimedBy: 'user-dr-chen',
    claimedAt: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
    estimatedDurationMinutes: 20,
  },
  {
    id: 'queue-item-003',
    queueName: QueueName.CHECK_IN,
    visitId: 'visit-001',
    patientName: 'John Smith',
    priority: VisitPriority.URGENT,
    status: QueueItemStatus.PENDING,
    createdAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    estimatedDurationMinutes: 5,
  },
  {
    id: 'queue-item-004',
    queueName: QueueName.PROCEDURE_ECHO,
    visitId: 'visit-003',
    patientName: 'Robert Davis',
    priority: VisitPriority.NORMAL,
    status: QueueItemStatus.PENDING,
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    estimatedDurationMinutes: 20,
  },
];

/**
 * Fetch the full dashboard
 */
export async function fetchDashboard(
  tenantId: string = 'default',
): Promise<CardiologyDashboard> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  const visitsByState: Record<CardiovascularVisitState, number> = {} as Record<CardiovascularVisitState, number>;
  for (const state of Object.values(CardiovascularVisitState)) {
    visitsByState[state] = mockVisits.filter((v) => v.currentState === state).length;
  }

  const visitsByPriority: Record<VisitPriority, number> = {} as Record<VisitPriority, number>;
  for (const priority of Object.values(VisitPriority)) {
    if (typeof priority === 'number') {
      visitsByPriority[priority] = mockVisits.filter((v) => v.priority === priority).length;
    }
  }

  const urgent = mockVisits.filter((v) => v.priority === VisitPriority.URGENT);
  const recentDischarges = mockVisits.filter((v) => v.currentState === CardiovascularVisitState.DISCHARGED);

  const queueStats: QueueStats[] = [
    {
      queueName: QueueName.CHECK_IN,
      pendingCount: 1,
      inProgressCount: 0,
      averageWaitMinutes: 3,
      oldestItemAgeMinutes: 3,
    },
    {
      queueName: QueueName.NURSING_ASSESSMENT,
      pendingCount: 0,
      inProgressCount: 1,
      averageWaitMinutes: 20,
      oldestItemAgeMinutes: 20,
    },
    {
      queueName: QueueName.PHYSICIAN_CONSULT,
      pendingCount: 0,
      inProgressCount: 1,
      averageWaitMinutes: 15,
      oldestItemAgeMinutes: 15,
    },
    {
      queueName: QueueName.PROCEDURE_ECHO,
      pendingCount: 1,
      inProgressCount: 0,
      averageWaitMinutes: 30,
      oldestItemAgeMinutes: 30,
    },
  ];

  const dashboard: CardiologyDashboard = {
    tenantId,
    generatedAt: new Date().toISOString(),
    visits: {
      byState: visitsByState,
      byPriority: visitsByPriority,
      urgent,
      recentDischarges,
    },
    queues: queueStats,
    rooms: {
      total: mockRooms.length,
      occupied: mockRooms.filter((r) => !r.isAvailable).length,
      available: mockRooms.filter((r) => r.isAvailable).length,
      byType: {
        [RoomType.WAITING_ROOM]: mockRooms.filter((r) => r.roomType === RoomType.WAITING_ROOM),
        [RoomType.CHECK_IN_DESK]: mockRooms.filter((r) => r.roomType === RoomType.CHECK_IN_DESK),
        [RoomType.EXAM_ROOM]: mockRooms.filter((r) => r.roomType === RoomType.EXAM_ROOM),
        [RoomType.ECG_ROOM]: mockRooms.filter((r) => r.roomType === RoomType.ECG_ROOM),
        [RoomType.ECHO_LAB]: mockRooms.filter((r) => r.roomType === RoomType.ECHO_LAB),
        [RoomType.STRESS_TEST_LAB]: [],
        [RoomType.HOLTER_ROOM]: [],
        [RoomType.CONSULT_ROOM]: [],
        [RoomType.BLOOD_DRAW]: [],
        [RoomType.CHECKOUT_DESK]: [],
        [RoomType.BILLING_OFFICE]: [],
      },
    },
    recentEvents: [],
    staffWorkload: [],
  };

  return dashboard;
}

/**
 * Fetch a specific visit detail
 */
export async function fetchVisitDetail(visitId: string): Promise<CardiovascularVisit | null> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return mockVisits.find((v) => v.id === visitId) || null;
}

/**
 * Fetch queue items
 */
export async function fetchQueueItems(
  queueNames?: QueueName[],
  tenantId: string = 'default',
): Promise<QueueItem[]> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  if (!queueNames || queueNames.length === 0) {
    return mockQueueItems;
  }
  return mockQueueItems.filter((item) => queueNames.includes(item.queueName));
}

/**
 * Claim a queue item
 */
export async function claimQueueItem(itemId: string, userId: string): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const item = mockQueueItems.find((i) => i.id === itemId);
  if (item) {
    item.status = QueueItemStatus.IN_PROGRESS;
    item.claimedBy = userId;
    item.claimedAt = new Date().toISOString();
  }
}

/**
 * Complete a queue item
 */
export async function completeQueueItem(itemId: string, notes?: string): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const item = mockQueueItems.find((i) => i.id === itemId);
  if (item) {
    item.status = QueueItemStatus.COMPLETED;
    item.completedAt = new Date().toISOString();
    if (notes) item.notes = notes;
  }
}

/**
 * Record vitals
 */
export async function recordVitals(visitId: string, vitals: VitalSigns): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const visit = mockVisits.find((v) => v.id === visitId);
  if (visit) {
    visit.vitals = vitals;
  }
}

/**
 * Perform a state transition
 */
export async function transitionVisitState(
  visitId: string,
  request: TransitionRequest,
): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 400));
  const visit = mockVisits.find((v) => v.id === visitId);
  if (visit) {
    visit.previousState = visit.currentState;
    // In real implementation, validate transition and update state
    // For now, just acknowledge the request
  }
}

/**
 * Get current user from session
 */
export function getCurrentUser(): User | null {
  // In production, extract from JWT or session context
  return mockUsers['user-dr-chen'] || null;
}

/**
 * Get all mock users (for testing)
 */
export function getAllMockUsers(): Record<string, User> {
  return mockUsers;
}

export { mockVisits, mockRooms, mockQueueItems, mockUsers };
