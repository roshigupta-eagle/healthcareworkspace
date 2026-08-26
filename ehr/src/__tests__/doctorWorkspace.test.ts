import { beforeEach, describe, expect, it, vi } from 'vitest';

const fixtures = vi.hoisted(() => ({
  patients: [{ id: 'patient-001', name: 'Sarah Jenkins', mrn: '8839201', dob: '1985-10-12', labResults: [{ id: 'lab-1', name: 'Creatinine', date: '2026-08-20', result: '120', unit: 'umol/L', interpretation: 'High', normalRange: '60-110 umol/L' }] }],
  listTasks: vi.fn(),
  listNotes: vi.fn(),
  listDocuments: vi.fn(),
  listConversations: vi.fn(),
  messageCounts: vi.fn(),
  summarizeConversation: vi.fn(),
}));

vi.mock('@/app/dashboard/records/mockPatients', () => ({
  mockPatients: fixtures.patients,
  getMockPatients: () => fixtures.patients,
  getPatientById: (id: string) => fixtures.patients.find((patient) => patient.id === id),
}));
vi.mock('@/lib/tasksStore', () => ({ listTasks: fixtures.listTasks }));
vi.mock('@/lib/doctorNotesStore', () => ({ listNotes: fixtures.listNotes }));
vi.mock('@/lib/documentStore', () => ({ listDocuments: fixtures.listDocuments }));
vi.mock('@/lib/messageStore', () => ({ listConversations: fixtures.listConversations, messageCounts: fixtures.messageCounts, summarizeConversation: fixtures.summarizeConversation }));

import { getDoctorWorkSnapshot } from '@/lib/doctorWorkStore';
import { isSidebarRouteActive } from '@/components/Sidebar';

describe('doctor workspace read model', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fixtures.listTasks.mockResolvedValue([]);
    fixtures.listNotes.mockResolvedValue([]);
    fixtures.listDocuments.mockResolvedValue([]);
    fixtures.listConversations.mockResolvedValue([]);
    fixtures.messageCounts.mockResolvedValue({ unread: 0, patientMessages: 0, careTeam: 0, followUp: 0 });
    fixtures.summarizeConversation.mockImplementation((conversation: unknown) => conversation);
  });

  it('includes an actionable unreviewed result in the shared work model', async () => {
    const snapshot = await getDoctorWorkSnapshot('doctor-1', 'Dr. Chen', 'DOCTOR');
    expect(snapshot.counts.results).toBe(1);
    expect(snapshot.counts.open).toBe(1);
    expect(snapshot.items[0]).toMatchObject({ kind: 'result-review', sourceRecord: { id: 'lab-1' }, canComplete: false });
  });

  it('includes persistent document review work and only canonical tasks can complete', async () => {
    fixtures.listTasks.mockResolvedValue([{ id: 'task-1', patientId: 'patient-001', title: 'Follow up', description: 'Review plan', category: 'Follow-up', priority: 'urgent', status: 'requested', assignee: { id: 'doctor-1', name: 'Dr. Chen' }, requester: { id: 'nurse-1', name: 'Nurse Patel' }, dueDate: null, createdAt: '2026-08-20T12:00:00.000Z' }]);
    fixtures.listDocuments.mockResolvedValue([{ id: 'document-1', patientId: 'patient-001', title: 'Discharge Summary', type: 'Discharge Summary', status: 'needs-review', source: 'external', version: 1, history: [], clinicalDate: '2026-08-20' }]);
    const snapshot = await getDoctorWorkSnapshot('doctor-1', 'Dr. Chen', 'DOCTOR');
    expect(snapshot.counts.open).toBe(3);
    expect(snapshot.counts.documents).toBe(1);
    expect(snapshot.items.find((item) => item.kind === 'document-review')).toMatchObject({ canComplete: false, sourceRecord: { type: 'DocumentReference', id: 'document-1' } });
    expect(snapshot.items.find((item) => item.kind === 'task')).toMatchObject({ canonicalTask: true, canComplete: true });
  });
});

describe('sidebar route matching', () => {
  it('does not mark Dashboard active for nested doctor work routes', () => {
    expect(isSidebarRouteActive('/dashboard/tasks', '/dashboard')).toBe(false);
    expect(isSidebarRouteActive('/dashboard/messages', '/dashboard')).toBe(false);
    expect(isSidebarRouteActive('/dashboard/documents', '/dashboard')).toBe(false);
    expect(isSidebarRouteActive('/dashboard/tasks', '/dashboard/tasks')).toBe(true);
    expect(isSidebarRouteActive('/dashboard/documents/review', '/dashboard/documents')).toBe(true);
  });
});
