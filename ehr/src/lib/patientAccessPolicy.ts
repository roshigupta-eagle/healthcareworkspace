export type PatientApiDecision = { readonly ok: true } | { readonly ok: false; readonly status: 403; readonly error: string };

const CLINICAL_STAFF = new Set(['DOCTOR', 'NURSE', 'CLINICIAN', 'PRACTITIONER']);
const PHARMACY_SECTIONS = new Set(['medications', 'medication-reconciliation', 'allergies', 'allergy-review', 'allergy-safety-retry']);
const PHARMACY_READ_ONLY_SECTIONS = new Set(['allergies', 'allergy-review', 'allergy-safety-retry']);
const LAB_SECTIONS = new Set(['labs', 'lab-comparator']);
const PATIENT_OWN_SECTIONS = new Set(['allergies', 'medications', 'immunizations', 'conditions', 'care-gaps', 'visit-history', 'trends']);
const READ_METHODS = new Set(['GET', 'HEAD']);

const SCOPED_PATH_PATTERNS = [
  /^\/api\/patients\/([^/]+)(?:\/([^/]+))?/,
  /^\/patients\/([^/]+)(?:\/([^/]+))?/,
  /^\/dashboard\/records\/([^/]+)(?:\/([^/]+))?/,
  /^\/doctor\/health-records\/patient\/([^/]+)(?:\/([^/]+))?/,
];
// Index pages that share a path prefix with record URLs but are not patient ids.
const NOT_A_PATIENT_ID = new Set(['labs']);

// Patient-scoped API routes and the chart pages that show the same data.
export function parsePatientScopedPath(pathname: string): { patientId: string; section: string } | null {
  for (const pattern of SCOPED_PATH_PATTERNS) {
    const match = pathname.match(pattern);
    if (!match) continue;
    let patientId = match[1];
    try { patientId = decodeURIComponent(patientId); } catch { /* keep the raw segment; it will not match any record */ }
    if (NOT_A_PATIENT_ID.has(patientId)) return null;
    return { patientId, section: match[2] ?? '' };
  }
  return null;
}

const deny = (): PatientApiDecision => ({ ok: false, status: 403, error: 'You do not have access to this patient record.' });

/**
 * Who may open a patient's data (`/api/patients/{id}/...` and the chart pages). Everything not listed
 * is denied: administrators, billing, receptionists and care assistants never read patient health data.
 */
export function authorizePatientApi(input: {
  role: string | undefined;
  method: string;
  patientId: string;
  section: string;
  ownPatientId?: string;
  canAccessRecord: () => boolean;
}): PatientApiDecision {
  const role = String(input.role ?? '').toUpperCase();
  const method = input.method.toUpperCase();

  if (CLINICAL_STAFF.has(role)) return input.canAccessRecord() ? { ok: true } : deny();
  if (role === 'PHARMACIST') {
    if (!PHARMACY_SECTIONS.has(input.section)) return deny();
    return PHARMACY_READ_ONLY_SECTIONS.has(input.section) && !READ_METHODS.has(method) ? deny() : { ok: true };
  }
  if (role === 'LAB_TECH') return LAB_SECTIONS.has(input.section) && READ_METHODS.has(method) ? { ok: true } : deny();
  if (role === 'PATIENT') {
    const own = Boolean(input.ownPatientId) && input.ownPatientId === input.patientId;
    return own && READ_METHODS.has(method) && PATIENT_OWN_SECTIONS.has(input.section) ? { ok: true } : deny();
  }
  return deny();
}
