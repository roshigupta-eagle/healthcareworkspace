 'use client';
const USE_CLIENT = 'use client';

import React, {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { PatientBanner, type PatientVerificationStatus } from '@/design-system/clinical/PatientBanner';
import { mapComparisonGroupToPanel } from '@/lib/labComparatorPresentation';
import type { ComparatorStatus } from '@/lib/labComparator';
import { fetchLabComparator } from '@/lib/labComparatorClient';

type LabInterpretation =
  | 'normal'
  | 'abnormal'
  | 'critical'
  | 'indeterminate';

type LabReviewState = 'reviewed' | 'unreviewed';

type DiagnosticReportStatus =
  | 'registered'
  | 'partial'
  | 'preliminary'
  | 'final'
  | 'amended'
  | 'corrected'
  | 'cancelled'
  | 'entered-in-error'
  | 'unknown';

type TrendGoal = 'lower' | 'higher' | 'range' | 'neutral';

type LabFilter =
  | 'all'
  | 'critical'
  | 'abnormal'
  | 'unreviewed'
  | 'normal';

type TimeRange = '6m' | '1y' | '2y' | 'all';

type LabPoint = {
  id: string;
  date: string;
  value: number;
  interpretation: LabInterpretation;
};

type ReferenceRange = {
  low?: number;
  high?: number;
  text: string;
};

type LabAnalyte = {
  id: string;
  code?: string;
  name: string;
  value: number | string;
  unit?: string;
  referenceRange?: ReferenceRange;
  interpretation: LabInterpretation;
};

type LabPanel = {
  id: string;
  name: string;
  shortName: string;
  category: string;
  unit: string;
  points: LabPoint[];
  analytes: LabAnalyte[];
  referenceRange?: ReferenceRange;
  trendGoal: TrendGoal;
  interpretation: LabInterpretation;
  reviewState: LabReviewState;
  reviewedBy?: string;
  reviewedAt?: string;
  reportStatus: DiagnosticReportStatus;
  collectedAt: string;
  issuedAt: string;
  specimen: string;
  orderingProvider: string;
  reviewingProvider?: string;
  sourceResourceType: 'DiagnosticReport' | 'Observation';
  comparatorStatus?: ComparatorStatus;
  comparatorExplanation?: readonly string[];
  sourceResourceId: string;
  summary: string;
};

type RawLabResult = {
  id?: string;
  name?: string;
  result?: string | number;
  unit?: string;
  date?: string;
  issuedAt?: string;
  status?: string;
  interpretation?: string;
  reviewStatus?: string;
  referenceRange?: string;
  code?: string;
  provider?: string;
};

type PatientRecord = {
  id: string;
  name?: string;
  mrn?: string;
  dob?: string;
  age?: number;
  gender?: string;
  allergies?: unknown[];
  verificationStatus?: string;
  labResults?: RawLabResult[];
};

type Props = {
  patient: PatientRecord;
  initialSelectedLabId?: string | null;

  /**
   * Pass a server action or API-backed callback in production.
   * When omitted, the component still updates the current UI state.
   */
  onReviewResult?: (input: {
    patientId: string;
    labId: string;
  }) => Promise<void>;
};

type ClinicalInsights = {
  overall: string;
  trend: string;
  urgency: string;
  nextSteps: string[];
  limitation: string;
};

type IconProps = {
  className?: string;
};


const FILTERS: Array<{
  id: LabFilter;
  label: string;
}> = [
  { id: 'all', label: 'All' },
  { id: 'critical', label: 'Critical' },
  { id: 'abnormal', label: 'Abnormal' },
  { id: 'unreviewed', label: 'Unreviewed' },
  { id: 'normal', label: 'Normal' },
];

const TIME_RANGES: Array<{
  id: TimeRange;
  label: string;
}> = [
  { id: '6m', label: '6M' },
  { id: '1y', label: '1Y' },
  { id: '2y', label: '2Y' },
  { id: 'all', label: 'All' },
];

const STATUS_PRIORITY: Record<LabInterpretation, number> = {
  critical: 4,
  abnormal: 3,
  indeterminate: 2,
  normal: 1,
};


function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseNumericResult(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const match = String(value ?? '').match(/-?\d+(?:\.\d+)?/);

  if (!match) {
    return null;
  }

  const parsed = Number(match[0]);

  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDate(value?: string): string {
  if (!value) {
    return new Date().toISOString();
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime())
    ? new Date().toISOString()
    : parsed.toISOString();
}

function normalizeInterpretation(
  value?: string,
): LabInterpretation {
  const normalized = String(value ?? '').toLowerCase();

  if (
    normalized.includes('critical') ||
    normalized.includes('panic')
  ) {
    return 'critical';
  }

  if (
    normalized.includes('abnormal') ||
    normalized.includes('high') ||
    normalized.includes('low') ||
    normalized.includes('watch') ||
    normalized.includes('review')
  ) {
    return 'abnormal';
  }

  if (
    normalized.includes('normal') ||
    normalized.includes('good')
  ) {
    return 'normal';
  }

  return 'indeterminate';
}

function normalizeReviewState(value?: string): LabReviewState {
  return String(value ?? '').toLowerCase().includes('reviewed')
    ? 'reviewed'
    : 'unreviewed';
}

function normalizeReportStatus(
  value?: string,
): DiagnosticReportStatus {
  const normalized = String(value ?? '').toLowerCase();

  const allowed: DiagnosticReportStatus[] = [
    'registered',
    'partial',
    'preliminary',
    'final',
    'amended',
    'corrected',
    'cancelled',
    'entered-in-error',
  ];

  return allowed.includes(normalized as DiagnosticReportStatus)
    ? (normalized as DiagnosticReportStatus)
    : 'unknown';
}

function resultMatchesPanel(
  rawName: string,
  panel: LabPanel,
): boolean {
  const normalizedRaw = rawName.toLowerCase();
  const normalizedPanel = panel.name.toLowerCase();

  const aliases: Record<string, string[]> = {
    'lipid-panel': ['lipid', 'ldl', 'cholesterol'],
    hba1c: ['hba1c', 'a1c', 'hemoglobin a1c'],
    cbc: ['cbc', 'complete blood count', 'hemoglobin'],
    troponin: ['troponin'],
    'kidney-function': [
      'kidney',
      'renal',
      'egfr',
      'creatinine',
    ],
  };

  return (
    normalizedRaw.includes(normalizedPanel) ||
    (aliases[panel.id] ?? []).some((alias) =>
      normalizedRaw.includes(alias),
    )
  );
}

function mergePatientLabs(
  patient: PatientRecord,
): LabPanel[] {
  const labs: LabPanel[] = [];
  for (const raw of patient.labResults ?? []) {
    const rawName = String(raw.name ?? '').trim();

    if (!rawName) {
      continue;
    }

    const numericValue = parseNumericResult(raw.result);
    const interpretation = normalizeInterpretation(
      raw.interpretation ?? raw.status,
    );
    const date = normalizeDate(raw.date);
    const matchingPanel = labs.find((panel) =>
      resultMatchesPanel(rawName, panel),
    );

    if (matchingPanel && numericValue !== null) {
      const pointId =
        raw.id ?? `${matchingPanel.id}-${date}`;

      if (
        !matchingPanel.points.some(
          (point) => point.id === pointId,
        )
      ) {
        matchingPanel.points = [
          ...matchingPanel.points,
          {
            id: pointId,
            date,
            value: numericValue,
            interpretation,
          },
        ].sort(
          (a, b) =>
            new Date(a.date).getTime() -
            new Date(b.date).getTime(),
        );
      }

      matchingPanel.collectedAt = date;
      matchingPanel.issuedAt = normalizeDate(
        raw.issuedAt ?? raw.date,
      );
      matchingPanel.interpretation = interpretation;
      matchingPanel.reviewState = normalizeReviewState(
        raw.reviewStatus,
      );
      matchingPanel.reportStatus = normalizeReportStatus(
        raw.status,
      );
      matchingPanel.orderingProvider =
        raw.provider ?? matchingPanel.orderingProvider;

      const primaryAnalyte = matchingPanel.analytes[0];

      if (primaryAnalyte) {
        matchingPanel.analytes[0] = {
          ...primaryAnalyte,
          value: numericValue,
          unit: raw.unit ?? primaryAnalyte.unit,
          code: raw.code ?? primaryAnalyte.code,
          interpretation,
          referenceRange: raw.referenceRange
            ? {
                text: raw.referenceRange,
              }
            : primaryAnalyte.referenceRange,
        };
      }

      continue;
    }

    const id =
      raw.id ??
      `patient-lab-${slugify(rawName) || 'result'}`;

    const fallbackValue =
      numericValue ?? String(raw.result ?? '—');

    labs.push({
      id,
      name: rawName,
      shortName: rawName,
      category: 'Other',
      unit: raw.unit ?? '',
      points:
        numericValue === null
          ? []
          : [
              {
                id: `${id}-${date}`,
                date,
                value: numericValue,
                interpretation,
              },
            ],
      analytes: [
        {
          id: `${id}-analyte`,
          name: rawName,
          code: raw.code,
          value: fallbackValue,
          unit: raw.unit,
          referenceRange: raw.referenceRange
            ? {
                text: raw.referenceRange,
              }
            : undefined,
          interpretation,
        },
      ],
      trendGoal: 'neutral',
      interpretation,
      reviewState: normalizeReviewState(raw.reviewStatus),
      reportStatus: normalizeReportStatus(raw.status),
      collectedAt: date,
      issuedAt: normalizeDate(raw.issuedAt ?? raw.date),
      specimen: 'Not specified',
      orderingProvider: raw.provider ?? 'Not specified',
      sourceResourceType: 'Observation',
      sourceResourceId: id,
      summary:
        'Review this result with its source report and clinical context.',
    });
  }

  return labs.sort(
    (a, b) =>
      new Date(b.collectedAt).getTime() -
      new Date(a.collectedAt).getTime(),
  );
}

function getLatestPoint(
  lab?: LabPanel,
): LabPoint | undefined {
  return lab?.points.at(-1);
}

function getPreviousPoint(
  lab?: LabPanel,
): LabPoint | undefined {
  if (!lab || lab.points.length < 2) {
    return undefined;
  }

  return lab.points.at(-2);
}

function formatDate(
  value?: string,
  options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  },
): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-CA', options).format(
    date,
  );
}

