# S-016 — System creates FHIR ClinicalImpression with pathway and findings on triage completion

**Epic:** E-006 — FHIR Resource Persistence
**Priority:** High
**Status:** not-started
**Assigned:** Amelia
**FHIR Resources:** ClinicalImpression
**Last Updated:** 2026-05-03

---

## User Story

As the **HealthTriage system**,
I want to **persist the triage result as a FHIR ClinicalImpression resource**,
so that **the triage decision is auditable, retrievable by the patient, and available for clinician review**.

## Context

ClinicalImpression is the central FHIR resource for the triage outcome. It links the pathway code
(summary), probable causes (finding[]), confidence score (extension), and references the Encounter
and Patient. It must conform to the HTClinicalImpression profile (ADR-001, ADR-003).

## Acceptance Criteria

### AC-001 — ClinicalImpression is created on triage completion

**Given** the rule engine has determined a triage pathway
**When** the backend writes the triage result to FHIR
**Then** a ClinicalImpression resource is created in HAPI FHIR with HTTP 201 response

**Status:** pending

---

### AC-002 — ClinicalImpression.summary contains pathway code

**Given** the triage pathway is `gp`
**When** the ClinicalImpression is written
**Then** ClinicalImpression.summary = `"gp"` and the code is from the HealthTriage Pathway CodeSystem (`healthtriage-pathway`)

**Status:** pending

---

### AC-003 — ClinicalImpression.finding contains top 3 probable causes

**Given** the AI returned 3 probable causes with SNOMED CT CA codes and confidence scores
**When** the ClinicalImpression is written
**Then** ClinicalImpression.finding has 3 entries, each with itemCodeableConcept coded from SNOMED CT CA and an ext-triage-confidence extension decimal value

**Status:** pending

---

### AC-004 — ClinicalImpression references Encounter, Patient, and supporting Media/Observations

**Given** the triage session has a Patient, Encounter, Media, and Observation already created
**When** the ClinicalImpression is written
**Then** ClinicalImpression.subject = Patient/{id}, ClinicalImpression.encounter = Encounter/{id}, ClinicalImpression.supportingInfo contains Media/{id} and Observation/{id}

**Status:** pending

---

### AC-005 — ClinicalImpression validates against HTClinicalImpression profile

**Given** the ClinicalImpression resource is created
**When** FHIR $validate is called on the resource
**Then** the validation returns no errors (warnings acceptable)

**Status:** pending

---

## Technical Notes

- Profile URL: `https://fhir.infoway-inforoute.ca/StructureDefinition/ext-healthtriage-impression`
- Extension URL for confidence: `https://fhir.infoway-inforoute.ca/StructureDefinition/ext-triage-confidence`
- SNOMED CT CA system: `http://snomed.info/sct` (module `20721000087101`)
- ClinicalImpression.status = `completed`
- Call HAPI `POST /fhir/ClinicalImpression/$validate` before `POST /fhir/ClinicalImpression` in production

## Definition of Done

- [ ] All AC items pass in automated tests (integration test against local HAPI FHIR)
- [ ] ClinicalImpression passes FHIR $validate
- [ ] Profile conformance verified via HAPI validation response
- [ ] Code reviewed
