# P3-1 Design — Emit & validate FHIR resources

Story: [docs/stories/P3-1_emit_and_validate_fhir_resources.md](docs/stories/P3-1_emit_and_validate_fhir_resources.md)

**Acceptance Criteria**
- Resources conform to FHIR R4 and validate on the server.
- `MedicationDispense` created on dispense; `DiagnosticReport` on result finalization.

**Design / LLD**
- Create mapping functions: `MapPrescriptionToMedicationRequest`, `MapDispenseToMedicationDispense`, `MapOrderToServiceRequest`, `MapResultToDiagnosticReport` in `ehr/src/lib/fhir-mappers.ts`.
- Use `fhirCreate` in `ehr/src/lib/fhir-client.ts` to push resources.
- Add unit tests against sample payloads and run FHIR server validation.

**Files to edit**
- `ehr/src/lib/fhir-client.ts`
- Add `ehr/src/lib/fhir-mappers.ts` and tests

**Tests / Validation**
- Unit tests for mapping; integration test creating Rx and asserting FHIR resource shape.

**Implementation tasks**
- Implement mappers, call sites, and tests.
