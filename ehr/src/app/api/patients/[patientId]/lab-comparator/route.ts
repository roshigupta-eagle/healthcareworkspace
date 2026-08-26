import { NextResponse } from 'next/server';
import { getPatientById } from '@/app/dashboard/records/mockPatients';
import { resolveSession } from '@/lib/serverAuth';
import { logAuditEvent } from '@/lib/audit';
import { getFhirLabResults } from '@/lib/labComparatorFhir';
import {
  buildComparisonGroups,
  type LabComparisonGroup,
  type RawLabResult,
} from '@/lib/labComparator';

interface ComparatorWarning {
  readonly code: 'notComparable' | 'unmappedParameter' | 'sourceUnavailable';
  readonly parameterKey: string;
  readonly detail: string;
}

interface ComparatorResponse {
  readonly patientId: string;
  readonly parameters: readonly LabComparisonGroup[];
}

function problem(
  status: number,
  code: string,
  title: string,
  detail: string,
  retryable = false,
  correlationId = crypto.randomUUID(),
): NextResponse {
  return NextResponse.json(
    {
      type: `https://healthcareworkspace.local/problems/${code}`,
      title,
      status,
      code,
      detail,
      correlationId,
      retryable,
    },
    {
      status,
      headers: { 'Content-Type': 'application/problem+json' },
    },
  );
}

function toRawLabResult(value: unknown): RawLabResult | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;
  const id = typeof candidate.id === 'string' ? candidate.id : undefined;
  const name = typeof candidate.name === 'string' ? candidate.name : undefined;
  const date = typeof candidate.date === 'string' ? candidate.date : undefined;
  const result = typeof candidate.result === 'number' || typeof candidate.result === 'string'
    ? candidate.result
    : undefined;

  if (!id || !name || !date || result === undefined) {
    return undefined;
  }

  return {
    id,
    name,
    date,
    result,
    ...(typeof candidate.unit === 'string' ? { unit: candidate.unit } : {}),
    ...(typeof candidate.normalRange === 'string' ? { normalRange: candidate.normalRange } : {}),
    ...(typeof candidate.referenceRange === 'string' ? { referenceRange: candidate.referenceRange } : {}),
    ...(typeof candidate.interpretation === 'string' ? { interpretation: candidate.interpretation } : {}),
    ...(typeof candidate.status === 'string' ? { status: candidate.status } : {}),
    ...(typeof candidate.code === 'string' ? { code: candidate.code } : {}),
    ...(typeof candidate.codeSystem === 'string' ? { codeSystem: candidate.codeSystem } : {}),
    ...(typeof candidate.provider === 'string' ? { provider: candidate.provider } : {}),
    ...(typeof candidate.laboratory === 'string' ? { laboratory: candidate.laboratory } : {}),
    ...(typeof candidate.specimen === 'string' ? { specimen: candidate.specimen } : {}),
    ...(typeof candidate.method === 'string' ? { method: candidate.method } : {}),
    ...(typeof candidate.reportId === 'string' ? { reportId: candidate.reportId } : {}),
  };
}

export async function GET(
  request: Request,
  { params }: { params: { patientId: string } | Promise<{ patientId: string }> },
): Promise<NextResponse> {
  const session = await resolveSession(request);
  const patientParameters = await params;
  const patientId = String(patientParameters.patientId ?? '').trim();
  const usesCanonicalFhir = Boolean(process.env.FHIR_SERVER_URL);
  const correlationId = request.headers.get('x-correlation-id') ?? crypto.randomUUID();

  if (!session && process.env.NODE_ENV === 'production') {
    return problem(401, 'unauthorized', 'Unauthorized', 'A valid clinical session is required.', false, correlationId);
  }

  if (!patientId) {
    return problem(400, 'invalidPatientId', 'Invalid patient', 'A patient identifier is required.', false, correlationId);
  }

  if (process.env.NODE_ENV === 'production' && !usesCanonicalFhir) {
    return problem(503, 'sourceUnavailable', 'Laboratory source unavailable', 'FHIR_SERVER_URL must be configured before laboratory comparison is enabled.', true, correlationId);
  }

  if (!usesCanonicalFhir && !getPatientById(patientId)) {
    return problem(404, 'patientNotFound', 'Patient not found', 'The requested patient could not be located.', false, correlationId);
  }

  let rawResults: RawLabResult[] = [];
  let source = 'ehr-development-adapter';
  const warnings: ComparatorWarning[] = [];

  if (usesCanonicalFhir) {
    try {
      rawResults = await getFhirLabResults(patientId);
      source = 'fhir-r4';
    } catch {
      source = 'fhir-r4-unavailable';
      warnings.push({
        code: 'sourceUnavailable',
        parameterKey: 'all',
        detail: 'The canonical FHIR laboratory source was unavailable. No development data was substituted.',
      });
    }
  } else {
    const patient = getPatientById(patientId);
    rawResults = (Array.isArray(patient?.labResults) ? patient.labResults : [])
      .map((result: unknown) => toRawLabResult(result))
      .filter((result): result is RawLabResult => result !== undefined);
  }

  const parameters = buildComparisonGroups(rawResults);
  const url = new URL(request.url);
  const requestedParameter = url.searchParams.get('parameter')?.trim();
  const filteredParameters = requestedParameter
    ? parameters.filter((parameter) => parameter.parameterKey === requestedParameter || parameter.name === requestedParameter)
    : parameters;

  for (const parameter of filteredParameters) {
    if (parameter.mappingStatus === 'unmapped') {
      warnings.push({
        code: 'unmappedParameter',
        parameterKey: parameter.parameterKey,
        detail: `${parameter.name} has not been mapped to an approved standardized parameter.`,
      });
    } else if (!parameter.evaluation.comparable) {
      warnings.push({
        code: 'notComparable',
        parameterKey: parameter.parameterKey,
        detail: parameter.evaluation.explanation.join(' '),
      });
    }
  }

  if (typeof session?.user?.id === 'string') {
    void logAuditEvent({
      agentId: session.user.id,
      entityType: 'Patient',
      entityId: patientId,
      action: 'R',
      outcome: 'success',
      detail: { correlationId, source, warningCount: warnings.length },
      description: 'Opened laboratory comparator',
    });
  }
  const response: ComparatorResponse = {
    patientId,
    parameters: filteredParameters,
  };

  return NextResponse.json({
    data: response,
    warnings,
    meta: {
      projectionRevision: usesCanonicalFhir ? 'fhir-source-v1' : 'mock-source-v1',
      generatedAt: new Date().toISOString(),
      source,
      correlationId,
    },
  });
}
