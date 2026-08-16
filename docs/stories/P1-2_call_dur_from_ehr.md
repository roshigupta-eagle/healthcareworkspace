# P1-2: Call DUR from EHR before saving prescriptions and surface advisories

**Summary:** Integrate EHR with `pharmacyms` DUR endpoint so prescribers receive real DUR alerts (hard/soft/informational) and must document overrides for soft/allowable soft-stops.

**Acceptance Criteria:**
- EHR calls `POST {PHARMACY_MS}/api/v1/dur/check` for new prescriptions.
- If DUR returns `hard-stop`, UI blocks creation and shows guidance.
- If `soft-stop` or `informational`, UI allows creation but requires an override reason that is persisted.
- All DUR checks and override reasons are stored with the prescription for audit.

**LLD:**
- **EHR orchestration:** server-side call to DUR prior to creating prescription in PharmacyMS.
- **Payload mapping:** build `DURRequest` including `patientFhirId`, `newMedicationDin/newMedName`, `activeDins`, `allergies`.
- **Frontend:** show modal for hard stops; show override text area for soft stops; attach override reason to create payload.
- **Storage:** store `dur_response` JSON and `override_reason` in prescription mapping table.
- **Tests:** simulate DUR responses and verify UI and persistence.

**Tasks:**
- [ ] Implement DUR call in EHR server handler.
- [ ] Update PrescriptionComposer flow to handle DUR results.
- [ ] Persist `dur_response` and override metadata.
- [ ] Add automated tests.
