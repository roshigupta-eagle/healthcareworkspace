# FHIR core architecture and modeling guide

## Table of contents

1. Source-of-truth approach
2. FHIR architecture components
3. Resource relationship patterns
4. Resource selection map
5. Profiles, extensions, terminology, and validation
6. Bundles and exchange patterns
7. Data elements, open APIs, and CapabilityStatement
8. Domain and database definition guidance
9. Common design pitfalls

## 1. Source-of-truth approach

Use base FHIR only as the platform specification. Real implementation contracts normally come from implementation guides, profiles, capability statements, value sets, business rules, and test fixtures.

Preferred source order:

1. official published IG or regulation
2. official current build or ballot, clearly labeled as draft
3. canonical package metadata from `package-list.json`, NPM package, or Simplifier package
4. project-specific contract, local conformance statement, or vendor guide
5. implementation code or observed API behavior, clearly marked as implementation-specific

Useful official references to verify current details:

- HL7 FHIR current publication: `https://hl7.org/fhir/`
- FHIR R4 permanent publication: `https://hl7.org/fhir/R4/`
- FHIR R5 permanent publication: `https://hl7.org/fhir/R5/`
- FHIR resource index: `https://hl7.org/fhir/resourcelist.html`
- FHIR R4/R5 differences: `https://hl7.org/fhir/diff.html`
- FHIR implementation guide registry: `https://fhir.org/guides/registry/`

## 2. FHIR architecture components

Think in layers:

- **data types**: primitive and complex reusable structures such as `Identifier`, `CodeableConcept`, `Coding`, `Reference`, `HumanName`, `Address`, `Period`, `Quantity`, `Ratio`, `Timing`, `Dosage`, and `Attachment`.
- **resources**: modular healthcare objects such as `Patient`, `Practitioner`, `Organization`, `Encounter`, `Observation`, `MedicationRequest`, `DiagnosticReport`, `ServiceRequest`, `Task`, `Composition`, and `Bundle`.
- **metadata resources**: `StructureDefinition`, `ValueSet`, `CodeSystem`, `ConceptMap`, `SearchParameter`, `CapabilityStatement`, `OperationDefinition`, `ImplementationGuide`, `Questionnaire`, and `SubscriptionTopic`.
- **exchange**: RESTful API, documents, messages, transactions, batch, operations, subscriptions, and bulk data.
- **security**: OAuth/SMART, scopes, mTLS or signed registration where applicable, audit, consent, provenance, and tenant partitioning.
- **conformance**: profiles, extensions, terminology bindings, invariants, examples, and test suites.

## 3. Resource relationship patterns

### `id` vs `identifier`

- `Resource.id` is the logical id assigned by the FHIR server, e.g. `Patient/123`.
- `identifier` is a business identifier from an assigning authority, e.g. health card number, MRN, NPI, provincial provider id, pharmacy id, prescription number.
- Never model a business identifier only as `Resource.id` unless the server contract explicitly requires it.

### References

Use `Reference.reference` for a resolvable local or absolute reference:

```json
{"reference": "Patient/example-patient"}
```

Use `Reference.identifier` when the target resource may not be available on the same server but the business identifier is known.

Use `Reference.display` only as a human-readable hint, not as computable data.

### Canonical references

Use canonical URLs for definitional resources such as profiles, value sets, questionnaires, search parameters, and operation definitions. Canonicals are not the same as REST endpoints.

### Contained resources

Use contained resources only when the contained object has no independent lifecycle, no meaningful standalone identity, and no need to be searched independently. Avoid contained resources for Patient, Practitioner, Organization, Location, Medication, or DocumentReference if these need reuse or audit.

### Composition and document links

A document Bundle normally has:

- `Bundle.type = document`
- first entry = `Composition`
- `Composition.subject -> Patient`
- `Composition.author -> Practitioner/PractitionerRole/Organization/device/system actor`
- `Composition.section.entry -> clinical resources`
- all referenced document resources present in the Bundle, unless the IG explicitly allows external references

### Task-driven workflow links

For workflow use cases such as referral, consult, prior authorization, or fulfillment:

