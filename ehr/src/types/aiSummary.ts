export type AIClinicalConfidence = 'High' | 'Moderate' | 'Limited' | 'Conflicting' | 'Unknown';

export interface AIEvidenceReference {
  id: string;
  resourceType: string;
  date?: string;
  title?: string;
  fhirReference?: string;
  source?: string;
}

export interface AIClinicalFinding {
  id: string;
  statement: string;
  category?: string;
  severity?: 'critical' | 'high' | 'moderate' | 'low' | 'info' | string;
  confidence?: AIClinicalConfidence;
  evidence: AIEvidenceReference[];
  updatedAt?: string;
}

export interface AIClinicalSummaryVersion {
  versionId: string;
  versionNumber: number;
  generatedAt: string;
  generatedBy: string;
  model?: string;
  dataCutoff?: string;
  patientId: string;
  findings: AIClinicalFinding[];
  summaryText: string;
  patientFriendlySummary?: string;
  review?: { reviewedBy?: string; reviewedAt?: string; disposition?: string; note?: string };
  provenance?: any;
}

export interface AIClinicalSummary {
  patientId: string;
  versions: AIClinicalSummaryVersion[];
}
