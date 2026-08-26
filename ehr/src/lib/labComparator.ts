export type LabValue = number | string;

export type SourceInterpretation =
  | 'normal'
  | 'low'
  | 'high'
  | 'critical-low'
  | 'critical-high'
  | 'abnormal'
  | 'unknown';

export type SourceResultStatus =
  | 'registered'
  | 'partial'
  | 'preliminary'
  | 'final'
  | 'amended'
  | 'corrected'
  | 'cancelled'
  | 'entered-in-error'
  | 'unknown';

export type MappingStatus = 'approved' | 'unmapped';

export type ComparatorStatus =
  | 'stable'
  | 'increasing'
  | 'decreasing'
  | 'major-increase'
  | 'major-decrease'
  | 'new'
  | 'newly-abnormal'
  | 'returned-to-range'
  | 'not-comparable';

export interface RawLabResult {
  readonly id?: string;
  readonly name?: string;
  readonly result?: LabValue;
  readonly unit?: string;
  readonly date?: string;
  readonly issuedAt?: string;
  readonly status?: string;
  readonly interpretation?: string;
  readonly reviewStatus?: string;
  readonly referenceRange?: string;
  readonly normalRange?: string;
  readonly code?: string;
  readonly codeSystem?: string;
  readonly provider?: string;
  readonly laboratory?: string;
  readonly sourceSystem?: string;
  readonly specimen?: string;
  readonly method?: string;
  readonly reportId?: string;
  readonly reportStatus?: string;
}

export interface ReferenceRange {
  readonly low?: number;
  readonly high?: number;
  readonly text: string;
}

export interface LabObservation {
  readonly id: string;
  readonly name: string;
  readonly parameterKey: string;
  readonly code?: string;
  readonly codeSystem?: string;
  readonly mappingStatus: MappingStatus;
  readonly value: LabValue;
  readonly numericValue?: number;
  readonly unit?: string;
  readonly effectiveAt: string;
  readonly issuedAt?: string;
  readonly sourceInterpretation: SourceInterpretation;
  readonly sourceInterpretationText: string;
  readonly status: SourceResultStatus;
  readonly eligibleForComparison: boolean;
  readonly referenceRange?: ReferenceRange;
  readonly provider?: string;
  readonly laboratory?: string;
  readonly sourceSystem?: string;
  readonly specimen?: string;
  readonly method?: string;
  readonly reportId: string;
  readonly sourceResourceType: 'Observation' | 'DiagnosticReport';
}

export interface ComparatorRule {
  readonly id: string;
  readonly version: string;
  readonly classifySignificantChange: boolean;
  readonly minimumAbsoluteDelta?: number;
  readonly minimumPercentageChange?: number;
  readonly stablePercentageTolerance?: number;
}

export interface ComparisonEvaluation {
  readonly status: ComparatorStatus;
  readonly comparable: boolean;
  readonly current?: LabObservation;
  readonly previous?: LabObservation;
  readonly absoluteDelta?: number;
  readonly percentageDelta?: number;
  readonly rangeTransition?: 'unchanged' | 'newly-abnormal' | 'returned-to-range' | 'unknown';
  readonly ruleId: string;
  readonly ruleVersion: string;
  readonly explanation: readonly string[];
}

export interface LabComparisonGroup {
  readonly parameterKey: string;
  readonly name: string;
  readonly code?: string;
  readonly codeSystem?: string;
  readonly mappingStatus: MappingStatus;
  readonly observations: readonly LabObservation[];
  readonly evaluation: ComparisonEvaluation;
}

export const DISPLAY_ONLY_COMPARATOR_RULE: ComparatorRule = {
  id: 'LAB-COMP-DISPLAY-001',
  version: '1.0.0',
  classifySignificantChange: false,
  stablePercentageTolerance: 0,
};

const COMPARABLE_STATUSES = new Set<SourceResultStatus>([
  'final',
  'amended',
  'corrected',
]);

function parseFiniteNumber(value: string): number | undefined {
  const match = value.trim().match(/^[+-]?\d+(?:\.\d+)?$/);

  if (!match) {
    return undefined;
  }

  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseNumericLabValue(value: LabValue | undefined): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }

  return parseFiniteNumber(value);
}

