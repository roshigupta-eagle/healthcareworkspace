export type ClinicalTaskStatus =
  | 'draft'
  | 'requested'
  | 'received'
  | 'accepted'
  | 'ready'
  | 'in-progress'
  | 'on-hold'
  | 'failed'
  | 'rejected'
  | 'completed'
  | 'cancelled'
  | 'entered-in-error';

export type ClinicalTaskPriority = 'routine' | 'normal' | 'high' | 'urgent';

export interface ClinicalTaskAssignee {
  id: string;
  name: string;
  role?: string;
}

export interface ClinicalTaskHistoryEntry {
  id: string;
  action: string;
  userId?: string;
  userName?: string;
  role?: string;
  timestamp: string; // ISO
  details?: unknown;
}

export interface ClinicalTaskRelatedResource {
  type: string;
  id: string;
  display?: string;
}

export interface ClinicalTask {
  id: string;
  patientId: string;
  title: string;
  description?: string;
  category?: string;
  priority?: ClinicalTaskPriority;
  status?: ClinicalTaskStatus;
  startDate?: string | null;
  dueDate?: string | null;
  reminderDate?: string | null;
  requester?: { id: string; name?: string } | null;
  assignee?: ClinicalTaskAssignee | null;
  assignedTeam?: string | null;
  relatedResources?: ClinicalTaskRelatedResource[];
  dependencies?: string[];
  history?: ClinicalTaskHistoryEntry[];
  createdAt: string;
  updatedAt?: string;
  closedAt?: string | null;
}
