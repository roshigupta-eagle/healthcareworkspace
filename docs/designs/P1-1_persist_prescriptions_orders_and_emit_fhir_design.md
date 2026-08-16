# P1-1 Design — Persist prescriptions/orders and emit FHIR

Story: [docs/stories/P1-1_persist_prescriptions_orders_and_emit_fhir.md](docs/stories/P1-1_persist_prescriptions_orders_and_emit_fhir.md)

**Acceptance Criteria**
- Creating a prescription in the EHR results in a PharmacyMS `prescriptions` row and a FHIR `MedicationRequest` on the FHIR server.
- Creating a lab order results in a LIMS `lab_orders` row and a FHIR `ServiceRequest`.
- UI displays external IDs.

**Design / LLD**
- Add EHR server endpoints:
  - `POST /api/ehr/prescriptions` server handler performs: validate -> DUR (P1-2) -> `POST {PHARMACY}/api/v1/prescriptions` -> `fhirCreate('MedicationRequest', ...)` -> persist mapping table `ehr_clinical_orders` with fields `{id, type, patient_fhir_id, ext_service, ext_id, fhir_id, created_at}`.
  - `POST /api/ehr/lab-orders` similar flow for LIMS + ServiceRequest.
- Idempotency: accept `clientRequestId` header or body field and store to prevent duplicate order creation.
- Error handling: if downstream creation fails, return 502 and include retry instructions.

**API sample (prescription)**
- Request: `{ "patientFhirId": "Patient/123", "prescriberFhirId": "Practitioner/456", "medicationId": "med-uuid", "dosage": "10 mg" }`
- Response: `{ "ehrOrderId":"...", "pharmacyId":"...", "fhirId":"MedicationRequest/..." }`

**Files to edit**
- [ehr/src/app/api/... ] add new server handlers under `ehr/src/app/api/ehr/`.
- [ehr/src/lib/fhir-client.ts]
- Add DB migration for `ehr_clinical_orders`.

**Tests / Validation**
- Integration test that posts to EHR handler and asserts existence in PharmacyMS and FHIR server.

**Implementation tasks**
- Implement EHR handlers and mapping table; add idempotency and tests.
