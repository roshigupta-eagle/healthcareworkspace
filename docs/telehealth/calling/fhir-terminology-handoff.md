# Telehealth Calling FHIR R4 and Terminology Handoff

**Status:** conditional documentation sign-off; no FHIR calling projection is implemented or approved for production.
**Jurisdictional posture:** Ontario-first, Canada; FHIR R4. A named Ontario/program implementation guide (IG), package version, profile canonicals, terminology server, and exchange contract have **not** been selected.

## Conditional FHIR review position

The FHIR review condition is:

> `CallSession` remains an operational calling-control-plane aggregate. Do not create a direct FHIR CallSession resource, do not map technical call states to `Communication.status`, and do not auto-project call records to FHIR.

Future optional links may reference `Patient`, `Appointment`, `Encounter`, `PractitionerRole`, `RelatedPerson`, `CareTeam`, `Communication`, `CommunicationRequest`, `Task`, `DocumentReference`, `Consent`, `AuditEvent`, and `Provenance` only under a selected/approved Ontario or partner IG. The repository's current FHIR service lacks the required calling mapper, profile validation, and demonstrated metadata-preservation behavior. These are release gates, not implementation claims.

## Scope and source-of-truth model

| Business fact | Source of truth | FHIR treatment now | Future treatment only after IG approval |
|---|---|---|---|
| CallSession identity, lifecycle, participant state, media provider mapping, quality summary, answer race, timeout and outbox event | Calling control-plane database | No direct FHIR resource or automatic projection. | Remains operational; FHIR may reference an approved related clinical fact but does not replace it. |
| Patient, practitioner and organization identity | Canonical clinical/identity owners | Existing EHR/FHIR identity models are not evidence of a calling mapper. | Use profile-conformant references; do not copy demographics into CallSession or provider labels. |
| Appointment / scheduled visit | Canonical scheduling owner, currently unverified for calling | No calling mapping. | Optional `Appointment` reference when source, authorization and IG semantics are approved. |
| Encounter | Canonical encounter owner | No calling mapping. | Optional `Encounter` reference. A completed technical call does not finish an Encounter, and a failed call does not erase one. |
| Clinical communication / request | Communication domain, if an approved use case requires it | No automatic `Communication` or `CommunicationRequest` creation. | Use only with selected profiles and explicit business semantics; never encode technical call lifecycle in `Communication.status`. |
| Follow-up work | Canonical task owner | No calling mapper. | Optional `Task` link for approved work; technical retry/state is not a Task substitute. |
| Consent / verification | Approved policy and canonical consent owner | No automatic FHIR conversion. | Link a policy-approved `Consent` reference; media connection is never consent. |
| Audit / provenance | Approved audit service and calling audit record | No automatic FHIR projection. | Project/link `AuditEvent`/`Provenance` only if the approved IG and audit architecture require it. |
| Documentation / attachment | Approved clinical-document owner | Recording and transcription are out of scope. | `DocumentReference` only for authorized, retained post-call documents—not raw media by default. |

## Provisional resource relationship map

The table identifies possible links, not a profile contract. `Reference` values must use the selected server/Bundle resolution policy. A FHIR `id` is not an MRN, health-card number, provider registration, CallSession ID, or provider room identifier.

| Operational concept | Candidate FHIR resource/path | Relationship | Gate / rule |
|---|---|---|---|
| Patient subject | `Patient` | CallSession stores canonical opaque patient reference; FHIR projection may refer to `Patient`. | Patient-access policy, identity source, profile, and identifier policy required. |
| Initiating/moderating clinician | `PractitionerRole` preferred; `Practitioner` only where organizational role context is absent | Reference, not a provider-media identity. | Profile and authorization policy required. |
| Caregiver | `RelatedPerson` | Reference after caregiver/proxy authorization. | Do not infer relationship from display name; policy and IG required. |
| Care-team context | `CareTeam` | Optional contextual reference. | Does not grant access by itself. |
| Scheduled visit | `Appointment` | Optional scheduling link. | Appointment owner/schema/profile and authorization unverified. |
| Clinical visit | `Encounter` | Optional clinical-context link. | Call and Encounter lifecycles remain independent. |
| Communication intent/event | `CommunicationRequest` / `Communication` | Optional only for an approved communication use case. | Do not map `CREATED`, `RINGING`, `ACTIVE`, `FAILED`, etc. to `Communication.status`. |
| Follow-up | `Task` | Optional focus/input/output linkage. | Canonical task integration and profile required. |
| Post-call document | `DocumentReference` | Optional reference to approved clinical documentation. | No raw recording/transcript projection; retention, consent and storage gates required. |
| Consent evidence | `Consent` | Optional reference to policy-approved consent record. | Exact profile, scope/category and policy representation unverified. |
| Audit and lineage | `AuditEvent`, `Provenance` | Optional audit/provenance projection or cross-link. | Must not replace immutable operational audit; exact event/profile contract required. |

## Explicit non-mappings

- There is no base FHIR R4 `CallSession` resource in this design.
- `Communication.status` is not a transport for technical states such as ringing, connecting, active, reconnecting, missed, failed, or cancelled.
- No custom extension, code system, profile canonical, ValueSet, ConceptMap, identifier URI, or Ontario IG version is invented here.
- No Bundle is automatically produced. If a partner requires exchange, choose deliberately among REST, `message` Bundle (first entry `MessageHeader`), document Bundle (first entry `Composition`), or another approved pattern.
- No automatic FHIR projection, media artifact export, transcript export, or AI interpretation is enabled.

## Terminology position

### Operational vocabulary

