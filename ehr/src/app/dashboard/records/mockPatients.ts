import { readPersistedPatientsSync } from '@/lib/patientRecordStore';

export type AgendaItem = {
  id: string;
  title: string;
  source: 'Clinician' | 'Patient' | 'Previous Appointment' | 'Open Care Task' | 'Health Concern' | 'Care Plan';
  owner: 'Clinician' | 'Patient' | 'Shared';
  status: 'not-addressed' | 'addressed' | 'follow-up-needed';
  priority?: 'Normal' | 'Important';
};

export type VisitDocumentation = {
  status: 'not-started' | 'draft' | 'pending-signature' | 'signed';
  noteId?: string;
  author?: string;
  template?: string;
  lastSavedAt?: string;
  signedAt?: string;
};

export type FollowUpItem = {
  id: string;
  title: string;
  dueDate?: string;
  assignee?: string;
  status: 'open' | 'done';
};

export type ChartActivityRecord = {
  id: string;
  action: string;
  user: string;
  date: string;
  resourceType?: string;
  status?: string;
  sourceRecordId?: string;
  sourceRecordType?: string;
  sourceRecordDisplay?: string;
  organization?: string;
  actorRole?: string;
  isActionable?: boolean;
  attentionReason?: string;
};

export type AppointmentRecord = {
  id: string;
  date: string;
  end?: string;
  doctor: string;
  type: string;
  status?: string;
  location?: string;
  room?: string;
  department?: string;
  modality?: 'In-Person' | 'Video Visit' | 'Phone';
  prep?: string;
  createdAt?: string;
  bookedBy?: string;
  confirmationStatus?: 'Confirmed' | 'Unconfirmed';
  referralSource?: string;
  arrivedAt?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancelReason?: string;
  instructionsSentAt?: string;
  instructionsChannel?: string;
  agenda?: AgendaItem[];
  documentation?: VisitDocumentation;
  followUp?: FollowUpItem[];
  previousAppointmentId?: string;
  nextAppointmentId?: string;
};

export type Patient = {
  id: string;
  name: string;
  dob: string;
  mrn: string;
  lastVisit?: string;
  gender?: string;
  age?: number;
  weight?: string;
  height?: string;
  bloodType?: string;
  status?: string;
  conditions?: string[];
  conditionDetails?: { name: string; status?: string; lastReviewed?: string; managedBy?: string; severity?: string }[];
  medications?: { name: string; dose?: string; freq?: string; route?: string; prescriber?: string; status?: string; refill?: string; startDate?: string; indication?: string }[];
  upcoming?: AppointmentRecord[];
  notes?: { id: string; date: string; author: string; snippet: string; status?: string }[];
  history?: { id: string; date: string; provider: string; reason: string; status?: string }[];
  tests?: { id: string; name: string; date: string; status?: string }[];
  documents?: { id: string; name: string; date: string; url?: string; type?: string; status?: string; author?: string; content?: string; fhirId?: string }[];
  allergies?: string[];
  allergyReviewedDate?: string;
  immunizations?: { id?: string; name: string; date?: string; status?: string; nextReview?: string }[];
  goals?: unknown[];
  outstanding?: unknown[];
  allergyDetails?: { id?: string; date?: string; reaction?: string; severity?: string }[];
  photoUrl?: string;
  contact?: { phone?: string; email?: string; address?: string };
  insurance?: { provider?: string; plan?: string; policyNumber?: string };
  currentConcerns?: (string | { title: string; status?: string; priority?: string; firstNoted?: string; lastReviewed?: string; context?: string })[];
  labResults?: { id: string; name: string; date: string; result: string; unit?: string; normalRange?: string; referenceRange?: string; interpretation?: string; status?: string; reviewed?: boolean; code?: string; codeSystem?: string; provider?: string; laboratory?: string; specimen?: string; method?: string; dataQuality?: { state: 'review'; reason: string; source?: string } }[];
  lastAttendingDoctor?: string;
  organization?: string;
  preferredName?: string;
  preferredLanguage?: string;
  preferredContactMethod?: string;
  riskLevel?: 'Low' | 'Moderate' | 'High';
  dataUpdatedAt?: string;
  vitals?: {
    weight?: { date: string; value: number; unit: string }[];
    bmi?: { date: string; value: number; unit: string }[];
    bloodPressure?: { date: string; value: number; unit: string }[];
    heartRate?: { date: string; value: number; unit: string }[];
    oxygenSaturation?: { date: string; value: number; unit: string }[];
    temperature?: { date: string; value: number; unit: string }[];
  };
  clinicalTasks?: { id: string; title: string; dueDate: string; priority?: 'Low' | 'Normal' | 'High'; assignedTo?: string; status?: string; relatedTo?: string }[];
  careGaps?: { id: string; item: string; dueDate: string; priority?: 'Low' | 'Medium' | 'High'; clinician?: string; status?: string }[];
  careTeam?: { id: string; name: string; role: string; specialty?: string; initials?: string }[];
  chartActivity?: ChartActivityRecord[];
};

