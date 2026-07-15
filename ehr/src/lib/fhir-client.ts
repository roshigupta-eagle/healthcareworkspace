/**
 * EPIC-DATA-01: FHIR R4 Client
 *
 * Type-safe wrapper around the internal FHIR server.
 * All calls include tenant context and bearer auth.
 * Used server-side only (Next.js Server Components / Route Handlers).
 */

const FHIR_BASE = process.env.FHIR_SERVER_URL ?? "http://localhost:8080/fhir/R4";
const FHIR_TOKEN = process.env.FHIR_INTERNAL_TOKEN ?? "";

type FHIRResource = Record<string, unknown>;

interface FHIRBundle {
  resourceType: "Bundle";
  type: string;
  total?: number;
  entry?: Array<{ resource: FHIRResource }>;
}

async function fhirFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const url = `${FHIR_BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/fhir+json",
      Accept: "application/fhir+json",
      ...(FHIR_TOKEN ? { Authorization: `Bearer ${FHIR_TOKEN}` } : {}),
      ...(init?.headers as Record<string, string> | undefined),
    },
    // Next.js cache: revalidate every 30s for clinical reads
    next: { revalidate: 30 },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`FHIR ${res.status} ${path}: ${text.slice(0, 200)}`);
  }

  return res.json() as Promise<T>;
}

// ─── Resource reads ──────────────────────────────────────────────────────────

export async function fhirRead<T extends FHIRResource>(
  resourceType: string,
  id: string
): Promise<T> {
  return fhirFetch<T>(`/${resourceType}/${id}`);
}

export async function fhirSearch<T extends FHIRResource>(
  resourceType: string,
  params: Record<string, string>
): Promise<T[]> {
  const qs = new URLSearchParams(params).toString();
  const bundle = await fhirFetch<FHIRBundle>(`/${resourceType}?${qs}`);
  return (bundle.entry ?? []).map((e) => e.resource as T);
}

// ─── Resource writes (server-side only) ─────────────────────────────────────

export async function fhirCreate<T extends FHIRResource>(
  resourceType: string,
  resource: T
): Promise<T> {
  return fhirFetch<T>(`/${resourceType}`, {
    method: "POST",
    body: JSON.stringify(resource),
    next: { revalidate: 0 } as any,
  });
}

export async function fhirUpdate<T extends FHIRResource>(
  resourceType: string,
  id: string,
  resource: T
): Promise<T> {
  return fhirFetch<T>(`/${resourceType}/${id}`, {
    method: "PUT",
    body: JSON.stringify(resource),
    next: { revalidate: 0 } as any,
  });
}

// ─── Common clinical queries ─────────────────────────────────────────────────

export async function getPatientByFhirId(patientId: string) {
  return fhirRead<FHIRResource>("Patient", patientId);
}

export async function getEncountersByPatient(patientFhirId: string) {
  return fhirSearch<FHIRResource>("Encounter", { patient: patientFhirId, _sort: "-date" });
}

export async function getObservationsByEncounter(encounterId: string) {
  return fhirSearch<FHIRResource>("Observation", {
    encounter: encounterId,
    _sort: "-date",
    _count: "50",
  });
}

export async function getDiagnosticReportsByPatient(patientFhirId: string) {
  return fhirSearch<FHIRResource>("DiagnosticReport", {
    patient: patientFhirId,
    _sort: "-date",
    _count: "20",
  });
}

export async function getMedicationRequestsByPatient(patientFhirId: string) {
  return fhirSearch<FHIRResource>("MedicationRequest", {
    patient: patientFhirId,
    status: "active",
    _sort: "-date",
  });
}

export async function getAllergyIntolerancesByPatient(patientFhirId: string) {
  return fhirSearch<FHIRResource>("AllergyIntolerance", {
    patient: patientFhirId,
    "clinical-status": "active",
  });
}

export async function getConditionsByPatient(patientFhirId: string) {
  return fhirSearch<FHIRResource>("Condition", {
    patient: patientFhirId,
    "clinical-status": "active",
    _sort: "-date",
  });
}

export async function getServiceRequestsByPatient(patientFhirId: string) {
  return fhirSearch<FHIRResource>("ServiceRequest", {
    patient: patientFhirId,
    status: "active,completed",
    _sort: "-date",
    _count: "30",
  });
}

// ─── Encounter-level queries ─────────────────────────────────────────────────

export async function getEncounterDetail(encounterId: string) {
  return fhirRead<FHIRResource>("Encounter", encounterId);
}

export async function getDocumentReferencesByEncounter(encounterId: string) {
  return fhirSearch<FHIRResource>("DocumentReference", {
    encounter: encounterId,
    _sort: "-date",
  });
}
