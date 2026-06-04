# ADR-002 — Jurisdiction and Naming Systems

**Status:** Accepted
**Accepted:** 2026-05-03
**Date:** 2026-05-03
**Deciders:** Winston (Architect), Alex (FHIR SME), Morgan (Terminology)
**Tags:** fhir, jurisdiction, naming-systems, canada, ontario

---

## Context

HealthTriage launches in Ontario, Canada, with a secondary US expansion in v1.1. The choice of
jurisdiction determines which FHIR naming systems, identifiers, and terminology authorities apply.
Using incorrect or inconsistent naming systems produces non-conformant FHIR resources that fail
validation against national profiles and cannot be exchanged with provincial systems.

Ontario is governed by PHIPA (Personal Health Information Protection Act). Federal health data
is governed by PIPEDA. Health Infoway maintains the pan-Canadian FHIR naming systems registry.

## Decision

We will use the **Health Infoway pan-Canadian naming systems** as the primary authority for
all FHIR identifiers and code system URLs in HealthTriage v1. Ontario-specific extensions
will reference provincial OIDs where no pan-Canadian equivalent exists.

## Options Considered

| Option | Pros | Cons |
|---|---|---|
| Health Infoway pan-Canadian (selected) | Official Canadian authority; interoperable with provincial systems; maintained long-term | Requires familiarity with Canadian FHIR ecosystem |
| Custom naming systems | Full control | No interoperability; fails CA Core validation; maintenance burden |
| HL7 global naming systems only | Simple | Does not meet Canadian provincial requirements; no Canadian OIDs |

## Consequences

**Positive:**
- HealthTriage resources will pass CA Core profile validation
- Future integration with Ontario DHDR, OLIS, PCR possible without re-profiling
- US expansion (v1.1) can add US NamingSystem overlays without changing core profiles

**Negative / Trade-offs:**
- Developers must be familiar with Health Infoway naming system registry
- Ontario-specific OIDs require separate lookup when no pan-Canadian OID exists

## Healthcare Compliance Notes

**Canadian naming systems in use:**

| Resource type | Naming system | URL |
|---|---|---|
| Patient identifier | Health Card Number (Ontario) | `https://fhir.infoway-inforoute.ca/NamingSystem/ca-on-patient-healthcare-id` |
| Provider identifier | CPSO (Ontario physicians) | `https://fhir.infoway-inforoute.ca/NamingSystem/ca-on-license-physician` |
| Organization identifier | Health Infoway OID | `2.16.840.1.113883.3.239` |
| SNOMED CT | Canadian Edition | `http://snomed.info/sct` (module: `20721000087101`) |
| LOINC / pCLOCD | pan-Canadian LOINC | `https://fhir.infoway-inforoute.ca/CodeSystem/pCLOCD` |

Privacy law: PHIPA (Ontario), PIPEDA (federal). No cross-border data transfer without
explicit patient consent and data residency controls.

## References

- Health Infoway NamingSystem registry: https://fhir.infoway-inforoute.ca/NamingSystem/
- Ontario PHIPA: https://www.ontario.ca/laws/statute/04p03
- Health Infoway FHIR CA Core: https://fhir.infoway-inforoute.ca/io/CA-Core/
