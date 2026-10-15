# Platform Administration Operations Matrix

Ontario deployment assumption; FHIR R4 is the interoperability baseline.
FHIR does not grant access or make an operation PHIPA-compliant.

## Current implementation inventory

| Surface | Operations currently present | Status and boundary |
|---|---|---|
| /admin | Links to users and audit views | Implemented; ADMIN only, with a non-production preview override. |
| /admin/users | List accounts; approve/reject pending users; choose a basic role | Partial: no suspension, MFA, scoped grants, access review or credential verification. |
| /admin/audit | Read up to 200 events; filter by entity type | Partial: planned date/user/action filters and CSV export are not implemented. |
| LIMS and PharmacyMS APIs | Clinical workflow endpoints | Backend only; declared allowed roles are not enforced by RequireAuth. |
| FHIR R4 API | Metadata, create/read/update/delete/search/history | Tenant and role claims exist, but no resource/action authorization policy is enforced. |
| Communication/telehealth | Messages, tasks, attachments and local calls | Development/local LiveKit proof; no patient invitation or production identity workflow. |

This is the authoritative implementation baseline. Remaining sections specify target operations; they are not claims that current code provides them.

## Page-to-domain matrix

| Page family | Operations performed | Accountable administrator | FHIR R4 boundary |
|---|---|---|---|
| Login, registration, approval | Identity lifecycle and access | Security Admin | App IAM; map verified people to Practitioner, PractitionerRole, Patient or RelatedPerson only where appropriate. |
| Admin users and audit | Account approval, roles, audit review | Security Admin; Privacy Officer oversight | AuditEvent, Provenance. |
| Scheduling and appointments | Search, book, cancel, reschedule, check in | Doctor Admin; Patient Admin for administrative booking | Appointment, Schedule, Slot, Location, PractitionerRole. |
| Encounters, notes, triage | Encounter workflow, notes, urgent work | Doctor Admin configures privileges, not clinical sign-off | Encounter, Condition, Observation, Task, DocumentReference, Provenance. |
| Orders and referrals | Lab orders, prescriptions, referrals and transitions | Doctor Admin controls authority; Lab/Pharmacy Admin control fulfilment workflows | ServiceRequest, MedicationRequest, Task, Communication. |
| Laboratory pages | View, route and review results | Lab Admin | Specimen, Observation, DiagnosticReport, ServiceRequest. |
| Medication pages | Reconcile/review medication and dispensing workflow | Pharmacist Admin | Medication, MedicationRequest, MedicationDispense, MedicationStatement. |
| Patient record pages | Demographics, allergies, conditions, documents, care team, trends | Patient Admin; Doctor Admin for clinician access | Patient, Person, Linkage, Consent, CareTeam, DocumentReference, AuditEvent. |
| Communication and telehealth | Secure message/call workflow | Platform/Security Admin configure services; clinician initiates care communication | Communication, CommunicationRequest, Task, Encounter, AuditEvent. |

## Target administrative operations

