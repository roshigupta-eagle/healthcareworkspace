export type ClinicalTimelineEvent = {
  id: string;
  patientId: string;
  resourceType: string;
  resourceId: string;
  eventType: 'encounter'|'note'|'result'|'medication'|'order'|'procedure'|'document'|'immunization'|'allergy'|'task'|'vital'|'message'|'appointment'|'referral'|'other';
  temporalState?: 'past' | 'current' | 'future';
  title: string;
  summary?: string;
  status?: string;
  occurredAt?: string;
  recordedAt?: string;
  provider?: { id?: string; name?: string; role?: string } | null;
  organization?: { id?: string; name?: string } | null;
  encounterId?: string | null;
  source?: { system?: string; id?: string; display?: string };
  severity?: 'normal'|'abnormal'|'critical'|'unknown';
  reviewState?: 'unreviewed'|'reviewed'|'acknowledged' | null;
  relatedResources?: Array<{ type: string; id: string; display?: string }>;
  provenanceAvailable?: boolean;
  recordHref?: string | null;
};

export type TimelineListResponse = {
  data: ClinicalTimelineEvent[];
  cursor?: string;
};

export type TimelineQuery = {
  patientId: string;
  range?: string; // e.g. '6m'
  types?: string[];
  q?: string;
  limit?: number;
  cursor?: string;
};

export default ClinicalTimelineEvent;