Call types, participant types/roles, lifecycle states, dispositions, verification states, and technical quality values are application/domain vocabulary until a named exchange contract says otherwise. Version the domain enums and validate transitions in the calling service; do not present them as universally interoperable clinical codings.

For a future FHIR mapping, every coded element needs a declared code system URI, ValueSet canonical and version, binding strength, display-language policy, terminology-server validation result, and ownership. No concrete code or value-set membership is asserted in this document.

### Ontario/Canadian defaults requiring confirmation

If an approved Ontario/pan-Canadian IG is silent, the terminology advisor may evaluate the following starting points—not deploy them by assumption:

| Concept class | Provisional direction | Required confirmation |
|---|---|---|
| Clinical reference concepts relevant to disposition/context | SNOMED CT Canadian Edition where the selected IG requires SNOMED. | Canadian edition/version, ValueSet, licensing, binding and English/French display policy. |
| Clinical/laboratory observations | LOINC or pCLOCD and UCUM where applicable. | This calling feature does not itself select lab codes; use the governing clinical IG. |
| Reporting classifications | ICD-10-CA/CCI only if a reporting workflow requires them. | Do not substitute classifications for clinical-reference terminology. |
| FHIR workflow fields | Value sets defined by the selected Ontario/program/partner IG first. | Base FHIR/Canadian Baseline alone is not a complete production contract. |

## FHIR-agent handoff

### Objective

Design and validate a **gated, optional** FHIR R4 linkage/projection capability for telehealth calling without making FHIR the operational call state store or representing technical CallSession state as `Communication.status`.

### Jurisdiction and program

- Country/province: Canada / Ontario first.
- Domain: telehealth calling control-plane linkage and post-call clinical workflow.
- Governing IG/package/version: **not selected; blocking decision**.
- FHIR release: R4, subject to the selected IG.
- Exchange pattern: **not selected**. Default is no exchange; choose REST, message, document, or other pattern only when a named consumer/partner requires it.

### Required design inputs

1. Exact Ontario/program/trading-partner IG, published package/version, CapabilityStatement, profile canonicals and deployment environment.
2. Canonical source systems and identifier strategy for Patient, PractitionerRole, RelatedPerson, CareTeam, Appointment, Encounter, Consent, Task, audit and document records.
3. Privacy/consent, user/organization/tenant authorization, audit, data-residency, English/French display, retention and patient-access requirements.
4. Whether a `Communication` or `CommunicationRequest` fact is clinically intended, who owns it, and which business semantics—not technical-call state—it represents.
5. Whether an exchange requires a Bundle and, if so, its type and first-entry rule.

### FHIR elements affected

| Resource/profile | Candidate element | Recommendation | Required action |
|---|---|---|---|
| Patient profile | Reference from approved clinical context | Reference existing canonical patient; no duplication. | Confirm profile/identifier/resolution policy. |
| PractitionerRole profile | Reference to caller/moderator where role/organization matters | Prefer `PractitionerRole` over plain display/name. | Confirm provider directory/profile and authorization relationship. |
| RelatedPerson / CareTeam | Reference for authorized caregiver/team context | Context is not authorization. | Confirm proxy/care-team policy and IG expectations. |
| Appointment / Encounter | Context references | Optional, independent lifecycle. | Confirm owner, profile and access policy. |
| Communication / CommunicationRequest | Status/category/payload | No mapping until exact clinical meaning/IG is approved; no CallSession-state mapping. | Define business event and validation fixtures. |
| Task | Focus/links | Optional approved follow-up only. | Integrate canonical task service and profile. |
| Consent | Reference/record | Optional policy-approved link. | Define consent model and policy version handling. |
| DocumentReference | Authoritative clinical document link | No media/transcript default. | Define document policy, storage, retention and access. |
| AuditEvent / Provenance | Audit or lineage projection | Optional projection; operational audit remains required. | Define profile, agents, target references, retention, and redaction rules. |

### Terminology-server validation plan

Before any mapping is accepted, inspect the approved terminology service `CapabilityStatement`/`TerminologyCapabilities`, then record server base URL, release, package/IG versions, terminology versions, timestamp, language and expansion parameters. Use:

- `CodeSystem/$lookup` to confirm code/display/edition;
- `ValueSet/$validate-code` to test required bindings;
- `ValueSet/$expand` for governed candidate discovery, not as a substitute for a declared ValueSet;
- `ConceptMap/$translate` only for approved mapping artifacts;
- `$validate` with the selected IG package for resource/profile conformance.

### Minimum validation cases

| Scenario | Expected result |
|---|---|
| Valid approved profile/reference set | Base FHIR, profile, terminology, reference and business validation pass. |
| Technical CallSession state proposed for `Communication.status` | Rejected by mapping/business validation. |
| Wrong patient/tenant or unresolved reference | Rejected without data leakage. |
| Unapproved local code, wrong SNOMED edition, or wrong ValueSet version | Rejected or quarantined per governance; no invented mapping. |
| Missing consent/policy where a governed projection requires it | Projection blocked; operational record remains according to policy. |
| Bundle requested by partner | Correct type/first-entry/reference resolution/profile validation demonstrated. |

## Existing-runtime limitations

The current custom Go FHIR R4 service provides generic resource persistence/search, but existing communication documentation identifies no calling/communication mapper, no complete approved Communication-domain profile/terminology implementation, and no evidence that the runtime preserves all required metadata for this use case. The target mapper remains outside the media/control-plane write transaction unless an approved architecture explicitly defines a safe projection/reconciliation pattern.

## Approval gates

Morgan terminology handoff, Alex/FHIR review, privacy/security review, clinical owner approval, selected IG/package validation, negative test fixtures, and partner conformance evidence are required before any FHIR projection is enabled. Until then, FHIR linkage remains documented design only.