export const mockPatients: Patient[] = [
  {
    id: 'patient-001',
    name: 'Sarah Jenkins',
    dob: '1985-10-12',
    mrn: '8839201',
    lastVisit: '2024-09-28',
    gender: 'Female',
    age: 39,
    weight: '68 kg',
    height: '170 cm',
    bloodType: 'O+',
    status: 'Active',
    photoUrl: 'https://ui-avatars.com/api/?name=Sarah+Jenkins&background=E6FFFA&color=0F766E&size=256',
    contact: { phone: '+1 (416) 555-0132', email: 'sarah.jenkins@example.com', address: '12 King St W, Toronto, ON' },
    insurance: { provider: 'Maple Health', plan: 'Premium', policyNumber: 'MAP-998233' },
    lastAttendingDoctor: 'Dr. Aris Thorne',
    conditions: ['Hypertension', 'Type 2 Diabetes'],
    conditionDetails: [
      { name: 'Hypertension', status: 'Active', lastReviewed: 'June 5, 2026', managedBy: 'Dr. Aris Thorne' },
      { name: 'Type 2 Diabetes', status: 'Active', lastReviewed: 'June 1, 2026', managedBy: 'Primary care' },
    ],
    currentConcerns: [
      { title: 'Elevated Blood Pressure Readings', status: 'Active', lastReviewed: 'June 5, 2026' },
      { title: 'Occasional Dizziness', status: 'Active', context: 'Reported intermittently' },
    ],
    medications: [
      { name: 'Atorvastatin', dose: '20 mg', freq: 'once daily', route: 'Oral', prescriber: 'Dr. Chen', status: 'Active', refill: '2026-07-01', startDate: '2025-01-15', indication: 'Hyperlipidemia' },
      { name: 'Metformin', dose: '500 mg', freq: 'twice daily', route: 'Oral', prescriber: 'Dr. Chen', status: 'Active', startDate: '2024-11-02', indication: 'Type 2 Diabetes' },
    ],
    upcoming: [
      {
        id: 'a1-prev',
        date: '2026-05-15 09:00',
        end: '2026-05-15 09:30',
        doctor: 'Dr. Aris Thorne',
        type: 'Follow-up',
        status: 'Completed',
        location: 'Toronto Cardiology Clinic',
        room: '103',
        department: 'Cardiology',
        modality: 'In-Person',
        createdAt: '2026-04-02 11:00',
        bookedBy: 'Front Desk',
        confirmationStatus: 'Confirmed',
        documentation: { status: 'signed', noteId: 'n0', author: 'Dr. Aris Thorne', signedAt: '2026-05-15 09:52' },
        followUp: [{ id: 'fu0', title: 'Recheck home BP log at next visit', dueDate: '2026-07-18', assignee: 'Dr. Aris Thorne', status: 'open' }],
      },
      {
        id: 'a1',
        date: '2026-07-18 10:30',
        end: '2026-07-18 11:00',
        doctor: 'Dr. Aris Thorne',
        type: 'Follow-up',
        status: 'Scheduled',
        location: 'Toronto Cardiology Clinic',
        room: '103',
        department: 'Cardiology',
        modality: 'In-Person',
        prep: 'Bring current medication list and recent home BP readings.',
        createdAt: '2026-05-10 14:20',
        bookedBy: 'Front Desk',
        confirmationStatus: 'Confirmed',
        agenda: [
          { id: 'ag1', title: 'Review blood pressure trend', source: 'Clinician', owner: 'Clinician', status: 'not-addressed', priority: 'Normal' },
          { id: 'ag2', title: 'Review current medications', source: 'Clinician', owner: 'Clinician', status: 'not-addressed', priority: 'Important' },
          { id: 'ag3', title: 'Discuss dizziness symptoms', source: 'Patient', owner: 'Shared', status: 'not-addressed', priority: 'Normal' },
        ],
        documentation: { status: 'not-started' },
        followUp: [{ id: 'fu0', title: 'Recheck home BP log at next visit', dueDate: '2026-07-18', assignee: 'Dr. Aris Thorne', status: 'open' }],
        previousAppointmentId: 'a1-prev',
        nextAppointmentId: 'a1-next',
      },
      {
        id: 'a1-next',
        date: '2027-07-18 10:30',
        end: '2027-07-18 11:00',
        doctor: 'Dr. Aris Thorne',
        type: 'Follow-up',
        status: 'Scheduled',
        location: 'Toronto Cardiology Clinic',
        room: '103',
        department: 'Cardiology',
        modality: 'In-Person',
        createdAt: '2026-07-18 11:05',
        bookedBy: 'Dr. Aris Thorne',
        confirmationStatus: 'Unconfirmed',
        documentation: { status: 'not-started' },
        previousAppointmentId: 'a1',
      },
    ],
    notes: [
      { id: 'n1', date: '2026-06-05', author: 'Dr. Chen', snippet: 'Reviewed blood pressure; medication adjustment recommended.', status: 'Signed' },
      { id: 'n0', date: '2026-05-20', author: 'Dr. Aris Thorne', snippet: 'Discussed lifestyle modification and home BP monitoring plan.', status: 'Signed' },
    ],
    history: [
      { id: 'h1', date: '2024-09-28', provider: 'Dr. Lee', reason: 'Annual review', status: 'Completed' },
    ],
    tests: [{ id: 't1', name: 'Lipid Panel', date: '2026-06-01', status: 'Normal' }],
    labResults: [
      {
        id: 'l1',
        name: 'Lipid Panel — LDL',
        date: '2026-06-01',
        result: '2.6',
        unit: 'mmol/L',
        normalRange: '< 3.0 mmol/L',
        interpretation: 'Within Target',
        status: 'Final',
        reviewed: true,
        code: '13457-7',
        codeSystem: 'http://loinc.org',
        provider: 'Dr. Chen',
        laboratory: 'Maple Health Laboratory',
        specimen: 'Serum',
        method: 'Automated',
      },
      {
        id: 'l0',
        name: 'Lipid Panel — LDL',
        date: '2026-03-01',
        result: '3.4',
        unit: 'mmol/L',
        normalRange: '< 3.0 mmol/L',
        interpretation: 'High',
        status: 'Final',
        code: '13457-7',
        codeSystem: 'http://loinc.org',
        provider: 'Dr. Chen',
        laboratory: 'Maple Health Laboratory',
        specimen: 'Serum',
        method: 'Automated',
      },
      {
        id: 'hba1c-current',
        name: 'Hemoglobin A1c',
        date: '2026-06-10',
        result: '7.2',
        unit: '%',
        normalRange: '< 6.5 %',
        interpretation: 'High',
        status: 'Final',
        code: '4548-4',
        codeSystem: 'http://loinc.org',
        provider: 'Dr. Chen',
        laboratory: 'Maple Health Laboratory',
        specimen: 'Blood',
        method: 'Automated',
      },
      {
        id: 'hba1c-previous',
        name: 'Hemoglobin A1c',
        date: '2026-01-10',
        result: '7.4',
        unit: '%',
        normalRange: '< 6.5 %',
        interpretation: 'High',
        status: 'Final',
        code: '4548-4',
        codeSystem: 'http://loinc.org',
        provider: 'Dr. Chen',
        laboratory: 'Maple Health Laboratory',
        specimen: 'Blood',
        method: 'Automated',
      },
      {
        id: 'creatinine-current',
        name: 'Creatinine',
        date: '2026-08-19',
        result: '120',
        unit: 'umol/L',
        normalRange: '60-110 umol/L',
        interpretation: 'High',
        status: 'Final',
        code: '2160-0',
        codeSystem: 'http://loinc.org',
        provider: 'Lab technician',
        laboratory: 'Maple Health Laboratory',
        specimen: 'Serum',
        method: 'Automated',
      },
      {
        id: 'creatinine-previous',
        name: 'Creatinine',
        date: '2026-04-20',
        result: '98',
        unit: 'umol/L',
        normalRange: '60-110 umol/L',
        interpretation: 'Normal',
        status: 'Final',
        code: '2160-0',
        codeSystem: 'http://loinc.org',
        provider: 'Lab technician',
        laboratory: 'Maple Health Laboratory',
        specimen: 'Serum',
        method: 'Automated',
      },
      {
        id: 'egfr-current',
        name: 'eGFR',
        date: '2026-08-18',
        result: '55',
        unit: 'mL/min/1.73 m²',
        normalRange: '> 60 mL/min/1.73 m²',
        interpretation: 'Low',
        status: 'Final',
        code: '33914-3',
        codeSystem: 'http://loinc.org',
        provider: 'Lab technician',
        laboratory: 'Maple Health Laboratory',
        specimen: 'Serum',
        method: 'Automated',
      },
      {
        id: 'egfr-previous',
        name: 'eGFR',
        date: '2026-04-20',
        result: '62',
        unit: 'mL/min/1.73 m²',
        normalRange: '> 60 mL/min/1.73 m²',
        interpretation: 'Normal',
        status: 'Final',
        code: '33914-3',
        codeSystem: 'http://loinc.org',
        provider: 'Lab technician',
        laboratory: 'Maple Health Laboratory',
        specimen: 'Serum',
        method: 'Automated',
      },
    ],
    documents: [{ id: 'd1', name: 'ED Discharge Summary', date: '2026-06-03', url: '/docs/ed-discharge-001.pdf', status: 'Final' }],
    allergyReviewedDate: 'June 5, 2026',
    preferredName: 'Sarah',
    preferredLanguage: 'English',
    preferredContactMethod: 'Phone',
    riskLevel: 'High',
    dataUpdatedAt: '2026-06-05 09:20',
    vitals: {
      weight: [
        { date: '2025-12-05', value: 69.2, unit: 'kg' },
        { date: '2026-02-05', value: 69.0, unit: 'kg' },
        { date: '2026-04-05', value: 68.5, unit: 'kg' },
        { date: '2026-06-05', value: 68.0, unit: 'kg' },
      ],
      bloodPressure: [
        { date: '2025-12-05', value: 138, unit: 'mmHg' },
        { date: '2026-02-05', value: 134, unit: 'mmHg' },
        { date: '2026-04-05', value: 130, unit: 'mmHg' },
        { date: '2026-06-05', value: 128, unit: 'mmHg' },
      ],
      heartRate: [
        { date: '2026-04-05', value: 76, unit: 'bpm' },
        { date: '2026-06-05', value: 72, unit: 'bpm' },
      ],
    },
    clinicalTasks: [
      { id: 'ct1', title: 'Lipid Panel', dueDate: 'June 4, 2026', priority: 'Normal', status: 'Planned' },
      { id: 'ct2', title: 'Blood Pressure Follow-up', dueDate: 'June 15, 2026', priority: 'High', assignedTo: 'Dr. Aris Thorne', status: 'In Progress' },
    ],
    careGaps: [
      { id: 'cg1', item: 'Blood Pressure Follow-up', dueDate: 'June 15, 2026', priority: 'High', clinician: 'Dr. Aris Thorne', status: 'Due Soon' },
      { id: 'cg2', item: 'HbA1c Monitoring', dueDate: 'July 1, 2026', priority: 'Medium', clinician: 'Dr. Chen', status: 'Planned' },
      { id: 'cg3', item: 'Annual Assessment', dueDate: 'October 1, 2026', priority: 'Low', status: 'Planned' },
    ],
    careTeam: [
      { id: 'team1', name: 'Dr. Aris Thorne', role: 'Primary Specialist', specialty: 'Cardiology' },
      { id: 'team2', name: 'Dr. Chen', role: 'Internal Medicine' },
      { id: 'team3', name: 'Nurse Sarah Lee', role: 'Care Coordinator' },
    ],
    chartActivity: [
      { id: 'act1', action: 'Updated the progress note.', user: 'Dr. Chen', date: 'June 5, 2026', resourceType: 'Note', sourceRecordId: 'n1', sourceRecordType: 'Clinical Note', sourceRecordDisplay: 'Progress note' },
      { id: 'act2', action: 'Lipid panel result was reviewed.', user: 'Dr. Aris Thorne', date: 'June 1, 2026', resourceType: 'Result', sourceRecordId: 'l1', sourceRecordType: 'Laboratory Result', sourceRecordDisplay: 'Lipid Panel - LDL' },
      { id: 'act3', action: 'Follow-up appointment was scheduled.', user: 'Front Desk', date: 'May 28, 2026', resourceType: 'Appointment', sourceRecordId: 'a1', sourceRecordType: 'Appointment', sourceRecordDisplay: 'Follow-up appointment' },
      { id: 'act4', action: 'Medication list was reconciled.', user: 'Dr. Chen', date: 'May 20, 2026', resourceType: 'Medication' },
    ],
  },
  {
    id: 'patient-002',
    name: 'Michael Thompson',
    dob: '1978-02-14',
    mrn: '9922100',
    lastVisit: '2026-05-12',
    gender: 'Male',
    age: 48,
    weight: '82 kg',
    height: '178 cm',
    bloodType: 'A-',
    status: 'Active',
    photoUrl: 'https://ui-avatars.com/api/?name=Michael+Thompson&background=EEF2FF&color=7C3AED&size=256',
    contact: { phone: '+1 (647) 555-0199', email: 'michael.t@example.com', address: '88 Queen St, Toronto, ON' },
    insurance: { provider: 'Northern Care', plan: 'Standard', policyNumber: 'NOR-554332' },
    lastAttendingDoctor: 'Dr. Chen',
    conditions: ['Hyperlipidemia'],
    currentConcerns: ['Exertional chest discomfort'],
    medications: [{ name: 'Simvastatin', dose: '40 mg', freq: 'once daily' }],
    upcoming: [{ id: 'a2', date: '2026-08-01 09:00', doctor: 'Dr. Chen', type: 'Stress test', status: 'Planned' }],
    notes: [{ id: 'n2', date: '2026-05-12', author: 'Dr. Aris Thorne', snippet: 'Patient referred for stress test.' }],
    history: [
      { id: 'h2', date: '2025-11-01', provider: 'Dr. Chen', reason: 'Chest pain', status: 'Completed' },
    ],
    tests: [{ id: 't2', name: 'ECG', date: '2026-05-12', status: 'Abnormal' }],
    labResults: [{ id: 'l2', name: 'Troponin I', date: '2026-05-12', result: '0.02', unit: 'ng/mL', normalRange: '< 0.04' }],
    documents: [{ id: 'd2', name: 'Stress Test Report', date: '2026-05-15', url: '/docs/stress-test-002.pdf' }],
  },
  {
    id: 'patient-003',
    name: 'Aisha Rahman',
    dob: '1992-07-22',
    mrn: '4477002',
    lastVisit: '2026-03-03',
    gender: 'Female',
    age: 33,
    weight: '60 kg',
    height: '162 cm',
    bloodType: 'B+',
    status: 'Active',
    photoUrl: 'https://ui-avatars.com/api/?name=Aisha+Rahman&background=FEF3C7&color=CA8A04&size=256',
    contact: { phone: '+1 (416) 555-0177', email: 'aisha.rahman@example.com', address: '220 Dundas St, Toronto, ON' },
    insurance: { provider: 'Community Health', plan: 'Basic', policyNumber: 'COM-223311' },
    lastAttendingDoctor: 'Nurse Patel',
    conditions: ['Asthma'],
    currentConcerns: ['Worsening cough'],
    medications: [{ name: 'Salbutamol', dose: '100 mcg', freq: 'PRN' }],
    upcoming: [],
    notes: [{ id: 'n3', date: '2026-03-03', author: 'Nurse Patel', snippet: 'Reviewed inhaler technique.' }],
    history: [
      { id: 'h3', date: '2024-08-10', provider: 'Dr. Lee', reason: 'Acute bronchitis', status: 'Completed' },
    ],
    tests: [{ id: 't3', name: 'Spirometry', date: '2026-03-03', status: 'Pending' }],
    labResults: [],
    documents: [],
  },
];

export function getMockPatients(): Patient[] {
  return [...mockPatients, ...readPersistedPatientsSync()];
}

export function getPatientById(id: string): Patient | undefined {
  if (!id) return null;

  try {
    const raw = String(id);
    const decoded = decodeURIComponent(raw).trim();
    // remove any trailing path segments if present
    const cleaned = decoded.replace(/\/.*/, '');
    const normalized = cleaned.toLowerCase();

    return getMockPatients().find((p) => {
      const pid = String(p.id || '').toLowerCase();
      const pmrn = String(p.mrn || '').toLowerCase();

      return pid === normalized || pmrn === normalized || p.id === cleaned || p.mrn === cleaned;
    });
  } catch {
    return null;
  }
}
