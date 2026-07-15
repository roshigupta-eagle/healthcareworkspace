# ADR-001: FHIR R4 as the Canonical Clinical Data Model

**Date:** 2025-07-15
**Status:** Accepted
**Context:** The healthcare platform must exchange clinical data across multiple services (LIMS, PharmacyMS, EHR, FHIR Server) and with external Ontario provincial systems (OLIS, DHDR, PrescribeIT, PCR).

## Decision
Use HL7 FHIR R4 as the canonical data model for all clinical resources. All internal services store FHIR resources or map to FHIR on persistence/retrieval.

## Rationale
- FHIR R4 is mandated by Health Infoway pan-Canadian standards (CA:FeatureSets, CA Core+)
- Ontario DHDR/OLIS/PCR all expose FHIR R4 APIs
- PrescribeIT uses FHIR R4 for ePrescribing
- Eliminates proprietary data model translation

## Consequences
- **Positive:** Plug-and-play integration with provincial systems; no ETL layer
- **Negative:** FHIR JSON is verbose; application-layer projection needed for UI performance
- **Mitigation:** `fhir-client.ts` abstracts FHIR reads; short-lived cache (`revalidate: 30`)

## Compliance
Aligns with: ONC/CMS Interoperability Final Rule, Canada Health Infoway FHIR Maturity Level 3+