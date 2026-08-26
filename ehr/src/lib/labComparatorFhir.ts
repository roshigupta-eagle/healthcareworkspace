import { fhirSearch } from '@/lib/fhir-client';
import type { RawLabResult } from './labComparator';

type FhirResource = Record<string, unknown>;

type FhirLabValue = {
  readonly result: string | number;
  readonly unit?: string;
};

function asRecord(value: unknown): FhirResource | undefined {
  return typeof value === 'object' && value !== null
    ? value as FhirResource
    : undefined;
}

function stringField(resource: FhirResource | undefined, key: string): string | undefined {
  const value = resource?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function firstCoding(value: unknown): FhirResource | undefined {
  const concept = asRecord(value);
  const coding = concept?.coding;
  if (!Array.isArray(coding)) {
    return undefined;
  }

  const codings = coding.map((entry) => asRecord(entry)).filter((entry): entry is FhirResource => entry !== undefined);
  return codings.find((entry) => {
    const system = stringField(entry, 'system');
    return system === 'http://loinc.org' || system === 'https://fhir.infoway-inforoute.ca/CodeSystem/pCLOCD';
  }) ?? codings[0];
}

function codeDisplay(value: unknown): { readonly code?: string; readonly system?: string; readonly display?: string } {
  const coding = firstCoding(value);
  const concept = asRecord(value);

  return {
    ...(stringField(coding, 'code') ? { code: stringField(coding, 'code') } : {}),
    ...(stringField(coding, 'system') ? { system: stringField(coding, 'system') } : {}),
    ...(stringField(coding, 'display') ?? stringField(concept, 'text')
      ? { display: stringField(coding, 'display') ?? stringField(concept, 'text') }
      : {}),
  };
}

function referenceDisplay(value: unknown): string | undefined {
  const reference = asRecord(value);
  return stringField(reference, 'display') ?? stringField(reference, 'reference');
}

function firstReferenceDisplay(value: unknown): string | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return referenceDisplay(value[0]);
}

function extractValue(observation: FhirResource): FhirLabValue | undefined {
  const quantity = asRecord(observation.valueQuantity);
  if (quantity) {
    const value = quantity.value;
    if (typeof value === 'number' && Number.isFinite(value)) {
      return {
        result: value,
        ...(stringField(quantity, 'unit') ?? stringField(quantity, 'code')
          ? { unit: stringField(quantity, 'unit') ?? stringField(quantity, 'code') }
          : {}),
      };
    }
  }

  const valueString = stringField(observation, 'valueString');
  if (valueString) {
    return { result: valueString };
  }

  const codedValue = codeDisplay(observation.valueCodeableConcept);
  if (codedValue.display) {
    return { result: codedValue.display };
  }

  const valueBoolean = observation.valueBoolean;
  if (typeof valueBoolean === 'boolean') {
    return { result: String(valueBoolean) };
  }

  return undefined;
}

function extractReferenceRange(value: unknown): string | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const range = asRecord(value[0]);
  if (!range) {
    return undefined;
  }

  const text = stringField(range, 'text');
  if (text) {
    return text;
  }

  const low = asRecord(range.low);
  const high = asRecord(range.high);
  const lowValue = low?.value;
  const highValue = high?.value;
  const unit = stringField(high, 'unit') ?? stringField(low, 'unit');
  const unitSuffix = unit ? ` ${unit}` : '';

  if (typeof lowValue === 'number' && typeof highValue === 'number') {
    return `${lowValue}-${highValue}${unitSuffix}`;
  }

  if (typeof highValue === 'number') {
    return `< ${highValue}${unitSuffix}`;
  }

  if (typeof lowValue === 'number') {
    return `> ${lowValue}${unitSuffix}`;
  }

  return undefined;
}

function reportReferences(reports: readonly FhirResource[]): ReadonlyMap<string, string> {
  const result = new Map<string, string>();

  for (const report of reports) {
    const reportId = stringField(report, 'id');
    const reportResults = report.result;
    if (!reportId || !Array.isArray(reportResults)) {
      continue;
    }

    for (const reportResult of reportResults) {
      const reference = stringField(asRecord(reportResult), 'reference');
      const observationId = reference?.split('/').at(-1);
      if (reference?.includes('/Observation/') || reference?.startsWith('Observation/')) {
        if (observationId) {
          result.set(observationId, reportId);
        }
      }
    }
  }

  return result;
}

export async function getFhirLabResults(patientId: string): Promise<RawLabResult[]> {
  const [observations, reports] = await Promise.all([
    fhirSearch<FhirResource>('Observation', {
      patient: patientId,
      category: 'laboratory',
      _sort: '-date',
      _count: '200',
    }),
    fhirSearch<FhirResource>('DiagnosticReport', {
      patient: patientId,
      category: 'LAB',
      _sort: '-date',
      _count: '100',
    }),
  ]);
  const reportByObservationId = reportReferences(reports);

  return observations.flatMap((observation) => {
    const id = stringField(observation, 'id');
    const effective = stringField(observation, 'effectiveDateTime')
      ?? stringField(asRecord(observation.effectivePeriod), 'start');
    const code = codeDisplay(observation.code);
    const value = extractValue(observation);

    if (!id || !effective || !code.display || !value) {
      return [];
    }

    const reportId = reportByObservationId.get(id);
    const report = reports.find((candidate) => candidate.id === reportId);
    const source = firstReferenceDisplay(report?.performer) ?? firstReferenceDisplay(observation.performer);
    const interpretation = codeDisplay(Array.isArray(observation.interpretation) ? observation.interpretation[0] : undefined);

    return [{
      id,
      name: code.display,
      result: value.result,
      date: effective,
      ...(value.unit ? { unit: value.unit } : {}),
      ...(stringField(observation.issued) ? { issuedAt: stringField(observation.issued) } : {}),
      ...(stringField(observation.status) ? { status: stringField(observation.status) } : {}),
      ...(interpretation.code ?? interpretation.display ? { interpretation: interpretation.code ?? interpretation.display } : {}),
      ...(code.code ? { code: code.code } : {}),
      ...(code.system ? { codeSystem: code.system } : {}),
      ...(source ? { provider: source, laboratory: source } : {}),
      ...(firstReferenceDisplay(observation.specimen) ? { specimen: firstReferenceDisplay(observation.specimen) } : {}),
      ...(codeDisplay(observation.method).display ? { method: codeDisplay(observation.method).display } : {}),
      ...(extractReferenceRange(observation.referenceRange) ? { referenceRange: extractReferenceRange(observation.referenceRange) } : {}),
      ...(reportId ? { reportId } : {}),
      sourceSystem: 'FHIR_R4',
    } satisfies RawLabResult];
  });
}
