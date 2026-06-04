# ADR-003 — Terminology Bindings Strategy

**Status:** Accepted
**Accepted:** 2026-05-03
**Date:** 2026-05-03
**Deciders:** Winston (Architect), Morgan (Terminology), Alex (FHIR SME)
**Tags:** terminology, snomed, loinc, valueset, bindings

---

## Context

HealthTriage records clinical data (symptoms, triage conditions, care pathways) in FHIR resources.
Each coded element must be bound to a code system. Binding strength (required, extensible, preferred,
example) determines how strictly the system enforces code choices. Inconsistent or missing bindings
cause validation failures and undermine clinical interoperability.

For a Canadian app: SNOMED CT Canadian Edition is the primary clinical terminology. LOINC / pCLOCD
applies to laboratory observations. A custom CodeSystem is needed for the proprietary triage pathway
codes (Emergency, GP, Specialist, Pharmacy, Lab, Home Remedy) which have no SNOMED equivalent.

## Decision

We will apply the following binding strategy:
- **Triage pathway codes**: `required` binding to HealthTriage custom CodeSystem (deterministic routing requires exact codes)
- **Clinical condition codes (ClinicalImpression.finding)**: `preferred` binding to SNOMED CT Canadian Edition
- **Observation codes**: `extensible` binding to pCLOCD (lab-type) or SNOMED CT CA (clinical)
- **Encounter type/class**: `required` binding to HL7 v3 ActCode (FHIR standard)
- **All other elements**: `example` binding as per CA Core baseline, extensible as needed

## Options Considered

| Option | Pros | Cons |
|---|---|---|
| All `required` bindings | Maximum consistency | Too rigid; blocks valid clinical codes not in ValueSet |
| All `example` bindings | Maximum flexibility | No enforcement; interoperability fails |
| Mixed strategy per element class (selected) | Right balance per clinical need | More complex to document; requires ValueSet maintenance plan |

## Consequences

**Positive:**
- Triage pathway routing is deterministic (required binding = no ambiguity)
- Clinical findings are interoperable with other Canadian FHIR systems (SNOMED CT CA)
- Extensible bindings allow future codes without breaking validation
- Custom CodeSystem is small, owned by the project, and versioned in the IG

**Negative / Trade-offs:**
- Custom CodeSystem requires ongoing maintenance as triage pathways evolve
- Preferred bindings on findings mean some systems may send non-SNOMED codes — must handle gracefully

## Healthcare Compliance Notes

**SNOMED CT Canadian Edition**: licensed through Health Infoway for Canadian deployments.
Module OID: `20721000087101`. All Canadian health software using SNOMED CT must use the
Canadian edition; the international edition alone is not sufficient for conformance.

**pCLOCD**: pan-Canadian LOINC-based order catalog. Maintained by Health Infoway.
Use for laboratory observation codes where a LOINC code exists in pCLOCD.

**Custom CodeSystem URL**: `https://fhir.infoway-inforoute.ca/CodeSystem/healthtriage-pathway`
(pending registration; use local namespace until registered)

## References

- SNOMED CT Canadian Edition: https://www.canada.ca/en/health-infoway/services/standards/snomed-ct.html
- pCLOCD: https://fhir.infoway-inforoute.ca/CodeSystem/pCLOCD
- FHIR binding strengths: https://hl7.org/fhir/R4/terminologies.html#binding