export function parseReferenceRange(value: string | undefined): ReferenceRange | undefined {
  const text = value?.trim();

  if (!text) {
    return undefined;
  }

  const lessThan = text.match(/^<\s*([+-]?\d+(?:\.\d+)?)/);
  if (lessThan) {
    return { high: Number(lessThan[1]), text };
  }

  const greaterThan = text.match(/^>\s*([+-]?\d+(?:\.\d+)?)/);
  if (greaterThan) {
    return { low: Number(greaterThan[1]), text };
  }

  const range = text.match(/^([+-]?\d+(?:\.\d+)?)\s*(?:-|\u2013|to)\s*([+-]?\d+(?:\.\d+)?)/i);
  if (range) {
    return {
      low: Number(range[1]),
      high: Number(range[2]),
      text,
    };
  }

  return { text };
}

export function normalizeSourceInterpretation(value: string | undefined): {
  readonly status: SourceInterpretation;
  readonly label: string;
} {
  const normalized = String(value ?? '').trim().toLowerCase();

  if (normalized === 'hh' || normalized.includes('critical high') || normalized.includes('panic high')) {
    return { status: 'critical-high', label: 'Critical high' };
  }

  if (normalized === 'll' || normalized.includes('critical low') || normalized.includes('panic low')) {
    return { status: 'critical-low', label: 'Critical low' };
  }

  if (normalized === 'h' || normalized === 'high' || normalized.includes('high')) {
    return { status: 'high', label: 'High' };
  }

  if (normalized === 'l' || normalized === 'low' || normalized.includes('low')) {
    return { status: 'low', label: 'Low' };
  }

  if (normalized === 'n' || normalized === 'normal' || normalized.includes('within target') || normalized.includes('within range')) {
    return { status: 'normal', label: 'Normal' };
  }

  if (normalized === 'a' || normalized.includes('abnormal') || normalized.includes('review')) {
    return { status: 'abnormal', label: 'Abnormal' };
  }

  return { status: 'unknown', label: 'Not supplied' };
}

export function normalizeResultStatus(value: string | undefined): SourceResultStatus {
  const normalized = String(value ?? '').trim().toLowerCase();
  const statuses: readonly SourceResultStatus[] = [
    'registered',
    'partial',
    'preliminary',
    'final',
    'amended',
    'corrected',
    'cancelled',
    'entered-in-error',
  ];

  return statuses.includes(normalized as SourceResultStatus)
    ? (normalized as SourceResultStatus)
    : 'unknown';
}

function normalizeDate(value: string | undefined): string {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
}

function createParameterKey(input: RawLabResult): {
  readonly key: string;
  readonly mappingStatus: MappingStatus;
} {
  const code = input.code?.trim();
  const codeSystem = input.codeSystem?.trim();

  if (!code) {
    return {
      key: `unmapped:${input.id ?? 'unknown'}`,
      mappingStatus: 'unmapped',
    };
  }

  const approvedCodeSystem = codeSystem === 'http://loinc.org'
    || codeSystem === 'https://fhir.infoway-inforoute.ca/CodeSystem/pCLOCD';

  if (!approvedCodeSystem) {
    return {
      key: `unmapped:${input.id ?? code}`,
      mappingStatus: 'unmapped',
    };
  }
  const specimen = input.specimen?.trim() || 'unknown-specimen';
  const method = input.method?.trim() || 'unknown-method';

  return {
    key: `${codeSystem}|${code}|${specimen}|${method}`,
    mappingStatus: 'approved',
  };
}

export function normalizeLabResult(input: RawLabResult): LabObservation | undefined {
  const id = input.id?.trim();
  const name = input.name?.trim();
  const effectiveAt = normalizeDate(input.date);

  if (!id || !name || !effectiveAt || input.result === undefined) {
    return undefined;
  }

  const interpretation = normalizeSourceInterpretation(input.interpretation ?? input.status);
  const parameter = createParameterKey(input);
  const status = normalizeResultStatus(input.reportStatus ?? input.status);
  const reportId = input.reportId?.trim() || id;

  return {
    id,
    name,
    parameterKey: parameter.key,
    ...(input.code?.trim() ? { code: input.code.trim() } : {}),
    ...(input.codeSystem?.trim() ? { codeSystem: input.codeSystem.trim() } : {}),
    mappingStatus: parameter.mappingStatus,
    value: input.result,
    ...(parseNumericLabValue(input.result) !== undefined
      ? { numericValue: parseNumericLabValue(input.result) }
      : {}),
    ...(input.unit?.trim() ? { unit: input.unit.trim() } : {}),
    effectiveAt,
    ...(normalizeDate(input.issuedAt) ? { issuedAt: normalizeDate(input.issuedAt) } : {}),
    sourceInterpretation: interpretation.status,
    sourceInterpretationText: interpretation.label,
    status,
    eligibleForComparison: parameter.mappingStatus === 'approved' && COMPARABLE_STATUSES.has(status),
    ...(parseReferenceRange(input.referenceRange ?? input.normalRange)
      ? { referenceRange: parseReferenceRange(input.referenceRange ?? input.normalRange) }
      : {}),
    ...(input.provider?.trim() ? { provider: input.provider.trim() } : {}),
    ...(input.laboratory?.trim() ? { laboratory: input.laboratory.trim() } : {}),
    ...(input.sourceSystem?.trim() ? { sourceSystem: input.sourceSystem.trim() } : {}),
    ...(input.specimen?.trim() ? { specimen: input.specimen.trim() } : {}),
    ...(input.method?.trim() ? { method: input.method.trim() } : {}),
    reportId,
    sourceResourceType: input.reportId ? 'DiagnosticReport' : 'Observation',
  };
}

