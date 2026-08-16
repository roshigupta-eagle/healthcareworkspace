# P1-1: Persist prescriptions/orders centrally and emit FHIR resources

**Summary:** Modify the EHR to persist prescriptions and lab orders and to emit corresponding FHIR `MedicationRequest` and `ServiceRequest` resources; ensure downstream services receive created records.

**Acceptance Criteria:**
- Creating a prescription in the EHR results in a record in PharmacyMS `prescriptions` and a FHIR `MedicationRequest` on the configured FHIR server.
- Creating a lab order in the EHR results in a record in LIMS `lab_orders` and a FHIR `ServiceRequest`.
- UI shows confirmation with external IDs (`pharmacy_prescription_id`, `lims_order_id`, `fhir_id`).

**LLD:**
- **Server routes:** add server-side endpoints in EHR: `POST /api/ehr/prescriptions` and `POST /api/ehr/lab-orders` (Next.js server handlers) to orchestrate flow.
- **Prescription flow:**
  1. Server validates patient/practitioner references and payload.
  2. Call `POST {PHARMACY_MS_URL}/api/v1/dur/check` to run DUR (see P1-2).
  3. If safe or overridden, call `POST {PHARMACY_MS_URL}/api/v1/prescriptions` using `INTERNAL_SERVICE_TOKEN`.
  4. Create FHIR `MedicationRequest` via `fhirCreate('MedicationRequest', ...)`.
  5. Persist mapping in EHR DB: `{ehr_order_id, pharmacy_id, fhir_id}`.
- **Lab order flow:** similar steps for LIMS `POST /api/v1/orders` and FHIR `ServiceRequest` creation.
- **Error handling:** implement retries and idempotency: use client-supplied `clientRequestId` to de-duplicate.
- **Tests:** integration test verifying end-to-end creation and mapping.

**Tasks:**
- [ ] Implement EHR server handlers and DB mapping table.
- [ ] Add DUR call orchestration and override handling.
- [ ] Create FHIR resource using `ehr/src/lib/fhir-client.ts`.
- [ ] Add integration tests.
