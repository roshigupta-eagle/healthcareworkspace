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
  medications?: { name: string; dose?: string; freq?: string; refill?: string }[];
  upcoming?: { id: string; date: string; doctor: string; type: string; status?: string }[];
  notes?: { id: string; date: string; author: string; snippet: string }[];
  history?: { id: string; date: string; provider: string; reason: string; status?: string }[];
  tests?: { id: string; name: string; date: string; status?: string }[];
  documents?: { id: string; name: string; date: string; url?: string }[];
  photoUrl?: string;
  contact?: { phone?: string; email?: string; address?: string };
  insurance?: { provider?: string; plan?: string; policyNumber?: string };
  currentConcerns?: string[];
  labResults?: { id: string; name: string; date: string; result: string; unit?: string; normalRange?: string }[];
  lastAttendingDoctor?: string;
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
    currentConcerns: ['Elevated BP readings', 'Occasional dizziness'],
    medications: [
      { name: 'Atorvastatin', dose: '20 mg', freq: 'once daily', refill: '2026-07-01' },
      { name: 'Metformin', dose: '500 mg', freq: 'twice daily' },
    ],
    upcoming: [{ id: 'a1', date: '2026-07-18 10:30', doctor: 'Dr. Aris Thorne', type: 'Follow-up', status: 'Scheduled' }],
    notes: [{ id: 'n1', date: '2026-06-05', author: 'Dr. Chen', snippet: 'Reviewed BP; medication adjustment recommended.' }],
    history: [
      { id: 'h1', date: '2024-09-28', provider: 'Dr. Lee', reason: 'Annual review', status: 'Completed' },
    ],
    tests: [{ id: 't1', name: 'Lipid Panel', date: '2026-06-01', status: 'Normal' }],
    labResults: [{ id: 'l1', name: 'Lipid Panel - LDL', date: '2026-06-01', result: '2.6', unit: 'mmol/L', normalRange: '< 3.0' }],
    documents: [{ id: 'd1', name: 'ED Discharge Summary', date: '2026-06-03', url: '/docs/ed-discharge-001.pdf' }],
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
  return mockPatients;
}

export function getPatientById(id: string): Patient | undefined {
  return mockPatients.find((p) => p.id === id);
}