- `ServiceRequest` describes the clinical/administrative request.
- `Task` tracks work state, owner, performer, and business status.
- `Communication` captures messages and clarifications.
- `Appointment` captures scheduled events.
- `DocumentReference` or `Binary` carries attachments when allowed.
- `Provenance` captures authorship and transmission lineage.

## 4. Resource selection map

Use this as a starting point, then apply the IG.

| Business area | Common resources | Notes |
|---|---|---|
| Person and identity | `Patient`, `RelatedPerson`, `Person`, `Linkage` | Use `Patient.link` or MPI/registry guidance for merges and cross-identifiers. |
| Providers and organizations | `Practitioner`, `PractitionerRole`, `Organization`, `Location`, `HealthcareService`, `Endpoint` | For provider directories, model role, organization, service, location, and endpoint separately. |
| Encounter and care context | `Encounter`, `EpisodeOfCare`, `CareTeam`, `CarePlan` | Keep encounter-specific facts linked to the encounter when required by IG. |
| Problems and diagnoses | `Condition` | Separate problem-list use, encounter diagnosis, and claim diagnosis. |
| Allergies | `AllergyIntolerance` | Distinguish allergy, intolerance, reaction, verification status, and clinical status. |
| Observations and vitals | `Observation`, `DiagnosticReport`, `Specimen` | Observations are atomic results; DiagnosticReport groups results and narrative. |
| Labs | `ServiceRequest`, `Specimen`, `Observation`, `DiagnosticReport` | Query and contribution models differ by jurisdiction. |
| Imaging | `ImagingStudy`, `DiagnosticReport`, `Observation`, `DocumentReference` | Often blends FHIR metadata with DICOM or document repositories. |
| Medications | `Medication`, `MedicationRequest`, `MedicationDispense`, `MedicationAdministration`, `MedicationStatement` | Clarify order vs dispense vs administration vs patient-reported statement. |
| Immunizations | `Immunization`, `ImmunizationRecommendation` | Check provincial/state immunization registry rules. |
| Procedures | `Procedure` | Use for performed procedures; planned procedures may use `ServiceRequest`. |
| Referral/consult | `ServiceRequest`, `Task`, `Communication`, `Appointment`, `DocumentReference`, `QuestionnaireResponse` | Local IGs often define workflow state transitions. |
| Forms | `Questionnaire`, `QuestionnaireResponse`, `StructureMap`, `Observation` | HL7 SDC may apply. |
| Patient summary | `Bundle`, `Composition`, `Patient`, `Condition`, `MedicationStatement`, `AllergyIntolerance`, `Immunization`, `Procedure`, `Observation` | Usually document-style exchange. |
| Payer/coverage | `Coverage`, `Claim`, `ExplanationOfBenefit`, `EligibilityRequest/Response`, `CoverageEligibilityRequest/Response` | US payer APIs often use CARIN/Da Vinci IGs. |
| Consent/audit/provenance | `Consent`, `AuditEvent`, `Provenance` | Requirements vary by jurisdiction and exchange network. |

## 5. Profiles, extensions, terminology, and validation

### Profile design

For each profile, define:

- base resource and FHIR version
- canonical URL
- use case and actor obligations
- differential constraints
- must-support meaning for each actor
- slices and discriminators
- extensions and modifier extensions
- terminology bindings and binding strengths
- invariants/FHIRPath constraints
- examples and negative examples

### Extension rules

Use standard extensions before creating custom extensions. For custom extensions, define canonical URL, context, value type, cardinality, meaning, and modifier status. Avoid modifier extensions unless the value changes interpretation of the resource.

### Terminology

For every coded element, specify:

- code system URL
- value set canonical
- binding strength: required, extensible, preferred, example
- versioning policy
- local-to-standard mapping and `ConceptMap` if needed
- display language requirements where bilingual or multilingual use is in scope

### Validation levels

1. JSON/XML syntax
2. base FHIR schema
3. profile StructureDefinition
4. terminology/code validation
5. invariants/FHIRPath
6. Bundle resolution
7. business rules not expressible in FHIR
8. actor/capability conformance
9. security and privacy controls

