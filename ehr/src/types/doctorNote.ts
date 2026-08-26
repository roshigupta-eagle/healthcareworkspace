export type DoctorNoteType = 'progress' | 'follow-up' | 'phone' | 'care-plan' | 'general';

export type DoctorNoteStatus =
  | 'draft'
  | 'pending-signature'
  | 'signed'
  | 'amended'
  | 'corrected'
  | 'entered-in-error';

export const DOCTOR_NOTE_TYPE_LABELS: Record<DoctorNoteType, string> = {
  progress: 'Progress Note',
  'follow-up': 'Follow-Up Note',
  phone: 'Phone Note',
  'care-plan': 'Care Plan Note',
  general: 'General Clinical Note',
};

export interface DoctorNoteActor {
  id: string;
  name: string;
  role?: string;
}

export interface DoctorNoteSection {
  heading: string;
  body: string;
}

export interface DoctorNoteAddendum {
  id: string;
  author: DoctorNoteActor;
  createdAt: string;
  text: string;
}

export interface DoctorNoteCorrection {
  reason: string;
  correctedBy: DoctorNoteActor;
  correctedAt: string;
  previousBody: string;
}

export interface DoctorNoteEnteredInError {
  reason: string;
  by: DoctorNoteActor;
  at: string;
}

export interface DoctorNoteHistoryEntry {
  id: string;
  action: string;
  actor: DoctorNoteActor;
  timestamp: string;
  details?: string;
}

export interface DoctorNote {
  id: string;
  patientId: string;
  type: DoctorNoteType;
  status: DoctorNoteStatus;
  author: DoctorNoteActor;
  signer?: DoctorNoteActor | null;
  signedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  encounterId?: string | null;
  templateId?: string | null;
  templateLabel?: string | null;
  relatedConcernId?: string | null;
  sections: DoctorNoteSection[];
  followUpTaskId?: string | null;
  pinned?: boolean;
  addenda: DoctorNoteAddendum[];
  correction?: DoctorNoteCorrection | null;
  enteredInError?: DoctorNoteEnteredInError | null;
  history: DoctorNoteHistoryEntry[];
  version: number;
}

export function noteBodyText(note: Pick<DoctorNote, 'sections'>): string {
  return (note.sections || [])
    .map((s) => (s.heading ? `${s.heading}\n${s.body}` : s.body))
    .join('\n\n')
    .trim();
}

export function noteSnippet(note: Pick<DoctorNote, 'sections'>, maxLength = 140): string {
  const text = noteBodyText(note).replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}
