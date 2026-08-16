export type TrendMetricDefinition = {
  id: string;
  name: string;
  unit?: string;
  category?: string;
  loinc?: string;
  description?: string;
  preferCombine?: boolean;
};

export type TrendDateRange = {
  start?: string; // ISO
  end?: string; // ISO
  preset?: '30d' | '3m' | '6m' | '1y' | '2y' | '5y' | 'all' | 'custom';
};

export type TrendProvenance = {
  source?: string; // e.g. 'lab' | 'device' | 'patient-reported'
  performer?: string; // clinician or device
  device?: string;
  encounterId?: string;
  method?: string;
};

export type TrendReferenceRange = {
  low?: number;
  high?: number;
  unit?: string;
  source?: string;
};

export type TrendObservationBase = {
  id: string;
  metricId: string;
  timestamp: string; // ISO
  unit?: string;
  source?: string; // resource reference or 'mock'/'lab'
  interpretation?: string;
  encounterId?: string;
  performer?: string;
  note?: string;
  isCorrected?: boolean;
  enteredInError?: boolean;
  provenance?: TrendProvenance;
  referenceRange?: TrendReferenceRange;
  fhirId?: string;
};

export type TrendSingleObservationPoint = TrendObservationBase & {
  value: number;
  valueType?: 'single';
};

export type TrendBloodPressurePoint = TrendObservationBase & {
  systolic?: number;
  diastolic?: number;
  valueType: 'blood-pressure';
};

export type TrendObservationPoint = TrendSingleObservationPoint | TrendBloodPressurePoint;

export type TrendSeries = {
  metric: TrendMetricDefinition;
  points: TrendObservationPoint[];
};

export type TrendPermissionSet = {
  view: boolean;
  export: boolean;
  annotate: boolean;
  print: boolean;
};