## 6. Bundles and exchange patterns

Pick Bundle type deliberately:

| Bundle type | Use when | Key rules |
|---|---|---|
| `document` | persistent clinical document, patient summary, discharge summary | first entry is Composition; Bundle has identifier/date; resources are stable snapshot. |
| `message` | event-driven messaging | first entry is MessageHeader; event and response semantics matter. |
| `transaction` | atomic create/update/delete on a server | use `entry.request`; `fullUrl` links local UUIDs. |
| `batch` | non-atomic set of independent requests | use `entry.request`; server may partially succeed. |
| `searchset` | REST search result | include `link`, `entry.search`, pagination, total policy. |
| `collection` | loose packaging without document/message/REST semantics | avoid for clinical exchange unless IG allows it. |
| `history` | version history | used for `_history` responses. |

Bundle design checklist:

- Assign stable `Bundle.identifier` when the Bundle is a business artifact.
- Use `fullUrl` consistently, especially UUID URNs in transaction/document samples.
- Ensure every internal reference resolves to a `fullUrl` or server id.
- Avoid mixing absolute references, relative references, and UUID references unless the IG permits and resolution is clear.
- State whether the Bundle is a snapshot, event, workflow transaction, or search result.

## 7. Data elements, open APIs, and CapabilityStatement

### Data element definition

For each element, capture:

- business name and definition
- source system and stewardship
- FHIR path and type
- cardinality and must-support status
- terminology binding
- identifier system and assigner
- transformation rule
- privacy classification
- validation rule
- sample value
- open question or jurisdictional dependency

### Open API design

A FHIR API contract should include:

- base URL and FHIR version
- supported resources and profiles
- supported interactions: read, vread, search, create, update, patch, delete, history, operation
- search parameters, includes, revincludes, chained search, sorting, paging
- operations such as `$validate`, `$everything`, `$export`, `$match`, `$lookup`, `$expand`, `$translate`
- content types and error handling with `OperationOutcome`
- SMART/OAuth scopes and token audience
- rate limits, throttling, audit, logging, and monitoring
- CapabilityStatement and SMART configuration endpoint expectations

## 8. Domain and database definition guidance

Do not blindly convert every FHIR element into a relational table. Choose a persistence pattern based on query, reporting, compliance, and integration needs.

### FHIR-native repository

Use when the server is a general FHIR repository, HIE layer, test harness, integration facade, or clinical data exchange store. Store canonical resource JSON/XML plus search indexes. HAPI FHIR JPA is a common implementation option.

### Domain-driven application database

Use when the application owns workflow and transactional state. Keep domain tables for business operations and map to FHIR at the API boundary. Persist FHIR payload snapshots for audit and replay where needed.

### Hybrid pattern

Use when both canonical exchange and operational workflow matter. Keep domain state plus FHIR resources/events, with clear ownership and reconciliation rules.

### Database definition checklist

- business entity and lifecycle
- FHIR resource(s) representing it
- primary business identifier(s)
- server logical id policy
- source-of-truth system
- record versioning/audit/provenance
- required search indexes
- terminology reference tables
- PHI classification and retention
- consent and access control joins
- data quality and deduplication rules

## 9. Common design pitfalls

- Using `Patient.id` as a health card number or MRN.
- Choosing `Observation` for complex documents that should be `DiagnosticReport` plus `Observation` or `DocumentReference`.
- Modeling provider as `Practitioner` only when `PractitionerRole`, `Organization`, `Location`, and `HealthcareService` are required.
- Confusing `MedicationRequest`, `MedicationStatement`, `MedicationDispense`, and `MedicationAdministration`.
- Using `Bundle.type=collection` where document, message, transaction, or searchset semantics are required.
- Creating local extensions for data that already has standard extensions or profile-defined fields.
- Ignoring terminology binding strength.
- Treating Must Support as cardinality; it is an actor obligation and must be read in the IG context.
- Not defining how references resolve across servers, Bundles, and systems.
- Designing HAPI FHIR database tables as the application domain model without understanding HAPI search/versioning schema.
