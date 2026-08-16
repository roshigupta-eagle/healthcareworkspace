# P3-2 Design — Enforce terminology codes

Story: [docs/stories/P3-2_enforce_terminology_codes.md](docs/stories/P3-2_enforce_terminology_codes.md)

**Acceptance Criteria**
- Medications require `din` or `rxnorm_code`; lab tests require `loinc_code`.
- UI shows canonical codes and requires override reason if missing.

**Design / LLD**
- Add `terminology` package in EHR to validate codes via local cache or external service.
- DB: make `loinc_code` NOT NULL for `lab_tests` and add `rxnorm_code` column to `medications` migration.
- Frontend typeahead queries `GET /api/terminology/medications?q=` returning codified entries.

**Files to edit**
- `pharmacyms/migrations/00001_pharmacy_core.sql` (enforce rxnorm/din uniqueness)
- `lims/migrations/00001_lims_core.sql` (ensure loinc_code exists)
- `ehr/src/app/api/terminology/*` new endpoints

**Tests / Validation**
- Mapping and validation tests; UI override flows tested.

**Implementation tasks**
- Implement terminology service and DB constraints; update UI.