function formatDateTime(value?: string): string {
  return formatDate(value, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatValue(
  value: number | string | undefined,
  unit?: string,
): string {
  if (value === undefined || value === '') {
    return '—';
  }

  return `${value}${unit ? ` ${unit}` : ''}`;
}

function timeSince(timestamp: number): string {
  const difference = Math.max(0, Date.now() - timestamp);

  if (difference < 60_000) {
    return 'just now';
  }

  if (difference < 3_600_000) {
    return `${Math.floor(difference / 60_000)}m ago`;
  }

  if (difference < 86_400_000) {
    return `${Math.floor(difference / 3_600_000)}h ago`;
  }

  return `${Math.floor(difference / 86_400_000)}d ago`;
}

function statusConfig(
  status: LabInterpretation,
): {
  label: string;
  dotClass: string;
  badgeClass: string;
  panelClass: string;
} {
  switch (status) {
    case 'critical':
      return {
        label: 'Critical',
        dotClass: 'bg-rose-500',
        badgeClass:
          'border-rose-200 bg-rose-50 text-rose-700',
        panelClass:
          'border-rose-200 bg-rose-50/70 text-rose-950',
      };
    case 'abnormal':
      return {
        label: 'Abnormal',
        dotClass: 'bg-amber-500',
        badgeClass:
          'border-amber-200 bg-amber-50 text-amber-800',
        panelClass:
          'border-amber-200 bg-amber-50/70 text-amber-950',
      };
    case 'normal':
      return {
        label: 'Within range',
        dotClass: 'bg-emerald-500',
        badgeClass:
          'border-emerald-200 bg-emerald-50 text-emerald-700',
        panelClass:
          'border-emerald-200 bg-emerald-50/70 text-emerald-950',
      };
    default:
      return {
        label: 'Indeterminate',
        dotClass: 'bg-slate-400',
        badgeClass:
          'border-slate-200 bg-slate-50 text-slate-700',
        panelClass:
          'border-slate-200 bg-slate-50 text-slate-900',
      };
  }
}

function interpretationFromRange(
  value: number,
  referenceRange?: ReferenceRange,
): LabInterpretation {
  if (!referenceRange) {
    return 'indeterminate';
  }

  if (
    referenceRange.low !== undefined &&
    value < referenceRange.low
  ) {
    return 'abnormal';
  }

  if (
    referenceRange.high !== undefined &&
    value > referenceRange.high
  ) {
    return 'abnormal';
  }

  return 'normal';
}

function getTrendSummary(lab: LabPanel): {
  direction: 'up' | 'down' | 'stable' | 'unknown';
  label: string;
  detail: string;
  tone: 'positive' | 'negative' | 'neutral';
} {
  const latest = getLatestPoint(lab);
  const previous = getPreviousPoint(lab);

  if (!latest || !previous) {
    return {
      direction: 'unknown',
      label: 'Not enough history',
      detail: 'At least two values are needed for a trend.',
      tone: 'neutral',
    };
  }

  const difference = latest.value - previous.value;
  const tolerance = Math.max(
    Math.abs(previous.value) * 0.01,
    0.01,
  );

  const direction =
    Math.abs(difference) <= tolerance
      ? 'stable'
      : difference > 0
        ? 'up'
        : 'down';

  let tone: 'positive' | 'negative' | 'neutral' = 'neutral';

  if (lab.trendGoal === 'lower') {
    tone =
      direction === 'down'
        ? 'positive'
        : direction === 'up'
          ? 'negative'
          : 'neutral';
  } else if (lab.trendGoal === 'higher') {
    tone =
      direction === 'up'
        ? 'positive'
        : direction === 'down'
          ? 'negative'
          : 'neutral';
  } else if (lab.trendGoal === 'range') {
    const latestInterpretation = interpretationFromRange(
      latest.value,
      lab.referenceRange,
    );
    const previousInterpretation = interpretationFromRange(
      previous.value,
      lab.referenceRange,
    );

    tone =
      latestInterpretation === 'normal' &&
      previousInterpretation !== 'normal'
        ? 'positive'
        : latestInterpretation !== 'normal'
          ? 'negative'
          : 'neutral';
  }

  const sign = difference > 0 ? '+' : '';

  return {
    direction,
    label:
      direction === 'stable'
        ? 'Stable'
        : direction === 'up'
          ? 'Increasing'
          : 'Decreasing',
    detail: `${sign}${difference.toFixed(1)} ${lab.unit} from the previous result`,
    tone,
  };
}

function buildClinicalInsights(
  lab: LabPanel,
): ClinicalInsights {
  const latest = getLatestPoint(lab);
  const trend = getTrendSummary(lab);
  const status = statusConfig(lab.interpretation);

  if (!latest) {
    return {
      overall:
        'No numeric trend data is available for this result.',
      trend:
        'Open the source report to review the original result.',
      urgency:
        'Clinical urgency cannot be inferred from the available display data.',
      nextSteps: [
        'Review the original report',
        'Confirm the reference range and interpretation',
        'Document follow-up when required',
      ],
      limitation:
        'This summary does not replace the source laboratory report or clinical judgment.',
    };
  }

  const urgency =
    lab.interpretation === 'critical'
      ? 'A critical interpretation is present. Verify the result and follow the organization’s escalation protocol.'
      : lab.interpretation === 'abnormal'
        ? 'The latest result is outside the supplied reference range and remains unreviewed until acknowledged.'
        : 'No critical flag is present in the supplied result data. Review in the patient’s clinical context.';

  const nextSteps =
    lab.interpretation === 'critical'
      ? [
          'Confirm the source result and patient identity',
          'Record acknowledgment and escalation according to local policy',
          'Link any resulting encounter, order, note, or follow-up task',
        ]
      : lab.interpretation === 'abnormal'
        ? [
          'Review the result with prior values and the source report',
          'Consider relevant conditions, medications, and recent encounters',
          'Document the follow-up plan when clinically required',
        ]
      : [
          'Review the result in the patient’s clinical context',
          'Compare with prior values when useful',
          'Continue the existing follow-up plan when appropriate',
        ];

  return {
    overall: `${status.label}. ${lab.summary}`,
    trend: `${trend.label}: ${trend.detail}.`,
    urgency,
    nextSteps,
    limitation:
      'The summary is generated from displayed values and supplied reference data. It is not a diagnosis or a substitute for the original report.',
  };
}

function getFilteredPoints(
  points: LabPoint[],
  timeRange: TimeRange,
): LabPoint[] {
  if (timeRange === 'all' || points.length < 2) {
    return points;
  }

  const latestTime = new Date(points.at(-1)?.date ?? 0).getTime();

  const months =
    timeRange === '6m' ? 6 : timeRange === '1y' ? 12 : 24;

  const cutoff = new Date(latestTime);
  cutoff.setMonth(cutoff.getMonth() - months);

  const filtered = points.filter(
    (point) =>
      new Date(point.date).getTime() >= cutoff.getTime(),
  );

  return filtered.length > 0 ? filtered : points.slice(-1);
}

function buildFhirBundle(
  patient: PatientRecord,
  lab: LabPanel,
) {
  const patientReference = `Patient/${patient.id}`;
  const reportReference = `${lab.sourceResourceType}/${lab.sourceResourceId}`;

  const observations = lab.analytes.map((analyte) => {
    const observationId = `${lab.sourceResourceId}-${analyte.id}`;

    const referenceRange =
      analyte.referenceRange === undefined
        ? undefined
        : [
            {
              ...(analyte.referenceRange.low !== undefined
                ? {
                    low: {
                      value: analyte.referenceRange.low,
                      unit: analyte.unit,
                    },
                  }
                : {}),
              ...(analyte.referenceRange.high !== undefined
                ? {
                    high: {
                      value: analyte.referenceRange.high,
                      unit: analyte.unit,
                    },
                  }
                : {}),
              text: analyte.referenceRange.text,
            },
          ];

    return {
      fullUrl: `urn:uuid:${observationId}`,
      resource: {
        resourceType: 'Observation',
        id: observationId,
        status:
          lab.reportStatus === 'unknown'
            ? 'final'
            : lab.reportStatus,
        code: {
          ...(analyte.code
            ? {
                coding: [
                  {
                    system: 'http://loinc.org',
                    code: analyte.code,
                    display: analyte.name,
                  },
                ],
              }
            : {}),
          text: analyte.name,
        },
        subject: {
          reference: patientReference,
        },
        effectiveDateTime: lab.collectedAt,
        issued: lab.issuedAt,
        valueQuantity:
          typeof analyte.value === 'number'
            ? {
                value: analyte.value,
                unit: analyte.unit,
              }
            : undefined,
        valueString:
          typeof analyte.value === 'string'
            ? analyte.value
            : undefined,
        interpretation: [
          {
            text: statusConfig(analyte.interpretation).label,
          },
        ],
        referenceRange,
      },
    };
  });

  const diagnosticReport = {
    fullUrl: `urn:uuid:${lab.sourceResourceId}`,
    resource: {
      resourceType: 'DiagnosticReport',
      id: lab.sourceResourceId,
      status:
        lab.reportStatus === 'unknown'
          ? 'final'
          : lab.reportStatus,
      code: {
        text: lab.name,
      },
      subject: {
        reference: patientReference,
      },
      effectiveDateTime: lab.collectedAt,
      issued: lab.issuedAt,
      result: observations.map((entry) => ({
        reference: `Observation/${entry.resource.id}`,
      })),
      conclusion: lab.summary,
    },
  };

  return {
    resourceType: 'Bundle',
    type: 'collection',
    timestamp: new Date().toISOString(),
    entry: [diagnosticReport, ...observations],
    _displayNote:
      'Generated for display/export. Validate against your implementation guide before production exchange.',
    _source: reportReference,
  };
}

function downloadJson(
  fileName: string,
  payload: unknown,
): void {
  const blob = new Blob(
    [JSON.stringify(payload, null, 2)],
    {
      type: 'application/fhir+json;charset=utf-8',
    },
  );

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = fileName;
  anchor.click();

  URL.revokeObjectURL(url);
}

function filterCount(
  labs: LabPanel[],
  filter: LabFilter,
): number {
  if (filter === 'all') {
    return labs.length;
  }

  if (filter === 'unreviewed') {
    return labs.filter(
      (lab) => lab.reviewState === 'unreviewed',
    ).length;
  }

  return labs.filter(
    (lab) => lab.interpretation === filter,
  ).length;
}

export default function LabResultsIntelligenceClient({
  patient,
  initialSelectedLabId,
  onReviewResult,
}: Props) {
  const router = useRouter();

  const initialLabs = useMemo(
    () => mergePatientLabs(patient),
    [patient],
  );

  const [labs, setLabs] =
    useState<LabPanel[]>(initialLabs);

  const [selectedId, setSelectedId] = useState<string>(
    () =>
      initialSelectedLabId &&
      initialLabs.some(
        (lab) => lab.id === initialSelectedLabId,
      )
        ? initialSelectedLabId
        : initialLabs[0]?.id ?? '',
  );

  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  const [activeFilter, setActiveFilter] =
    useState<LabFilter>('all');

  const [timeRange, setTimeRange] =
    useState<TimeRange>('all');

  const [lastUpdatedAt, setLastUpdatedAt] = useState(
    () => Date.now(),
  );

  // Additional UI state: review-status filter, AI panel collapse, compare modal
  const [activeReviewFilter, setActiveReviewFilter] = useState<
    'all' | 'reviewed' | 'unreviewed'
  >('all');
  const [showAIPanel, setShowAIPanel] = useState(true);
  const [compareOpen, setCompareOpen] = useState(false);

  const [clockTick, setClockTick] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<
    string | null
  >(null);


  useEffect(() => {
    let isCurrent = true;

    void fetchLabComparator(patient.id)
      .then((response) => {
        if (!isCurrent) {
          return;
        }

        const sourceUnavailable = response.warnings.some(
          (warning) => warning.code === 'sourceUnavailable',
        );

        if (sourceUnavailable) {
          setLabs([]);
          setSelectedId('');
          setErrorMessage('The canonical laboratory source is unavailable. No results were substituted.');
          return;
        }

        const nextLabs = response.data.parameters
          .map((group) => mapComparisonGroupToPanel(group))
          .filter((lab): lab is NonNullable<ReturnType<typeof mapComparisonGroupToPanel>> => lab !== undefined);

        setLabs(nextLabs);
        setSelectedId((current) => {
          if (initialSelectedLabId && nextLabs.some((lab) => lab.id === initialSelectedLabId)) {
            return initialSelectedLabId;
          }

          return nextLabs.some((lab) => lab.id === current)
            ? current
            : nextLabs[0]?.id ?? '';
        });
        setLastUpdatedAt(Date.now());

        if (response.warnings.length > 0) {
          setNotice(`${response.warnings.length} laboratory comparison warning${response.warnings.length === 1 ? '' : 's'} available.`);
        }
      })
      .catch((error: unknown) => {
        if (isCurrent) {
          setLabs([]);
          setSelectedId('');
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'The laboratory comparison could not be loaded.',
          );
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [initialSelectedLabId, patient.id]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setClockTick((value) => value + 1);
    }, 60_000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!notice && !errorMessage) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setNotice(null);
      setErrorMessage(null);
    }, 4_500);

    return () => window.clearTimeout(timeout);
  }, [notice, errorMessage]);

  const filteredLabs = useMemo(() => {
    const normalizedQuery = deferredQuery
      .trim()
      .toLowerCase();

    return labs.filter((lab) => {
      const matchesFilter =
        activeFilter === 'all'
          ? true
          : activeFilter === 'unreviewed'
            ? lab.reviewState === 'unreviewed'
            : lab.interpretation === activeFilter;

      // Review-status dimension (separate from severity)
      const matchesReview =
        activeReviewFilter === 'all'
          ? true
          : lab.reviewState === activeReviewFilter;

      // Expanded searchable text: include analyte codes, units and values
      const searchableText = [
        lab.name,
        lab.shortName,
        lab.category,
        lab.orderingProvider,
        lab.reviewingProvider,
        lab.sourceResourceId,
        lab.unit,
        ...lab.analytes.flatMap((analyte) => [
          analyte.name,
          analyte.code,
          analyte.unit,
          String(analyte.value ?? ''),
        ]),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesQuery =
        normalizedQuery.length === 0 ||
        searchableText.includes(normalizedQuery);

      return matchesFilter && matchesReview && matchesQuery;
    });
  }, [activeFilter, activeReviewFilter, deferredQuery, labs]);


  const activeSelectedId = filteredLabs.some((lab) => lab.id === selectedId)
    ? selectedId
    : filteredLabs[0]?.id ?? selectedId;

  const selectedLab =
    labs.find((lab) => lab.id === activeSelectedId) ??
    filteredLabs[0] ??
    labs[0];

  // Panel completeness: number of analytes with values vs total analytes
  const finalizedAnalytesCount = selectedLab
    ? selectedLab.analytes.filter((a) => a.value !== undefined && a.value !== null && String(a.value) !== '').length
    : 0;

  const totalAnalytesCount = selectedLab
    ? selectedLab.analytes.length
    : 0;

  const latestPoint = getLatestPoint(selectedLab);
  const previousPoint = getPreviousPoint(selectedLab);
  const trend = selectedLab
    ? getTrendSummary(selectedLab)
    : undefined;

  const visiblePoints = useMemo(
    () =>
      selectedLab
        ? getFilteredPoints(selectedLab.points, timeRange)
        : [],
    [selectedLab, timeRange],
  );

  const lowestPoint =
    visiblePoints.length > 0
      ? visiblePoints.reduce((lowest, point) =>
          point.value < lowest.value ? point : lowest,
        )
      : undefined;

  const highestPoint =
    visiblePoints.length > 0
      ? visiblePoints.reduce((highest, point) =>
          point.value > highest.value ? point : highest,
        )
      : undefined;

  const clinicalInsights = useMemo(
    () =>
      selectedLab
        ? buildClinicalInsights(selectedLab)
        : undefined,
    [selectedLab],
  );

  const summary = useMemo(
    () => ({
      total: labs.length,
      critical: labs.filter(
        (lab) => lab.interpretation === 'critical',
      ).length,
      abnormal: labs.filter(
        (lab) => lab.interpretation === 'abnormal',
      ).length,
      unreviewed: labs.filter(
        (lab) => lab.reviewState === 'unreviewed',
      ).length,
    }),
    [labs],
  );

  const firstCriticalUnreviewed = labs.find(
    (lab) =>
      lab.interpretation === 'critical' &&
      lab.reviewState === 'unreviewed',
  );

  // Derived metadata for alert display
  const firstCriticalLatest = firstCriticalUnreviewed
    ? getLatestPoint(firstCriticalUnreviewed)
    : undefined;

  const timeWaitingForReview = firstCriticalUnreviewed
    ? timeSince(new Date(firstCriticalUnreviewed.issuedAt).getTime())
    : '—';

  const assignedClinician =
    firstCriticalUnreviewed?.reviewingProvider ||
    firstCriticalUnreviewed?.orderingProvider ||
    'Unassigned';

  const notificationState = 'Not notified';

  const firstName =
    patient.name?.trim().split(/\s+/)[0] ?? '';

  const lastName =
    patient.name
      ?.trim()
      .split(/\s+/)
      .slice(1)
      .join(' ') ?? '';

  const verificationStatus: PatientVerificationStatus =
    patient.verificationStatus === 'verified'
      || patient.verificationStatus === 'unverified'
      ? patient.verificationStatus
      : 'none';

  async function handleReviewResult(): Promise<void> {
    if (!selectedLab || isReviewing) {
      return;
    }

    setIsReviewing(true);
    setErrorMessage(null);

    try {
      await onReviewResult?.({
        patientId: patient.id,
        labId: selectedLab.id,
      });

      const reviewedAt = new Date().toISOString();

      setLabs((currentLabs) =>
        currentLabs.map((lab) =>
          lab.id === selectedLab.id
            ? {
                ...lab,
                reviewState: 'reviewed',
                reviewedBy:
                  lab.reviewedBy ?? 'Current clinician',
                reviewedAt,
              }
            : lab,
        ),
      );

      setLastUpdatedAt(Date.now());
      setNotice(`${selectedLab.name} marked as reviewed.`);
    } catch {
      setErrorMessage(
        'The result could not be marked as reviewed. No changes were saved.',
      );
    } finally {
      setIsReviewing(false);
    }
  }

  function handleRefresh(): void {
    setIsRefreshing(true);
    setErrorMessage(null);

    router.refresh();

    window.setTimeout(() => {
      setLastUpdatedAt(Date.now());
      setIsRefreshing(false);
      setNotice('Lab results refreshed.');
    }, 450);
  }

  function handleExportFhir(): void {
    if (!selectedLab) {
      return;
    }

    const bundle = buildFhirBundle(patient, selectedLab);

    downloadJson(
      `${patient.id}-${selectedLab.id}-fhir-bundle.json`,
      bundle,
    );

    setNotice('FHIR JSON export created.');
  }
  
  function handlePrint(): void {
    if (typeof window !== 'undefined' && window.print) {
      window.print();
    }
  }
  function handleMessagePatient(): void {
    router.push(
      `/dashboard/records/${patient.id}/messages?context=lab-result&labId=${selectedLab?.id ?? ''}`,
    );
  }

  function handleAddFollowUp(): void {
    router.push(
      `/dashboard/records/${patient.id}/tasks/new?category=lab-follow-up&labId=${selectedLab?.id ?? ''}`,
    );
  }

  function handleOpenSource(): void {
    if (!selectedLab) {
      return;
    }

    router.push(
      `/dashboard/records/${patient.id}/labs/${selectedLab.sourceResourceId || selectedLab.id}`,
    );
  }

  const lastUpdatedLabel = timeSince(
    lastUpdatedAt + clockTick * 0,
  );

  if (!selectedLab) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <FlaskIcon className="mx-auto h-10 w-10 text-slate-400" />
          <h1 className="mt-4 text-xl font-semibold text-slate-950">
            No laboratory results
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            No laboratory results are currently available for
            this patient.
          </p>
          <button
            type="button"
            onClick={() =>
                <div className="mt-2 text-sm text-slate-600">
                  <strong className="text-slate-900">Panel completeness:</strong>{' '}
                  {finalizedAnalytesCount} of {totalAnalytesCount} components finalized
                  {totalAnalytesCount - finalizedAnalytesCount > 0 ? (
                    <span className="ml-2 text-xs text-amber-700">· {totalAnalytesCount - finalizedAnalytesCount} pending</span>
                  ) : (
                    <span className="ml-2 text-xs text-emerald-700">· All final</span>
                  )}
                </div>
            }
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-200"
          >
            Return to patient
          </button>
        </div>
      </div>
    );
  }

  const selectedStatus = statusConfig(
    selectedLab.interpretation,
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-cyan-50/40 pb-28 print:bg-white print:pb-0">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-5 flex flex-col gap-4 print:hidden lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() =>
                router.push(
                  `/dashboard/records/${patient.id}`,
                )
              }
              aria-label={`Back to ${patient.name ?? 'patient'}`}
              className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-100"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Back to patient
            </button>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                  Lab Results
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
                  <SparklesIcon className="h-3.5 w-3.5" />
                  AI-assisted review
                </span>
              </div>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                Review recent results, compare trends, confirm
                critical findings, and create follow-up work
                without leaving the patient chart.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-medium text-slate-500">
              Updated {lastUpdatedLabel}
            </span>

            <ActionButton
              label={isRefreshing ? 'Refreshing…' : 'Refresh'}
              icon={
                <RefreshIcon
                  className={`h-4 w-4 ${
                    isRefreshing ? 'animate-spin' : ''
                  }`}
                />
              }
              onClick={handleRefresh}
              disabled={isRefreshing}
            />

            <ActionButton
              label="FHIR JSON"
              icon={<CodeIcon className="h-4 w-4" />}
              onClick={handleExportFhir}
            />

            <ActionButton
              label="Print / Save PDF"
              icon={<PrinterIcon className="h-4 w-4" />}
              onClick={handlePrint}
            />
          </div>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <PatientBanner
            mrn={String(patient.mrn ?? '')}
            firstName={firstName}
            lastName={lastName}
            dateOfBirth={String(patient.dob ?? '')}
            age={Number(patient.age ?? 0)}
            sex={(patient.gender ?? 'Unknown') as 'Male' | 'Female' | 'Other' | 'Unknown'}
            allergies={(patient.allergies ?? []) as string[]}
            identifiers={[
              {
                label: 'MRN',
                value: String(patient.mrn ?? '—'),
              },
            ]}
            verificationStatus={verificationStatus}
          />
        </section>

        {firstCriticalUnreviewed ? (
          <section
            role="alert"
            className="mt-5 flex flex-col gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-3">
              <span className="rounded-xl bg-rose-100 p-2 text-rose-700">
                <AlertTriangleIcon className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-rose-950">
                  Critical result requires review
                </h2>
                <p className="mt-1 text-sm leading-6 text-rose-800">
                  {firstCriticalUnreviewed.name}
                  {firstCriticalLatest ? (
                    <span>
                      {' '}— <strong>{formatValue(firstCriticalLatest.value, firstCriticalUnreviewed.unit)}</strong>
                    </span>
                  ) : null}
                </p>

                <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-rose-800 sm:grid-cols-2">
                  <div>
                    <div className="font-semibold text-rose-900">Collected</div>
                    <div>{formatDateTime(firstCriticalUnreviewed.collectedAt)}</div>
                  </div>
                  <div>
                    <div className="font-semibold text-rose-900">Resulted</div>
                    <div>{formatDateTime(firstCriticalUnreviewed.issuedAt)}</div>
                  </div>
                  <div>
                    <div className="font-semibold text-rose-900">Waiting</div>
                    <div>{timeWaitingForReview}</div>
                  </div>
                  <div>
                    <div className="font-semibold text-rose-900">Assigned</div>
                    <div>{assignedClinician}</div>
                  </div>
                  <div>
                    <div className="font-semibold text-rose-900">Notification</div>
                    <div>{notificationState}</div>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setActiveFilter('critical');
                setSelectedId(firstCriticalUnreviewed.id);
              }}
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-rose-700 px-4 text-sm font-semibold text-white transition hover:bg-rose-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-200"
            >
              Review critical result
            </button>
          </section>
        ) : null}

        <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard
            label="All results"
            value={summary.total}
            helper="Available panels"
            active={activeFilter === 'all'}
            tone="slate"
            onClick={() => setActiveFilter('all')}
          />
          <SummaryCard
            label="Critical"
            value={summary.critical}
            helper="Immediate review"
            active={activeFilter === 'critical'}
            tone="rose"
            onClick={() => setActiveFilter('critical')}
          />
          <SummaryCard
            label="Abnormal"
            value={summary.abnormal}
            helper="Outside range"
            active={activeFilter === 'abnormal'}
            tone="amber"
            onClick={() => setActiveFilter('abnormal')}
          />
          <SummaryCard
            label="Unreviewed"
            value={summary.unreviewed}
            helper="Awaiting acknowledgment"
            active={activeFilter === 'unreviewed'}
            tone="blue"
            onClick={() => setActiveFilter('unreviewed')}
          />
        </section>

        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[300px_minmax(0,1fr)_360px]">
          <aside className="print:hidden">
            <div className="sticky top-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-950">
                    Patient tests
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {filteredLabs.length} of {labs.length} shown
                  </p>
                </div>
                <FlaskIcon className="h-5 w-5 text-teal-700" />
              </div>

              <label className="relative mt-4 block">
                <span className="sr-only">
                  Search laboratory results
                </span>
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) =>
                    setQuery(event.target.value)
                  }
                  placeholder="Search Tests, Providers, IDs…"
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-9 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-100"
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
                  >
                    ×
                  </button>
                ) : null}
              </label>

              <div
                className="mt-3 flex flex-wrap gap-2"
                aria-label="Filter laboratory results"
              >
                {FILTERS.map((filter) => {
                  const active = activeFilter === filter.id;

                  return (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() =>
                        setActiveFilter(filter.id)
                      }
                      aria-pressed={active}
                      className={[
                        'inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-100',
                        active
                          ? 'border-teal-200 bg-teal-50 text-teal-800'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50',
                      ].join(' ')}
                    >
                      {filter.label}
                      <span
                        className={[
                          'rounded-full px-1.5 py-0.5 text-[10px]',
                          active
                            ? 'bg-teal-100 text-teal-800'
                            : 'bg-slate-100 text-slate-500',
                        ].join(' ')}
                      >
                        {filterCount(labs, filter.id)}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-3">
                <div className="text-xs font-semibold text-slate-500">Review status</div>
                <div className="mt-2 flex gap-2">
                  {(['all', 'reviewed', 'unreviewed'] as const).map((id) => {
                    const active = activeReviewFilter === id;

                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setActiveReviewFilter(id)}
                        aria-pressed={active}
                        className={[
                          'inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-100',
                          active
                            ? 'border-teal-200 bg-teal-50 text-teal-800'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50',
                        ].join(' ')}
                      >
                        {id === 'all' ? 'All' : id === 'reviewed' ? 'Reviewed' : 'Unreviewed'}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 max-h-[650px] space-y-2 overflow-y-auto pr-1">
                {filteredLabs.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center">
                    <SearchIcon className="mx-auto h-6 w-6 text-slate-400" />
                    <p className="mt-2 text-sm font-semibold text-slate-800">
                      No matching results
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setQuery('');
                        setActiveFilter('all');
                      }}
                      className="mt-3 text-sm font-semibold text-teal-700 hover:text-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
                    >
                      Clear filters
                    </button>
                  </div>
                ) : (
                  filteredLabs.map((lab) => {
                    const selected = lab.id === selectedLab.id;
                    const latest = getLatestPoint(lab);
                    const config = statusConfig(
                      lab.interpretation,
                    );

                    return (
                      <button
                        key={lab.id}
                        type="button"
                        onClick={() => setSelectedId(lab.id)}
                        aria-pressed={selected}
                        className={[
                          'group w-full rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-100',
                          selected
                            ? 'border-teal-300 bg-teal-50/80 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-teal-200 hover:bg-slate-50',
                        ].join(' ')}
                      >
                        <span className="flex items-start justify-between gap-3">
                          <span className="flex min-w-0 items-start gap-3">
                            <span
                              className={[
                                'mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-white',
                                config.dotClass,
                              ].join(' ')}
                              aria-hidden="true"
                            />
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-slate-950">
                                {lab.name}
                              </span>
                              <span className="mt-0.5 block text-xs text-slate-500">
                                {formatDate(lab.collectedAt)}
                              </span>
                            </span>
                          </span>

                          <ChevronRightIcon
                            className={[
                              'mt-0.5 h-4 w-4 shrink-0 transition',
                              selected
                                ? 'text-teal-700'
                                : 'text-slate-300 group-hover:translate-x-0.5 group-hover:text-slate-500',
                            ].join(' ')}
                          />
                        </span>

                        <span className="mt-3 flex items-end justify-between gap-3">
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-slate-800">
                              {latest
                                ? formatValue(
                                    latest.value,
                                    lab.unit,
                                  )
                                : 'No numeric value'}
                            </span>
                            <span className="mt-1 block text-xs text-slate-500">
                              {lab.reviewState === 'reviewed'
                                ? `Reviewed${
                                    lab.reviewedBy
                                      ? ` by ${lab.reviewedBy}`
                                      : ''
                                  }`
                                : 'Awaiting review'}
                            </span>
                          </span>

                          <StatusBadge
                            status={lab.interpretation}
                          />
                          <ComparatorBadge status={lab.comparatorStatus} />
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </aside>

          <main className="min-w-0 space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-bold text-slate-950 sm:text-2xl">
                        {selectedLab.name}
                      </h2>
                      <StatusBadge
                        status={selectedLab.interpretation}
                      />
                      <ComparatorBadge status={selectedLab.comparatorStatus} />
                      <span
                        className={[
                          'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold',
                          selectedLab.reviewState === 'reviewed'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-blue-200 bg-blue-50 text-blue-700',
                        ].join(' ')}
                      >
                        {selectedLab.reviewState === 'reviewed' ? (
                          <CheckIcon className="h-3.5 w-3.5" />
                        ) : (
                          <ClockIcon className="h-3.5 w-3.5" />
                        )}
                        {selectedLab.reviewState === 'reviewed'
                          ? 'Reviewed'
                          : 'Unreviewed'}
                      </span>
                    </div>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Collected{' '}
                      {formatDateTime(
                        selectedLab.collectedAt,
                      )}{' '}
                      • {selectedLab.specimen} • Ordered by{' '}
                      {selectedLab.orderingProvider}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {selectedLab.sourceResourceType} •{' '}
                      {selectedLab.sourceResourceId} •{' '}
                      {selectedLab.reportStatus}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleOpenSource}
                    className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-100 print:hidden"
                  >
                    Open full report
                    <ExternalLinkIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompareOpen(true)}
                    className="ml-2 inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-100 print:hidden"
                  >
                    Compare
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4 sm:p-6">
                <MetricCard
                  label={`Latest ${selectedLab.shortName}`}
                  value={
                    latestPoint
                      ? formatValue(
                          latestPoint.value,
                          selectedLab.unit,
                        )
                      : '—'
                  }
                  helper={formatDate(
                    latestPoint?.date ??
                      selectedLab.collectedAt,
                  )}
                  tone={selectedLab.interpretation}
                />

                <MetricCard
                  label="Change"
                  value={
                    latestPoint && previousPoint
                      ? `${latestPoint.value - previousPoint.value > 0 ? '+' : ''}${(
                          latestPoint.value -
                          previousPoint.value
                        ).toFixed(1)}`
                      : '—'
                  }
                  helper={trend?.label ?? 'No trend'}
                  tone={
                    trend?.tone === 'negative'
                      ? 'abnormal'
                      : trend?.tone === 'positive'
                        ? 'normal'
                        : 'indeterminate'
                  }
                />

                <MetricCard
                  label="Lowest"
                  value={
                    lowestPoint
                      ? formatValue(
                          lowestPoint.value,
                          selectedLab.unit,
                        )
                      : '—'
                  }
                  helper={formatDate(lowestPoint?.date)}
                  tone="indeterminate"
                />

                <MetricCard
                  label="Highest"
                  value={
                    highestPoint
                      ? formatValue(
                          highestPoint.value,
                          selectedLab.unit,
                        )
                      : '—'
                  }
                  helper={formatDate(highestPoint?.date)}
                  tone="indeterminate"
                />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-950">
                    Result trend
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Use the points to inspect the recorded date,
                    value, interpretation, and reference range.
                  </p>
                </div>

                <div
                  className="inline-flex w-fit rounded-xl border border-slate-200 bg-slate-50 p-1 print:hidden"
                  aria-label="Select trend time range"
                >
                  {TIME_RANGES.map((range) => (
                    <button
                      key={range.id}
                      type="button"
                      onClick={() => setTimeRange(range.id)}
                      aria-pressed={timeRange === range.id}
                      className={[
                        'min-h-8 rounded-lg px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300',
                        timeRange === range.id
                          ? 'bg-white text-teal-800 shadow-sm'
                          : 'text-slate-500 hover:text-slate-800',
                      ].join(' ')}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5">
                <TrendChart
                  points={visiblePoints}
                  referenceRange={selectedLab.referenceRange}
                  unit={selectedLab.unit}
                  label={selectedLab.shortName}
                />
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
                <div>
                  <h3 className="text-base font-bold text-slate-950">
                    Result details
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Reference ranges are supplied by the source
                    laboratory and may vary by method.
                  </p>
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  {selectedLab.analytes.length}{' '}
                  {selectedLab.analytes.length === 1
                    ? 'analyte'
                    : 'analytes'}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <caption className="sr-only">
                    Laboratory analytes for{' '}
                    {selectedLab.name}
                  </caption>
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th scope="col" className="px-5 py-3 sm:px-6">
                        Test
                      </th>
                      <th scope="col" className="px-5 py-3">
                        Result
                      </th>
                      <th scope="col" className="px-5 py-3">
                        Reference range
                      </th>
                      <th scope="col" className="px-5 py-3">
                        Interpretation
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedLab.analytes.map((analyte) => {
                      const config = statusConfig(
                        analyte.interpretation,
                      );

                      return (
                        <tr
                          key={analyte.id}
                          className={
                            analyte.interpretation ===
                            'critical'
                              ? 'bg-rose-50/50'
                              : 'hover:bg-slate-50/80'
                          }
                        >
                          <td className="px-5 py-4 sm:px-6">
                            <div className="font-semibold text-slate-950">
                              {analyte.name}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {analyte.code
                                ? `LOINC ${analyte.code}`
                                : 'Code not supplied'}
                            </div>
                          </td>
                          <td className="px-5 py-4 font-semibold tabular-nums text-slate-900">
                            {formatValue(
                              analyte.value,
                              analyte.unit,
                            )}
                          </td>
                          <td className="px-5 py-4 text-slate-600">
                            {analyte.referenceRange?.text ??
                              'Not supplied'}
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={[
                                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold',
                                config.badgeClass,
                              ].join(' ')}
                            >
                              <span
                                className={[
                                  'h-1.5 w-1.5 rounded-full',
                                  config.dotClass,
                                ].join(' ')}
                                aria-hidden="true"
                              />
                              {config.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 sm:p-6">
              <div>
                <h3 className="text-sm font-bold text-slate-950">
                  Report metadata
                </h3>
                <dl className="mt-4 space-y-3 text-sm">
                  <MetadataRow
                    label="Collected"
                    value={formatDateTime(
                      selectedLab.collectedAt,
                    )}
                  />
                  <MetadataRow
                    label="Issued"
                    value={formatDateTime(
                      selectedLab.issuedAt,
                    )}
                  />
                  <MetadataRow
                    label="Specimen"
                    value={selectedLab.specimen}
                  />
                  <MetadataRow
                    label="Ordering provider"
                    value={selectedLab.orderingProvider}
                  />
                </dl>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-950">
                  FHIR source
                </h3>
                <dl className="mt-4 space-y-3 text-sm">
                  <MetadataRow
                    label="Resource"
                    value={selectedLab.sourceResourceType}
                  />
                  <MetadataRow
                    label="Resource ID"
                    value={selectedLab.sourceResourceId}
                    monospace
                  />
                  <MetadataRow
                    label="FHIR version"
                    value="R4"
                  />
                  <MetadataRow
                    label="Validation"
                    value="Not validated in this view"
                  />
                </dl>
              </div>
            </section>
          </main>

          <aside className="print:hidden">
            <div className="sticky top-5 space-y-4">
              <section
                aria-live="polite"
                className="overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-sm"
              >
                <div className="border-b border-violet-100 bg-gradient-to-r from-violet-50 to-sky-50 px-5 py-4">
                  <div className="flex items-start gap-3">
                      <span className="rounded-xl bg-white p-2 text-violet-700 shadow-sm">
                        <SparklesIcon className="h-5 w-5" />
                      </span>
                      <div>
                        <h2 className="text-sm font-bold text-slate-950">
                          AI-assisted lab intelligence
                        </h2>
                        <p className="mt-1 text-xs text-slate-500">
                          Clinician review is required
                        </p>
                      </div>

                      <div className="ml-auto self-start">
                        <button
                          type="button"
                          onClick={() => setShowAIPanel((v) => !v)}
                          className="inline-flex items-center gap-2 rounded px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-100"
                        >
                          {showAIPanel ? 'Collapse' : 'Expand'}
                        </button>
                      </div>
                    </div>
                </div>

                {showAIPanel ? (
                  <div className="space-y-3 p-4">
                  <InsightCard
                    label="Overall status"
                    value={
                      clinicalInsights?.overall ?? '—'
                    }
                    tone={selectedLab.interpretation}
                  />

                  <InsightCard
                    label="Trend"
                    value={
                      clinicalInsights?.trend ?? '—'
                    }
                    tone="indeterminate"
                  />

                  <InsightCard
                    label="Urgency"
                    value={
                      clinicalInsights?.urgency ?? '—'
                    }
                    tone={
                      selectedLab.interpretation ===
                      'critical'
                        ? 'critical'
                        : selectedLab.interpretation ===
                            'abnormal'
                          ? 'abnormal'
                          : 'normal'
                    }
                  />

                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Suggested workflow
                    </h3>
                    <ul className="mt-3 space-y-2">
                      {clinicalInsights?.nextSteps.map(
                        (step) => (
                          <li
                            key={step}
                            className="flex items-start gap-2 text-sm leading-5 text-slate-700"
                          >
                            <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
                            {step}
                          </li>
                        ),
                      )}
                    </ul>
                  </div>

                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs leading-5 text-blue-900">
                    <strong>Important:</strong>{' '}
                    {clinicalInsights?.limitation}
                  </div>
                  </div>
                ) : (
                  <div className="p-4 text-sm text-slate-500">AI intelligence collapsed — expand to view insights and evidence.</div>
                )}
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="text-sm font-bold text-slate-950">
                  Quick actions
                </h2>
                <div className="mt-3 grid gap-2">
                  <QuickAction
                    label={
                      selectedLab.reviewState === 'reviewed'
                        ? 'Result reviewed'
                        : isReviewing
                          ? 'Saving review…'
                          : 'Mark as reviewed'
                    }
                    icon={<CheckIcon className="h-4 w-4" />}
                    onClick={handleReviewResult}
                    disabled={
                      selectedLab.reviewState === 'reviewed' ||
                      isReviewing
                    }
                    primary
                  />

                  <QuickAction
                    label="Create follow-up task"
                    icon={
                      <CalendarPlusIcon className="h-4 w-4" />
                    }
                    onClick={handleAddFollowUp}
                  />

                  <QuickAction
                    label="Message patient"
                    icon={
                      <MessageIcon className="h-4 w-4" />
                    }
                    onClick={handleMessagePatient}
                  />

                  <QuickAction
                    label="Export FHIR JSON"
                    icon={<DownloadIcon className="h-4 w-4" />}
                    onClick={handleExportFhir}
                  />
                </div>
              </section>
            </div>
          </aside>
        </div>

        {/* Compare modal (lightweight) */}
        <CompareModal
          open={compareOpen}
          onClose={() => setCompareOpen(false)}
          currentPoint={latestPoint}
          previousPoint={previousPoint}
          lab={selectedLab}
        />

        <div className="sticky bottom-4 z-30 mt-6 print:hidden">
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl shadow-slate-900/10 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:px-4">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span
                className={[
                  'h-2 w-2 rounded-full',
                  selectedStatus.dotClass,
                ].join(' ')}
                aria-hidden="true"
              />
              <span>
                {selectedLab.reviewState === 'reviewed'
                  ? `Reviewed${
                      selectedLab.reviewedBy
                        ? ` by ${selectedLab.reviewedBy}`
                        : ''
                    }`
                  : 'Awaiting clinician review'}
                {' • '}
                Updated {lastUpdatedLabel}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <ActionButton
                label="Message"
                icon={<MessageIcon className="h-4 w-4" />}
                onClick={handleMessagePatient}
              />

              <ActionButton
                label="Add follow-up"
                icon={
                  <CalendarPlusIcon className="h-4 w-4" />
                }
                onClick={handleAddFollowUp}
              />

              <button
                type="button"
                onClick={handleReviewResult}
                disabled={
                  selectedLab.reviewState === 'reviewed' ||
                  isReviewing
                }
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white transition hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-200 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <CheckIcon className="h-4 w-4" />
                {selectedLab.reviewState === 'reviewed'
                  ? 'Reviewed'
                  : isReviewing
                    ? 'Saving…'
                    : 'Mark reviewed'}
              </button>
            </div>
          </div>
        </div>

        <div
          aria-live="polite"
          aria-atomic="true"
          className="pointer-events-none fixed bottom-5 right-5 z-50 w-[min(380px,calc(100vw-2rem))] print:hidden"
        >
          {notice ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-900 shadow-lg">
              {notice}
            </div>
          ) : null}

          {errorMessage ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-900 shadow-lg">
              {errorMessage}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  helper,
  active,
  tone,
  onClick,
}: {
  label: string;
  value: number;
  helper: string;
  active: boolean;
  tone: 'slate' | 'rose' | 'amber' | 'blue';
  onClick: () => void;
}) {
  const toneClasses = {
    slate: active
      ? 'border-slate-400 bg-slate-100'
      : 'border-slate-200 bg-white hover:bg-slate-50',
    rose: active
      ? 'border-rose-300 bg-rose-50'
      : 'border-slate-200 bg-white hover:border-rose-200 hover:bg-rose-50/50',
    amber: active
      ? 'border-amber-300 bg-amber-50'
      : 'border-slate-200 bg-white hover:border-amber-200 hover:bg-amber-50/50',
    blue: active
      ? 'border-blue-300 bg-blue-50'
      : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/50',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        'rounded-2xl border p-4 text-left shadow-sm transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-100',
        toneClasses[tone],
      ].join(' ')}
    >
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <span className="mt-2 block text-2xl font-bold tabular-nums text-slate-950">
        {value}
      </span>
      <span className="mt-1 block text-xs text-slate-500">
        {helper}
      </span>
    </button>
  );
}

function MetricCard({
  label,
  value,
  helper,
  tone,
}: {
  label: string;
  value: string;
  helper: string;
  tone: LabInterpretation;
}) {
  const config = statusConfig(tone);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-2 break-words text-xl font-bold tabular-nums text-slate-950">
        {value}
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
        <span
          className={[
            'h-1.5 w-1.5 rounded-full',
            config.dotClass,
          ].join(' ')}
          aria-hidden="true"
        />
        {helper}
      </div>
    </div>
  );
}

function comparatorStatusLabel(status: ComparatorStatus): string {
  switch (status) {
    case 'major-increase':
      return 'Major increase';
    case 'major-decrease':
      return 'Major decrease';
    case 'newly-abnormal':
      return 'Newly abnormal';
    case 'returned-to-range':
      return 'Returned to range';
    case 'not-comparable':
      return 'Not directly comparable';
    case 'increasing':
      return 'Increasing';
    case 'decreasing':
      return 'Decreasing';
    case 'stable':
      return 'Stable';
    case 'new':
      return 'New result';
  }
}

function ComparatorBadge({ status }: { status?: ComparatorStatus }) {
  if (!status) {
    return null;
  }

  const emphasized = status === 'major-increase'
    || status === 'major-decrease'
    || status === 'newly-abnormal';
  const positive = status === 'returned-to-range';
  const className = emphasized
    ? 'border-amber-200 bg-amber-50 text-amber-800'
    : positive
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : status === 'not-comparable'
        ? 'border-slate-200 bg-slate-50 text-slate-700'
        : 'border-blue-200 bg-blue-50 text-blue-700';

  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>
      <span aria-hidden="true">{emphasized ? '!' : positive ? '+' : 'i'}</span>
      Roshi: {comparatorStatusLabel(status)}
    </span>
  );
}

function StatusBadge({
  status,
}: {
  status: LabInterpretation;
}) {
  const config = statusConfig(status);

  return (
    <span
      className={[
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold',
        config.badgeClass,
      ].join(' ')}
    >
      <span
        className={[
          'h-1.5 w-1.5 rounded-full',
          config.dotClass,
        ].join(' ')}
        aria-hidden="true"
      />
      {config.label}
    </span>
  );
}

function InsightCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: LabInterpretation;
}) {
  const config = statusConfig(tone);

  return (
    <div
      className={[
        'rounded-xl border p-4',
        config.panelClass,
      ].join(' ')}
    >
      <h3 className="text-xs font-bold uppercase tracking-wide opacity-70">
        {label}
      </h3>
      <p className="mt-2 text-sm leading-6">{value}</p>
    </div>
  );
}

function MetadataRow({
  label,
  value,
  monospace = false,
}: {
  label: string;
  value: string;
  monospace?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
      <dt className="text-slate-500">{label}</dt>
      <dd
        className={[
          'max-w-[65%] break-words text-right font-medium text-slate-900',
          monospace ? 'font-mono text-xs' : '',
        ].join(' ')}
      >
        {value}
      </dd>
    </div>
  );
}

function ActionButton({
  label,
  icon,
  onClick,
  disabled = false,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-100 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {icon}
      {label}
    </button>
  );
}

function QuickAction({
  label,
  icon,
  onClick,
  disabled = false,
  primary = false,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'inline-flex min-h-11 w-full items-center justify-start gap-2 rounded-xl px-3.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-60',
        primary
          ? 'bg-teal-700 text-white hover:bg-teal-800 focus-visible:ring-teal-200'
          : 'border border-slate-200 bg-white text-slate-700 hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800 focus-visible:ring-teal-100',
      ].join(' ')}
    >
      {icon}
      {label}
    </button>
  );
}

function TrendChart({
  points,
  referenceRange,
  unit,
  label,
}: {
  points: LabPoint[];
  referenceRange?: ReferenceRange;
  unit: string;
  label: string;
}) {
  const [activeIndex, setActiveIndex] =
    useState<number | null>(null);

  const width = 760;
  const height = 290;
  const padding = {
    top: 24,
    right: 24,
    bottom: 50,
    left: 62,
  };

  if (points.length === 0) {
    return (
      <div className="grid min-h-[260px] place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
        <div>
          <ChartIcon className="mx-auto h-7 w-7 text-slate-400" />
          <p className="mt-3 text-sm font-semibold text-slate-800">
            No numeric trend data
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Review the source report for the original result.
          </p>
        </div>
      </div>
    );
  }

  const chartWidth =
    width - padding.left - padding.right;

  const chartHeight =
    height - padding.top - padding.bottom;

  const candidateValues = [
    ...points.map((point) => point.value),
    referenceRange?.low,
    referenceRange?.high,
  ].filter(
    (value): value is number =>
      typeof value === 'number' &&
      Number.isFinite(value),
  );

  const rawMin = Math.min(...candidateValues);
  const rawMax = Math.max(...candidateValues);
  const rawRange = rawMax - rawMin || Math.abs(rawMax) || 1;
  const domainPadding = rawRange * 0.16;

  const minValue = Math.max(0, rawMin - domainPadding);
  const maxValue = rawMax + domainPadding;
  const valueRange = maxValue - minValue || 1;

  const xForIndex = (index: number) =>
    points.length === 1
      ? padding.left + chartWidth / 2
      : padding.left +
        (index / (points.length - 1)) * chartWidth;

  const yForValue = (value: number) =>
    padding.top +
    chartHeight -
    ((value - minValue) / valueRange) * chartHeight;

  const chartPoints = points.map((point, index) => ({
    ...point,
    x: xForIndex(index),
    y: yForValue(point.value),
  }));

  const linePath = chartPoints
    .map(
      (point, index) =>
        `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`,
    )
    .join(' ');

  const areaPath = `${linePath} L ${
    chartPoints.at(-1)?.x ?? padding.left
  } ${padding.top + chartHeight} L ${
    chartPoints[0]?.x ?? padding.left
  } ${padding.top + chartHeight} Z`;

  const yTicks = Array.from({ length: 5 }, (_, index) => {
    const ratio = index / 4;
    const value = maxValue - ratio * valueRange;
    const y = padding.top + ratio * chartHeight;

    return {
      value,
      y,
    };
  });

  const referenceLowY =
    referenceRange?.low !== undefined
      ? yForValue(referenceRange.low)
      : undefined;

  const referenceHighY =
    referenceRange?.high !== undefined
      ? yForValue(referenceRange.high)
      : undefined;

  const activePoint =
    activeIndex === null
      ? undefined
      : chartPoints[activeIndex];

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        role="img"
        aria-labelledby="lab-trend-title lab-trend-description"
        className="min-h-[260px] overflow-visible"
      >
        <title id="lab-trend-title">{`${label} result trend`}</title>
        <desc id="lab-trend-description">
          {points.length} recorded values from{' '}
          {formatDate(points[0]?.date)} to{' '}
          {formatDate(points.at(-1)?.date)}.
        </desc>

        <defs>
          <linearGradient
            id="labTrendArea"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop
              offset="0%"
              stopColor="#0f766e"
              stopOpacity="0.22"
            />
            <stop
              offset="100%"
              stopColor="#0f766e"
              stopOpacity="0.01"
            />
          </linearGradient>
        </defs>

        {referenceLowY !== undefined &&
        referenceHighY !== undefined ? (
          <rect
            x={padding.left}
            y={Math.min(referenceLowY, referenceHighY)}
            width={chartWidth}
            height={Math.abs(
              referenceHighY - referenceLowY,
            )}
            rx={8}
            fill="#ecfdf5"
          />
        ) : null}

        {yTicks.map((tick) => (
          <g key={tick.y}>
            <line
              x1={padding.left}
              x2={padding.left + chartWidth}
              y1={tick.y}
              y2={tick.y}
              stroke="#e2e8f0"
              strokeWidth="1"
            />
            <text
              x={padding.left - 10}
              y={tick.y + 4}
              textAnchor="end"
              fontSize="11"
              fill="#64748b"
            >
              {tick.value.toFixed(
                valueRange < 10 ? 1 : 0,
              )}
            </text>
          </g>
        ))}

        {referenceRange?.high !== undefined ? (
          <line
            x1={padding.left}
            x2={padding.left + chartWidth}
            y1={yForValue(referenceRange.high)}
            y2={yForValue(referenceRange.high)}
            stroke="#f59e0b"
            strokeDasharray="5 5"
            strokeWidth="1.5"
          />
        ) : null}

        {referenceRange?.low !== undefined ? (
          <line
            x1={padding.left}
            x2={padding.left + chartWidth}
            y1={yForValue(referenceRange.low)}
            y2={yForValue(referenceRange.low)}
            stroke="#f59e0b"
            strokeDasharray="5 5"
            strokeWidth="1.5"
          />
        ) : null}

        <path d={areaPath} fill="url(#labTrendArea)" />
        <path
          d={linePath}
          fill="none"
          stroke="#0f766e"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {chartPoints.map((point, index) => {
          const config = statusConfig(
            point.interpretation,
          );

          const stroke =
            point.interpretation === 'critical'
              ? '#e11d48'
              : point.interpretation === 'abnormal'
                ? '#d97706'
                : '#0f766e';

          return (
            <g key={point.id}>
              <circle
                cx={point.x}
                cy={point.y}
                r={activeIndex === index ? 8 : 6}
                fill="white"
                stroke={stroke}
                strokeWidth="3"
                tabIndex={0}
                role="button"
                aria-label={`${formatDate(
                  point.date,
                )}: ${point.value} ${unit}, ${
                  config.label
                }`}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
                onFocus={() => setActiveIndex(index)}
                onBlur={() => setActiveIndex(null)}
                className="cursor-pointer outline-none transition"
              />

              <text
                x={point.x}
                y={height - 17}
                textAnchor="middle"
                fontSize="11"
                fill="#64748b"
              >
                {formatDate(point.date, {
                  month: 'short',
                  year: '2-digit',
                })}
              </text>
            </g>
          );
        })}

        <text
          x={16}
          y={padding.top + chartHeight / 2}
          transform={`rotate(-90 16 ${
            padding.top + chartHeight / 2
          })`}
          textAnchor="middle"
          fontSize="11"
          fill="#64748b"
        >
          {unit}
        </text>
      </svg>

      {activePoint ? (
        <div
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-xl bg-slate-950 px-3 py-2 text-xs text-white shadow-xl"
          style={{
            left: `${(activePoint.x / width) * 100}%`,
            top: `${(activePoint.y / height) * 100}%`,
          }}
        >
          <div className="font-semibold">
            {formatDate(activePoint.date)}
          </div>
          <div className="mt-1">
            {formatValue(activePoint.value, unit)}
          </div>
          <div className="mt-1 text-slate-300">
            {statusConfig(activePoint.interpretation).label}
          </div>
          {referenceRange ? (
            <div className="text-slate-300">
              Range: {referenceRange.text}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ArrowLeftIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M15 18l-6-6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SearchIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="11"
        cy="11"
        r="7"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="m20 20-3.5-3.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function RefreshIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M20 11a8 8 0 10-2.35 5.65"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M20 4v7h-7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DownloadIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PrinterIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M7 8V3h10v5M7 17H5a2 2 0 01-2-2v-4a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2h-2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 14h10v7H7z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CodeIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m8 9-3 3 3 3m8-6 3 3-3 3m-5 3 2-12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FlaskIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M9 3h6m-5 0v6l-5.5 9.5A1.7 1.7 0 006 21h12a1.7 1.7 0 001.5-2.5L14 9V3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 15h9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SparklesIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 3l1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3zM18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14zM5 14l.7 1.8L7.5 16.5l-1.8.7L5 19l-.7-1.8-1.8-.7 1.8-.7L5 14z"
        fill="currentColor"
      />
    </svg>
  );
}

function AlertTriangleIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M10.3 4.2 2.9 17a2 2 0 001.7 3h14.8a2 2 0 001.7-3L13.7 4.2a2 2 0 00-3.4 0z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M12 9v4m0 3h.01"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m5 12 4 4L19 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClockIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M12 7v5l3 2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CalendarPlusIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 011 1v14H4V6a1 1 0 011-1z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 12v5m-2.5-2.5h5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MessageIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 5h16v11H8l-4 4V5z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRightIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m9 18 6-6-6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ExternalLinkIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M14 4h6v6m0-6-9 9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 13v7H4V4h7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChartIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 19V5m0 14h16M7 15l4-4 3 2 5-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CompareModal({
  open,
  onClose,
  currentPoint,
  previousPoint,
  lab,
}: {
  open: boolean;
  onClose: () => void;
  currentPoint?: LabPoint;
  previousPoint?: LabPoint;
  lab?: LabPanel;
}) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Compare results</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-sm text-slate-600 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-slate-500">Previous</div>
            <div className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{previousPoint ? formatValue(previousPoint.value, lab?.unit) : '—'}</div>
            <div className="mt-1 text-sm text-slate-500">{previousPoint ? formatDateTime(previousPoint.date) : 'No previous value'}</div>
          </div>

          <div className="text-center">
            <div className="text-xs text-slate-500">Change</div>
            <div className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
              {previousPoint && currentPoint
                ? `${currentPoint.value - previousPoint.value > 0 ? '+' : ''}${(currentPoint.value - previousPoint.value).toFixed(1)}`
                : '—'}
            </div>
            <div className="mt-1 text-sm text-slate-500">{previousPoint && currentPoint ? `${Math.abs(Math.round(((currentPoint.value - previousPoint.value) / Math.max(1, previousPoint.value)) * 100))}%` : ''}</div>
          </div>

          <div>
            <div className="text-xs text-slate-500">Current</div>
            <div className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{currentPoint ? formatValue(currentPoint.value, lab?.unit) : '—'}</div>
            <div className="mt-1 text-sm text-slate-500">{currentPoint ? formatDateTime(currentPoint.date) : ''}</div>
          </div>
        </div>

        <div className="mt-6 text-sm text-slate-600">
          <div><strong>Note:</strong> Ensure units and methods are compatible before interpreting numeric changes.</div>
        </div>
      </div>
    </div>
  );
}















