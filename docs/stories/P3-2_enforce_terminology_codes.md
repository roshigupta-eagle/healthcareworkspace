# P3-2: Enforce terminology codes (DIN/RxNorm, LOINC, UCUM)

**Summary:** Validate and require authoritative codes for medications and lab tests; provide mapping or reject free-text-only entries.

**Acceptance Criteria:**
- Medications have `din` or `rxnorm_code` when created; lab tests have `loinc_code`.
- UI shows canonical code and display name; unmapped items require explicit override documented by user.

**LLD:**
- **DB:** enforce `loinc_code` uniqueness in `lab_tests` and prefer `din`/`rxnorm` columns in `medications`.
- **Service:** add `terminology` package to validate codes against a local mapping DB or external terminology service.
- **Frontend:** typeahead/autocomplete that shows codified entries; fallback override flow with documented reason.
- **Tests:** mapping coverage tests.

**Tasks:**
- [ ] Add validation layer and mapping tables.
- [ ] Integrate terminology lookup in medication/test selectors.
- [ ] Add override flows and tests.
