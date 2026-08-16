# P3-1: Emit and validate FHIR resources for prescriptions and lab results

**Summary:** Standardize and emit R4 `MedicationRequest`, `MedicationDispense`, `ServiceRequest`, `DiagnosticReport`, and `Observation` from EHR/LIMS/PharmacyMS.

**Acceptance Criteria:**
- Created resources conform to FHIR R4 required fields and pass schema/validator.
- `MedicationDispense` created when a dispense is recorded.
- `DiagnosticReport` produced when a result is finalized and includes `Observation` entries with LOINC codes.

**LLD:**
- **Mapping doc:** implement field-by-field mapping and validation using `ehr/src/lib/fhir-client.ts`.
- **Implementation:** EHR server code creates FHIR resources via `fhirCreate` after downstream operations succeed.
- **Tests:** FHIR validation tests and sample payloads in `references/sample-payloads.md`.

**Tasks:**
- [ ] Create mapping doc and unit tests.
- [ ] Implement FHIR create flows for Rx and labs.
- [ ] Validate resources against FHIR server.