function sortObservations(observations: readonly LabObservation[]): LabObservation[] {
  return [...observations].sort((left, right) => {
    const dateDifference = new Date(left.effectiveAt).getTime() - new Date(right.effectiveAt).getTime();

    if (dateDifference !== 0) {
      return dateDifference;
    }

    return new Date(left.issuedAt ?? left.effectiveAt).getTime() - new Date(right.issuedAt ?? right.effectiveAt).getTime();
  });
}

function isWithinRange(value: number | undefined, referenceRange: ReferenceRange | undefined): boolean | undefined {
  if (value === undefined || !referenceRange || (referenceRange.low === undefined && referenceRange.high === undefined)) {
    return undefined;
  }

  if (referenceRange.low !== undefined && value < referenceRange.low) {
    return false;
  }

  if (referenceRange.high !== undefined && value > referenceRange.high) {
    return false;
  }

  return true;
}

function isCritical(status: SourceInterpretation): boolean {
  return status === 'critical-high' || status === 'critical-low';
}

function meetsSignificantChangeRule(
  absoluteDelta: number,
  percentageDelta: number | undefined,
  rule: ComparatorRule,
): boolean {
  if (!rule.classifySignificantChange) {
    return false;
  }

  const meetsAbsolute = rule.minimumAbsoluteDelta === undefined || absoluteDelta >= rule.minimumAbsoluteDelta;
  const meetsPercentage = rule.minimumPercentageChange === undefined
    || (percentageDelta !== undefined && percentageDelta >= rule.minimumPercentageChange);

  return meetsAbsolute && meetsPercentage;
}

function formatValue(observation: LabObservation): string {
  return `${observation.value}${observation.unit ? ` ${observation.unit}` : ''}`;
}

function buildNotComparableEvaluation(
  observations: readonly LabObservation[],
  rule: ComparatorRule,
  reason: string,
): ComparisonEvaluation {
  return {
    status: 'not-comparable',
    comparable: false,
    current: observations.at(-1),
    previous: observations.at(-2),
    ruleId: rule.id,
    ruleVersion: rule.version,
    explanation: [reason],
  };
}

