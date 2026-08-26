import type {
  ComparatorStatus,
  LabComparisonGroup,
  SourceInterpretation,
  SourceResultStatus,
} from './labComparator';

export type PresentationInterpretation =
  | 'normal'
  | 'abnormal'
  | 'critical'
  | 'indeterminate';

export interface PresentationPoint {
  readonly id: string;
  readonly date: string;
  readonly value: number;
  readonly interpretation: PresentationInterpretation;
}

export interface PresentationAnalyte {
  readonly id: string;
  readonly name: string;
  readonly code?: string;
  readonly value: number | string;
  readonly unit?: string;
  readonly referenceRange?: { readonly low?: number; readonly high?: number; readonly text: string };
  readonly interpretation: PresentationInterpretation;
}

export interface PresentationPanel {
  readonly id: string;
  readonly name: string;
  readonly shortName: string;
  readonly category: string;
  readonly unit: string;
  readonly points: PresentationPoint[];
  readonly analytes: PresentationAnalyte[];
  readonly referenceRange?: { readonly low?: number; readonly high?: number; readonly text: string };
  readonly trendGoal: 'neutral';
  readonly interpretation: PresentationInterpretation;
  readonly reviewState: 'unreviewed';
  readonly reportStatus: SourceResultStatus;
  readonly collectedAt: string;
  readonly issuedAt: string;
  readonly specimen: string;
  readonly orderingProvider: string;
  readonly sourceResourceType: 'Observation' | 'DiagnosticReport';
  readonly sourceResourceId: string;
  readonly comparatorStatus: ComparatorStatus;
  readonly comparatorExplanation: readonly string[];
  readonly summary: string;
}

export function mapSourceInterpretation(
  interpretation: SourceInterpretation,
): PresentationInterpretation {
  if (interpretation === 'critical-high' || interpretation === 'critical-low') {
    return 'critical';
  }

  if (interpretation === 'high' || interpretation === 'low' || interpretation === 'abnormal') {
    return 'abnormal';
  }

  if (interpretation === 'normal') {
    return 'normal';
  }

  return 'indeterminate';
}

export function mapComparisonGroupToPanel(
  group: LabComparisonGroup,
): PresentationPanel | undefined {
  const current = group.evaluation.current ?? group.observations.at(-1);

  if (!current) {
    return undefined;
  }

  const interpretation = mapSourceInterpretation(current.sourceInterpretation);
  const points = group.observations.filter((observation) => observation.eligibleForComparison).flatMap((observation) => {
    if (observation.numericValue === undefined) {
      return [];
    }

    return [{
      id: observation.id,
      date: observation.effectiveAt,
      value: observation.numericValue,
      interpretation: mapSourceInterpretation(observation.sourceInterpretation),
    }];
  });
  const referenceRange = current.referenceRange
    ? { ...current.referenceRange }
    : undefined;

  return {
    id: current.id,
    name: group.name,
    shortName: group.name,
    category: 'Laboratory',
    unit: current.unit ?? '',
    points,
    analytes: [{
      id: current.id,
      name: current.name,
      ...(current.code ? { code: current.code } : {}),
      value: current.value,
      ...(current.unit ? { unit: current.unit } : {}),
      ...(referenceRange ? { referenceRange } : {}),
      interpretation,
    }],
    ...(referenceRange ? { referenceRange } : {}),
    trendGoal: 'neutral',
    interpretation,
    reviewState: 'unreviewed',
    reportStatus: current.status,
    collectedAt: current.effectiveAt,
    issuedAt: current.issuedAt ?? current.effectiveAt,
    specimen: current.specimen ?? 'Not specified',
    orderingProvider: current.provider ?? current.laboratory ?? 'Not specified',
    comparatorStatus: group.evaluation.status,
    comparatorExplanation: group.evaluation.explanation,
    sourceResourceType: current.sourceResourceType,
    sourceResourceId: current.sourceResourceType === 'DiagnosticReport' ? current.reportId : current.id,
    summary: group.evaluation.explanation.join(' '),
  };
}
