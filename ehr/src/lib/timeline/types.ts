// Timeline event types for the longitudinal timeline component
export type EventLane = 'encounter' | 'condition' | 'lab' | 'medication' | 'other';

export interface ProvenanceInfo {
  system: 'EHR' | 'LIMS' | 'PMS' | 'UNKNOWN';
  source?: string | null;
  identifiers?: Array<{ system?: string; value?: string }> | null;
  originalResourceType?: string | null;
  originalId?: string | null;
}

export interface ReferenceRange {
  low?: number | null;
  high?: number | null;
  unit?: string | null;
}

export interface TimelineEvent {
  id: string; // canonical id like `${resourceType}/${id}` or synthetic
  resourceType: string;
  resourceId?: string | null;
  businessKey?: string | null;

  // temporal
  start?: number | null; // epoch ms
  end?: number | null; // epoch ms
  point?: number | null; // epoch ms for single-point events
  lastUpdated?: number | null;

  // display
  lane: EventLane;
  subtype?: string | null;
  title: string;
  subtitle?: string | null;
  value?: number | string | { value: number; unit?: string } | null;
  unit?: string | null;
  referenceRange?: ReferenceRange | null;
  interpretation?: string | null;
  critical?: boolean;

  // provenance and traceability
  provenance: ProvenanceInfo;

  // minimal snapshot of useful fields and optional raw payload
  fhir?: {
    url?: string | null;
    snapshot?: any | null;
    raw?: any | null;
  } | null;

  // links and metadata
  related?: Array<{ resourceType: string; id: string; relation: string }> | null;
  clusterId?: string | null;
  display?: { color?: string; icon?: string; badge?: string } | null;
  certainty?: number | null;
}

export interface TimelineWindowResponse {
  events: TimelineEvent[];
  nextPageToken?: string | null;
  aggregates?: any | null;
}

export default TimelineEvent;