export function evaluateComparison(
  observations: readonly LabObservation[],
  rule: ComparatorRule = DISPLAY_ONLY_COMPARATOR_RULE,
): ComparisonEvaluation {
  const ordered = sortObservations(observations);
  const current = ordered.at(-1);

  if (!current || current.mappingStatus !== 'approved') {
    return buildNotComparableEvaluation(ordered, rule, 'This result is not mapped to an approved standardized parameter.');
  }

  const eligible = ordered.filter((observation) => observation.eligibleForComparison);
  const eligibleCurrent = eligible.at(-1);
  const eligiblePrevious = eligible.at(-2);

  if (!eligibleCurrent) {
    return buildNotComparableEvaluation(ordered, rule, 'No final, amended, or corrected result is available for comparison.');
  }

  if (!eligiblePrevious) {
    return {
      status: 'new',
      comparable: true,
      current: eligibleCurrent,
      ruleId: rule.id,
      ruleVersion: rule.version,
      explanation: [`Current result is ${formatValue(eligibleCurrent)}. No previous eligible comparable result was found.`],
    };
  }

  if (eligibleCurrent.unit !== eligiblePrevious.unit) {
    return buildNotComparableEvaluation(ordered, rule, 'Units differ and no approved conversion rule was supplied.');
  }

  if (eligibleCurrent.numericValue === undefined || eligiblePrevious.numericValue === undefined) {
    return buildNotComparableEvaluation(ordered, rule, 'Qualitative results require a parameter-specific comparison rule.');
  }

  const absoluteDelta = eligibleCurrent.numericValue - eligiblePrevious.numericValue;
  const absoluteMagnitude = Math.abs(absoluteDelta);
  const percentageDelta = eligiblePrevious.numericValue === 0
    ? undefined
    : (absoluteMagnitude / Math.abs(eligiblePrevious.numericValue)) * 100;
  const currentRangeState = isWithinRange(eligibleCurrent.numericValue, eligibleCurrent.referenceRange);
  const previousRangeState = isWithinRange(eligiblePrevious.numericValue, eligiblePrevious.referenceRange);
  const rangeTransition = currentRangeState === true && previousRangeState === false
    ? 'returned-to-range'
    : currentRangeState === false && previousRangeState === true
      ? 'newly-abnormal'
      : currentRangeState === undefined || previousRangeState === undefined
        ? 'unknown'
        : 'unchanged';
  const tolerance = rule.stablePercentageTolerance ?? 0;
  const isStable = percentageDelta !== undefined && percentageDelta <= tolerance;
  const significant = meetsSignificantChangeRule(absoluteMagnitude, percentageDelta, rule);
  const direction = absoluteDelta > 0 ? 'increase' : 'decrease';
  const status: ComparatorStatus = rangeTransition === 'returned-to-range'
    ? 'returned-to-range'
    : rangeTransition === 'newly-abnormal'
      ? 'newly-abnormal'
      : isStable
        ? 'stable'
        : significant
          ? direction === 'increase' ? 'major-increase' : 'major-decrease'
          : direction === 'increase' ? 'increasing' : 'decreasing';

  const explanation = [
    `Current result is ${formatValue(eligibleCurrent)}.`,
    `Previous comparable result was ${formatValue(eligiblePrevious)}.`,
    `Absolute change is ${absoluteDelta > 0 ? '+' : ''}${absoluteDelta.toFixed(2)}${eligibleCurrent.unit ? ` ${eligibleCurrent.unit}` : ''}${percentageDelta === undefined ? '.' : ` (${absoluteDelta > 0 ? '+' : ''}${percentageDelta.toFixed(1)}%).`}`,
  ];

  if (isCritical(eligibleCurrent.sourceInterpretation)) {
    explanation.push(`The performing laboratory supplied a ${eligibleCurrent.sourceInterpretationText} interpretation.`);
  }

  if (rangeTransition === 'returned-to-range') {
    explanation.push('The current value returned to the reference interval supplied with the current result.');
  } else if (rangeTransition === 'newly-abnormal') {
    explanation.push('The current value crossed outside the reference interval supplied with the current result.');
  }

  return {
    status,
    comparable: true,
    current: eligibleCurrent,
    previous: eligiblePrevious,
    absoluteDelta,
    percentageDelta,
    rangeTransition,
    ruleId: rule.id,
    ruleVersion: rule.version,
    explanation,
  };
}

export function buildComparisonGroups(
  rawResults: readonly RawLabResult[],
  rule: ComparatorRule = DISPLAY_ONLY_COMPARATOR_RULE,
): LabComparisonGroup[] {
  const observations = rawResults
    .map((result) => normalizeLabResult(result))
    .filter((observation): observation is LabObservation => observation !== undefined);
  const groups = new Map<string, LabObservation[]>();

  for (const observation of observations) {
    const group = groups.get(observation.parameterKey) ?? [];
    group.push(observation);
    groups.set(observation.parameterKey, group);
  }

  return [...groups.entries()]
    .map(([parameterKey, groupObservations]) => {
      const ordered = sortObservations(groupObservations);
      const first = ordered[0];
      const evaluation = evaluateComparison(ordered, rule);

      return {
        parameterKey,
        name: first?.name ?? 'Unknown laboratory parameter',
        ...(first?.code ? { code: first.code } : {}),
        ...(first?.codeSystem ? { codeSystem: first.codeSystem } : {}),
        mappingStatus: first?.mappingStatus ?? 'unmapped',
        observations: ordered,
        evaluation,
      };
    })
    .sort((left, right) => {
      const leftDate = left.observations.at(-1)?.effectiveAt ?? '';
      const rightDate = right.observations.at(-1)?.effectiveAt ?? '';
      return rightDate.localeCompare(leftDate);
    });
}
