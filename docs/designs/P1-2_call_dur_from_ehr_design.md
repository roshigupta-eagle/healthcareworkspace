# P1-2 Design — Call DUR from EHR before saving prescriptions

Story: [docs/stories/P1-2_call_dur_from_ehr.md](docs/stories/P1-2_call_dur_from_ehr.md)

**Acceptance Criteria**
- EHR calls `POST {PHARMACY_MS}/api/v1/dur/check` for new prescriptions.
- `hard-stop` blocks creation; `soft-stop` requires override reason persisted.
- All DUR checks and override reasons stored with prescription.

**Design / LLD**
- EHR server handler (`POST /api/ehr/prescriptions`) calls DUR with a `DURRequest` constructed from medication DIN/name, active meds (from FHIR MedicationRequest), allergies (FHIR AllergyIntolerance).
- If DUR indicates `hard-stop` return 422 with `dur` payload and UX guidance; for `soft-stop` allow creation but require `overrideReason` in body.
- Store `dur_response` JSON in `ehr_clinical_orders.dur_response` and log audit.

**API example**
- DUR request to pharmacyms: same as `dur.go` DURRequest struct.

**Files to edit**
- `ehr/src/app/api/ehr/prescriptions/route.ts` new handler
- `pharmacyms` DUR endpoint remains as-is; ensure auth if desired.

**Tests / Validation**
- Mock DUR responses in tests to validate UI and server behavior for hard/soft/info results.

**Implementation tasks**
- Implement DUR orchestration and persist responses and override reasons.