| Role | Permitted operations | FHIR R4 / security model | PHIPA and safety requirement | Current state |
|---|---|---|---|---|
| Platform Admin | Tenant, organization, location, service, endpoint, integration-client, feature and retention configuration; health/integration monitoring | Organization, Location, HealthcareService, Endpoint, CapabilityStatement; non-FHIR configuration | Separate from clinical editing; vault secrets; change approval, rollback and audit | Missing console/policy |
| Platform Admin | Publish profiles, terminology packages and capability declarations | ImplementationGuide, StructureDefinition, ValueSet, CodeSystem, ConceptMap, CapabilityStatement | Version, validate and approve before release | Missing |
| Security Admin | Approve/reject/suspend/reinstate accounts; scoped grants; revoke sessions; MFA, SSO, SCIM, break-glass, API clients and certificates | IAM/OAuth/SMART scopes; AuditEvent | Least privilege, time-bounded access, dual approval for privileged grants, break-glass reason/expiry/review | User approval only is partial |
| Security Admin | Investigate access, denied actions, exports and security incidents | AuditEvent, OperationOutcome | Tamper-evident events; Privacy Officer review; no clinical data edits | Audit viewing is partial |
| Patient Admin | Register demographics; manage identifiers, contact/language preferences, portal/proxy access, consent, disclosure and correction requests | Patient, Person, RelatedPerson, Linkage, Consent, Task, DocumentReference | Identity verification; minimum necessary use; two-person reversible merge; preserve prior values | Missing governed workflow |
| Doctor Admin | Verify providers; manage rosters, locations, schedules, care teams, queues, privileges and clinical templates | Practitioner, PractitionerRole, Schedule, Slot, CareTeam, Task, PlanDefinition, Questionnaire | Credential/privilege expiry; relationship/time-scoped access; no signing or ordering as an admin | Partial scheduling/queue surfaces |
| Pharmacist Admin | Verify pharmacy staff; manage formulary, dispensing sites, endpoints, DUR rules and transmission exceptions | PractitionerRole, Medication, MedicationKnowledge, MedicationRequest, MedicationDispense, Endpoint | Terminology and pharmacy governance; pharmacist approval for overrides | Medication/DUR APIs only |
| Pharmacist role only | Dispense, cancel or correct a dispense | MedicationDispense, Provenance | Platform/Security Admin cannot perform dispensing merely by role elevation | Current API authorization insufficient |
| Lab Admin | Verify lab staff; maintain catalogue, specimen instructions, worklists, analyzer endpoints and result routing | PractitionerRole, ObservationDefinition, SpecimenDefinition, Device, Endpoint, Task | LOINC/pCLOCD governance; instrument validation; segregation of duties | Test/result APIs only |
| Qualified verifier/pathologist only | Verify, amend or release results | Observation, DiagnosticReport, Provenance | Preserve corrections/version history; notify downstream consumers | Current API authorization insufficient |

## PHIPA controls required for every operation

| Control | Required implementation | FHIR evidence |
|---|---|---|
| Authorization | Evaluate tenant, organization, role, care relationship, task assignment, consent, purpose and time on every request. | Consent, CareTeam, Encounter, Task, AuditEvent. |
| Audit | Log read, write, export, print, API, denied and failed actions with actor, target, time, outcome and source. | AuditEvent; use Provenance separately for data authorship/transformation. |
| Consent/disclosure | Capture scope, recipient, purpose, period and withdrawal, then enforce before disclosure. | Consent, Communication, Task, DocumentReference. |
| Integrity/correction | Never silently overwrite clinical facts; preserve addendum/correction/version lineage. | Resource history, Provenance, AuditEvent. |
| Privacy governance | Privacy Officer handles access/correction requests, complaints, audit review and incident workflow. | AuditEvent, Consent, Task. |
| Retention and breach response | Enforce approved retention/legal-hold policy and the custodian's incident procedure. | Policy is non-FHIR; record events in AuditEvent. |

## Required architecture and delivery order

1. Replace broad ADMIN with PLATFORM_ADMIN, SECURITY_ADMIN, PATIENT_ADMIN, DOCTOR_ADMIN, PHARMACIST_ADMIN, LAB_ADMIN, PRIVACY_OFFICER, and clinical roles. Store tenant, organization, location, grantor, reason and effective period for each grant.
2. Implement a shared policy decision point for EHR, FHIR, LIMS, PharmacyMS, exports and asynchronous jobs. Fix LIMS/PharmacyMS role enforcement first.
3. Use SMART on FHIR/OAuth 2.0 scopes plus server-side tenant and compartment enforcement. Never trust client-supplied tenant or role headers in production.
4. Complete the audit pipeline: immutable events, secure filtering/export, denied/read/export coverage and Privacy Officer case workflow.
5. Build role-specific admin consoles only after the P0 authorization controls are proven through positive and negative access tests.

This is a technical compliance mapping, not legal advice. The Ontario health information custodian and Privacy Officer must approve the definitive policy, consent, retention, breach and access-review processes. Before claiming interoperability conformance, publish a versioned CapabilityStatement and the applicable CA Baseline and Ontario implementation-guide profiles.
