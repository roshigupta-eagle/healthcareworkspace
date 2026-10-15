# Respiratory FHIR Mapping

## Intended mapping
| Domain | FHIR resource | Current Roshi boundary |
|---|---|---|
| Patient | Patient | Canonical patient record / existing FHIR client |
| Diagnosis | Condition | `conditionsStore` and existing condition APIs |
| Measurements | Observation | Existing patient observations where available; no respiratory fixture for patient-003 |
| PFT or imaging report | DiagnosticReport | No respiratory report source currently present |
| Imaging metadata | ImagingStudy | Not implemented in this workspace |
| Orders | ServiceRequest | Generic order infrastructure exists; patient-003 spirometry is currently a documented pending test item, not a FHIR-backed result |
| Medications | MedicationRequest/MedicationDispense | Existing medication store/workflows |
| Devices | Device | No respiratory device source currently present |
| Workflow | Task | Existing task store and APIs |
| Care planning | CarePlan/Goal | No dedicated respiratory CarePlan source currently present |
| Provenance/audit | Provenance/AuditEvent | Existing audit infrastructure and organ snapshot access audit |

The project FHIR release and profiles are not changed by this feature. Exact resource mapping must be validated against the configured implementation guide before external integration.
