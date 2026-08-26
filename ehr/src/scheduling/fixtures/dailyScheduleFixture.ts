// Deterministic visual-reference fixture for the Daily Schedule board.
// This is DEMO/FIXTURE data only — production must source real Roshi scheduling records.

export type PastelKey = 'mint' | 'aquaMint' | 'blue' | 'peach' | 'lavender' | 'yellow' | 'coral' | 'green';

export const PASTELS: Record<PastelKey, { bg: string; border: string; text: string }> = {
  mint: { bg: '#D9F7DF', border: '#BFEAC9', text: '#166534' },
  aquaMint: { bg: '#C9F5E9', border: '#A9E6D8', text: '#0F766E' },
  blue: { bg: '#D7E7FA', border: '#BBD6F2', text: '#1E3A8A' },
  peach: { bg: '#FDE8CF', border: '#F6D6AC', text: '#92400E' },
  lavender: { bg: '#E9E0FA', border: '#D8C8F5', text: '#5B21B6' },
  yellow: { bg: '#FFF1BD', border: '#F5E191', text: '#854D0E' },
  coral: { bg: '#FFDADB', border: '#F7BFC1', text: '#B91C1C' },
  green: { bg: '#D7F5DC', border: '#BEE8C6', text: '#15803D' },
};

export type FixtureEvent = {
  id: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  title: string;
  provider: string;
  color: PastelKey;
  delayed?: boolean;
};

export type FixtureRow = {
  id: string;
  label: string;
  delayed?: boolean;
  events: FixtureEvent[];
};

export const SCHEDULE_START_HOUR = 7;
export const SCHEDULE_END_HOUR = 18;

export const dailyScheduleRows: FixtureRow[] = [
  {
    id: 'theatre-1',
    label: 'Theatre 1',
    events: [
      { id: 't1-1', startHour: 8, startMinute: 0, endHour: 11, endMinute: 0, title: 'Laparoscopic Cholecystectomy', provider: 'Dr Wiśniewski', color: 'mint' },
      { id: 't1-2', startHour: 11, startMinute: 30, endHour: 13, endMinute: 30, title: 'Sigmoid Colectomy', provider: 'Dr Wiśniewski', color: 'aquaMint' },
      { id: 't1-3', startHour: 14, startMinute: 0, endHour: 16, endMinute: 30, title: 'Hernia Repair', provider: 'Dr Wiśniewski', color: 'blue' },
    ],
  },
  {
    id: 'theatre-2',
    label: 'Theatre 2',
    events: [
      { id: 't2-1', startHour: 8, startMinute: 0, endHour: 11, endMinute: 30, title: 'Total Hip Replacement', provider: 'Dr Jabłońska', color: 'peach' },
      { id: 't2-2', startHour: 12, startMinute: 30, endHour: 16, endMinute: 0, title: 'Knee Arthroplasty', provider: 'Dr Jabłońska', color: 'lavender' },
    ],
  },
  {
    id: 'theatre-3',
    label: 'Theatre 3',
    delayed: true,
    events: [
      { id: 't3-1', startHour: 7, startMinute: 15, endHour: 9, endMinute: 15, title: 'Tonsillectomy', provider: 'Dr Mazur', color: 'yellow' },
      { id: 't3-2', startHour: 9, startMinute: 30, endHour: 11, endMinute: 30, title: 'Appendectomy', provider: 'Dr Krawczyk', color: 'coral', delayed: true },
      { id: 't3-3', startHour: 12, startMinute: 0, endHour: 14, endMinute: 0, title: 'Thyroidectomy', provider: 'Dr Krawczyk', color: 'mint' },
    ],
  },
  {
    id: 'theatre-4',
    label: 'Theatre 4',
    events: [
      { id: 't4-1', startHour: 9, startMinute: 30, endHour: 14, endMinute: 30, title: 'Coronary Artery Bypass Graft', provider: 'Dr Piotrowska', color: 'blue' },
      { id: 't4-2', startHour: 15, startMinute: 0, endHour: 17, endMinute: 0, title: 'Valve Repair', provider: 'Dr Piotrowska', color: 'aquaMint' },
    ],
  },
  {
    id: 'theatre-5',
    label: 'Theatre 5',
    events: [
      { id: 't5-1', startHour: 8, startMinute: 0, endHour: 9, endMinute: 15, title: 'Craniotomy', provider: 'Dr Lewandowski', color: 'lavender' },
      { id: 't5-2', startHour: 9, startMinute: 45, endHour: 11, endMinute: 15, title: 'Spinal Fusion L4-L5', provider: 'Dr Lewandowski', color: 'green' },
      { id: 't5-3', startHour: 12, startMinute: 15, endHour: 14, endMinute: 15, title: 'Carpal Tunnel Release', provider: 'Dr Mazur', color: 'yellow' },
    ],
  },
];

export const totalProcedureCount = dailyScheduleRows.reduce((sum, r) => sum + r.events.length, 0);
