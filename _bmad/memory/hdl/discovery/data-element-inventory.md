# Data Element Inventory — HealthTriage

**Status:** complete
**Updated:** 2026-05-03
**Jurisdiction:** Canada (Ontario) primary; US secondary

---

## FHIR Resource Map

| Element | Source | FHIR Resource | Profile URL | Binding | Must-Support |
|---|---|---|---|---|---|
| Visual image frame | Camera capture | `Media` | `https://fhir.infoway-inforoute.ca/StructureDefinition/ext-healthtriage-media` | — | content.url (ephemeral), status, subject |
| Symptom text description | User input | `Observation` | `https://fhir.infoway-inforoute.ca/StructureDefinition/ext-healthtriage-symptom-obs` | SNOMED CT CA Edition (extensible) | code, value[x], subject, encounter |
| Triage recommendation | AI output | `ClinicalImpression` | `https://fhir.infoway-inforoute.ca/StructureDefinition/ext-healthtriage-impression` | — | summary, finding, subject, encounter |
| Probable causes (up to 3) | AI output | `ClinicalImpression.finding` | (above) | SNOMED CT CA Edition (preferred) | item.concept, extension:confidence |
| Triage confidence score | AI output | Extension on ClinicalImpression | `https://fhir.infoway-inforoute.ca/StructureDefinition/ext-triage-confidence` | — | value[x] (decimal 0.0–1.0) |
| Care pathway code | AI rule engine | `ClinicalImpression.summary` | (above) | HealthTriage Pathway CodeSystem (required) | summary |
| Home remedy instructions | AI output | `Communication` | CA Core Communication | — | payload.content[x], subject, encounter |
| Care pathway referral | Rule engine | `ServiceRequest` | CA Core ServiceRequest | SNOMED CT CA Edition (extensible) | code, intent, subject, encounter |
| Patient demographics | User input (optional) | `Patient` | CA Core Patient | — | name, birthDate, gender |
| Triage encounter | System | `Encounter` | CA Core Encounter | — | status, class, subject, period |
| Disclaimer consent | User action | `Consent` | CA Core Consent | — | status, scope, category, patient |

---

## Custom CodeSystem

**HealthTriage Pathway CodeSystem**
URL: `https://fhir.infoway-inforoute.ca/CodeSystem/healthtriage-pathway`

| Code | Display | Definition |
|---|---|---|
| `emergency` | Emergency | Seek emergency care immediately (ER / 911) |
| `gp` | General Practitioner | Book appointment with family doctor within 24–48h |
| `specialist` | Specialist | Requires specialist referral |
| `pharmacy` | Pharmacy | OTC treatment available; consult pharmacist |
| `lab` | Laboratory | Lab tests required before treatment decision |
| `home-remedy` | Home Remedy | Self-care with specific instructions; monitor symptoms |

---

## Privacy Classification

| Element | Sensitivity | Storage | Retention |
|---|---|---|---|
| Raw camera image | High — biometric | Ephemeral (not stored) | None |
| Patient demographics | High — PHI | FHIR (encrypted at rest) | Per PHIPA (Ontario): 10 years |
| Triage result | Medium — clinical | FHIR (encrypted at rest) | Per PHIPA: 10 years |
| AI confidence score | Low | FHIR extension | With ClinicalImpression |
| Home remedy text | Low — no PHI | FHIR Communication | With Encounter |

---

## Unbound / TBD Elements

| Element | Status | Action Required |
|---|---|---|
| Voice symptom input (v1.1) | Out of scope v1 | Add Observation.valueString in v1.1 |
| Clinician review workflow | Partial — v1 read-only | Add Task + Practitioner resources in v1.1 |
| EHR integration | Out of scope v1 | Add SMART on FHIR EHR launch in v2 |
