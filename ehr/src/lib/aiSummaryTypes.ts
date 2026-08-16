export type AiConfidenceFactor = {
  name: string;
  weight?: number;
  score?: number; // 0..1
  description?: string;
};

export type AiSummarySourceReference = {
  id: string;
  resourceType: string;
  date?: string;
};

export type AiSummaryFinding = {
  id: string;
  text: string;
  confidence?: number; // 0..100
  sources: AiSummarySourceReference[];
};

export type AiMetricTrendPoint = { date: string; value: number };

export type AiSummaryMetric = {
  id: string;
  title: string;
  value: string | number;
  unit?: string;
  trend?: AiMetricTrendPoint[];
  source?: AiSummarySourceReference | null;
};

export type AiRecommendation = {
  id: string;
  text: string;
  priority?: 'Low' | 'Medium' | 'High';
  status?: 'Suggested' | 'Accepted' | 'Dismissed' | 'Addressed';
  sources?: AiSummarySourceReference[];
};

export type AiSummaryConfidence = {
  score?: number; // 0..100
  label: 'High' | 'Moderate' | 'Low' | 'Insufficient';
  factors: AiConfidenceFactor[];
};

export type AiClinicalSummary = {
  id: string;
  versionId: string;
  patientId: string;
  generatedAt: string; // ISO
  generatedBy?: string;
  dataCutoff?: string;
  findings: AiSummaryFinding[];
  metrics: AiSummaryMetric[];
  recommendations: AiRecommendation[];
  sources: AiSummarySourceReference[];
  confidence: AiSummaryConfidence;
  reviewed?: boolean;
  review?: { reviewer?: string; reviewedAt?: string; note?: string } | null;
};
