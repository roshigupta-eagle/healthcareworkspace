import type { LabComparisonGroup } from './labComparator';

export interface ComparatorApiWarning {
  readonly code: 'notComparable' | 'unmappedParameter' | 'sourceUnavailable';
  readonly parameterKey: string;
  readonly detail: string;
}

export interface ComparatorApiResponse {
  readonly data: {
    readonly patientId: string;
    readonly parameters: readonly LabComparisonGroup[];
  };
  readonly warnings: readonly ComparatorApiWarning[];
  readonly meta: {
    readonly projectionRevision: string;
    readonly generatedAt: string;
    readonly source: string;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isComparatorApiResponse(value: unknown): value is ComparatorApiResponse {
  if (!isRecord(value) || !isRecord(value.data) || !Array.isArray(value.data.parameters)) {
    return false;
  }

  return typeof value.data.patientId === 'string'
    && Array.isArray(value.warnings)
    && isRecord(value.meta)
    && typeof value.meta.projectionRevision === 'string'
    && typeof value.meta.generatedAt === 'string'
    && typeof value.meta.source === 'string';
}

export async function fetchLabComparator(patientId: string): Promise<ComparatorApiResponse> {
  const response = await fetch(`/api/patients/${encodeURIComponent(patientId)}/lab-comparator`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  const payload: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    const detail = isRecord(payload) && typeof payload.detail === 'string'
      ? payload.detail
      : 'The laboratory comparison could not be loaded.';
    throw new Error(detail);
  }

  if (!isComparatorApiResponse(payload)) {
    throw new Error('The laboratory comparison response was invalid.');
  }

  return payload;
}
