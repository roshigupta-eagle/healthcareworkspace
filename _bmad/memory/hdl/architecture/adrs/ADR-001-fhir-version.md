# ADR-001 — FHIR Version

**Status:** Accepted
**Accepted:** 2026-05-03
**Date:** 2026-05-03
**Deciders:** Winston (Architect), Alex (FHIR SME)
**Tags:** fhir, baseline

---

## Context

HealthTriage must exchange clinical data (triage results, patient observations, media metadata,
encounters) using a standardised healthcare interoperability format. The choice of FHIR version
determines which national profiles we can build on, which tooling is available, and how long
the standard will be maintained.

Health Infoway's pan-Canadian FHIR baseline is **FHIR R4** (4.0.1). US Core 7.0 is also R4.
FHIR R4B and R5 are available but lack mature Canadian national profiles and have limited
HAPI server production adoption as of 2026. IG Publisher supports all versions but R4 tooling
is most battle-tested.

## Decision

We will use **FHIR R4 (4.0.1)** as the canonical FHIR version for all HealthTriage resources,
profiles, and APIs. All StructureDefinitions, ValueSets, CodeSystems, and CapabilityStatements
will target FHIR R4.

## Options Considered

| Option | Pros | Cons |
|---|---|---|
| FHIR R4 (selected) | Mature tooling; Health Infoway CA Core profiles available; HAPI FHIR production-ready; US Core R4 aligned | Lacks some R5 improvements (subscriptions, task workflows) |
| FHIR R4B | Minor improvements over R4 | No CA Core profiles; limited HAPI support |
| FHIR R5 | Latest standard; improved subscriptions and task resources | No Canadian national profiles; HAPI R5 not production-grade; migration risk |

## Consequences

**Positive:**
- Aligns with Health Infoway pan-Canadian baseline — no deviation justification needed
- HAPI FHIR R4 is production-grade and well-documented
- US Core 7.0 compatibility enables v1.1 US expansion with minimal FHIR rework
- All CA Core profiles immediately applicable (Patient, Observation, Encounter, etc.)

**Negative / Trade-offs:**
- FHIR R5 SubscriptionTopic pattern not available; must use polling or R4 Subscription
- Some R5 workflow improvements (e.g., Task, Transport) unavailable in v1

## Healthcare Compliance Notes

Health Infoway pan-Canadian FHIR R4 standard: https://fhir.infoway-inforoute.ca
Ontario DHDR, OLIS, and PCR are FHIR R4 aligned. HealthTriage will be profile-compatible
with Ontario provincial systems for future integration.

## References

- Health Infoway CA Core FHIR R4: https://fhir.infoway-inforoute.ca/io/CA-Core/
- HL7 FHIR R4 specification: https://hl7.org/fhir/R4/
- US Core 7.0.0: https://hl7.org/fhir/us/core/
