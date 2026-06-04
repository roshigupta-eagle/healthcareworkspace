# Data, API, domain, and database templates

Use these templates when the user asks for data elements, data definitions, API definitions, database definitions, domain definitions, mappings, or resource links.

## 1. Data element inventory

| Field | Description |
|---|---|
| Business element name | Human-readable name used by clinicians/business users |
| Business definition | Precise meaning and inclusion/exclusion rules |
| Source of truth | System/organization responsible for the value |
| FHIR resource | Resource carrying the element |
| FHIR path | Exact path, e.g. `Patient.identifier` |
| Data type | FHIR type and any profile constraints |
| Cardinality | Base and profile cardinality |
| Must Support | Actor-specific interpretation from the IG |
| Terminology/value set | Code system/value set/binding strength/version |
| Identifier system | URI/OID/URL and assigner |
| Transformation | Mapping rule from source to FHIR |
| Validation | FHIRPath, terminology, business, or security rule |
| Privacy class | PHI/PII/sensitive/controlled substance/consent protected |
| Example | Synthetic example value |
| Open question | Any jurisdictional/vendor decision needed |

## 2. Resource relationship matrix

| Source resource | Path | Target resource | Reference type | Required? | Resolution rule | Lifecycle note |
|---|---|---|---|---|---|---|
| `MedicationRequest` | `subject` | `Patient` | relative/absolute/identifier | yes | same server or Bundle fullUrl | patient must exist or be included |
| `MedicationRequest` | `requester` | `PractitionerRole` or `Practitioner` | reference | profile-specific | prefer PractitionerRole when organization/location context matters | provider may be from registry |
| `Composition` | `section.entry` | clinical resources | reference | document-specific | Bundle entries should resolve | immutable document snapshot |

## 3. Profile decision table

| Resource | Base profile | Local profile | Canonical URL | Required elements | Must Support | Extensions | Terminology | Search requirements |
|---|---|---|---|---|---|---|---|
| Patient |  |  |  |  |  |  |  |  |
| PractitionerRole |  |  |  |  |  |  |  |  |
| MedicationRequest |  |  |  |  |  |  |  |  |

## 4. API contract template

| Capability | Definition |
|---|---|
| Resource/operation | e.g. `GET /Patient/{id}`, `GET /MedicationRequest?patient=`, `POST /Bundle`, `$validate` |
| Interaction | read/search/create/update/transaction/operation/bulk |
| Request profile | Required profile(s) |
| Response profile | Required profile(s) |
| Parameters | Search/operation parameters with types and cardinality |
| Includes | `_include`, `_revinclude`, chained search, paging, sort |
| Security | SMART scopes, OAuth audience, user/tenant/patient restrictions |
| Validation | base FHIR, profile, terminology, business rules |
| Error handling | `OperationOutcome` issue codes and HTTP statuses |
| Audit | audit event/log fields |
| Examples | synthetic request/response |

## 5. Domain model template

| Domain entity | Business responsibility | FHIR representation | Aggregate/lifecycle | Source of truth | Events | Notes |
|---|---|---|---|---|---|---|
| Patient identity | demographic and identifiers | `Patient` | MPI/client registry lifecycle | registry/EMR | created, merged, updated | avoid using FHIR id as business id |
| Prescription order | prescribed medication intent | `MedicationRequest` | prescribing workflow | EMR/eRx service | created, renewed, cancelled | check eRx IG |
| Referral | request for service | `ServiceRequest`, `Task` | referral workflow | RMS/EMR | submitted, accepted, scheduled, completed | local IG state machine |

## 6. Database definition template

| Table/collection | Purpose | Key columns | FHIR mapping | Indexes | Retention/audit | Notes |
|---|---|---|---|---|---|---|
| patient_identity | patient demographics and identifiers | patient_id, identifier_system, identifier_value, name, birth_date | `Patient.identifier`, `Patient.name`, `Patient.birthDate` | identifier, name/dob | PHI retention policy | domain-owned table |
| fhir_resource_snapshot | immutable FHIR payload snapshots | resource_type, logical_id, version, profile, payload_json, last_updated | full resource | type/id/version, profile | audit/replay | use when not using full FHIR repository |
| fhir_reference_index | query support for resource links | source_type, source_id, path, target_type, target_id | `Reference` paths | source, target | derived | needed for non-HAPI custom stores |

## 7. Bundle design template

| Decision | Value |
|---|---|
| Bundle type | document/message/transaction/batch/searchset/collection |
| Business purpose |  |
| Required first entry | Composition or MessageHeader, if applicable |
| Identifier strategy |  |
| fullUrl strategy | UUID URNs, relative ids, or absolute URLs |
| Resource inclusion rule | all referenced resources included or externally resolvable |
| Profile list |  |
| Validation rule |  |
| Signature/provenance |  |

## 8. Validation plan template

| Test layer | Tool/approach | Expected result |
|---|---|---|
| JSON syntax | parser | valid JSON |
| FHIR base validation | HL7 validator or HAPI validator | no errors |
| IG profile validation | package-loaded validator | conforms to selected profiles |
| Terminology | local/remote terminology service | valid codes and displays |
| Bundle resolution | local script or validator | all internal references resolve |
| Business rules | unit/integration tests | workflow and jurisdiction rules pass |
| API conformance | CapabilityStatement + test suite | supported interactions match claims |
| Security | SMART/OAuth tests | scopes and context enforced |
| Negative tests | invalid examples | expected OperationOutcome |

## 9. Architecture decision record template

```markdown
# ADR: [decision title]

## Status
proposed / accepted / superseded

## Context
[use case, jurisdiction, systems, constraints]

## Decision
[chosen FHIR version, IGs, resources, API pattern, HAPI pattern]

## Consequences
[benefits, tradeoffs, migration impacts]

## Validation
[how conformance will be tested]

## Open questions
[items requiring authority/vendor/project decision]
```
