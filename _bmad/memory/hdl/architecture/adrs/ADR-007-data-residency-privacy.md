# ADR-007 — Data Residency and Privacy

**Status:** Accepted
**Accepted:** 2026-05-03
**Date:** 2026-05-03
**Deciders:** Winston (Architect), John (PM)
**Tags:** privacy, phipa, pipeda, data-residency, encryption

---

## Context

HealthTriage processes and stores personal health information (PHI) including patient
demographics, symptom observations, and triage results. Ontario's PHIPA requires PHI to be
stored within Canada unless explicit cross-border consent is obtained. PIPEDA applies at
the federal level for any data transferred outside Ontario. GDPR does not apply (no EU users
in v1), but privacy-by-design principles are applied regardless.

The AI image processing component (GPT-4o Vision API) calls an external US-based API.
This creates a potential cross-border data transfer concern that must be addressed.

## Decision

1. **FHIR data at rest**: Stored in Canada (Ontario region). For development: local Docker
   volume on developer machine. For production: Canada-region cloud storage (e.g., Azure
   Canada Central, AWS ca-central-1).

2. **Encryption at rest**: AES-256 for all FHIR data volumes.

3. **Encryption in transit**: TLS 1.2 minimum for all connections. TLS 1.3 preferred.

4. **AI image processing**: Images sent to GPT-4o Vision API are **ephemeral and de-identified**:
   - No patient name, health card number, or demographics included in the image API payload
   - Image is base64-encoded, sent, result received, image discarded — never written to disk
   - This is classified as processing (not storage) under PHIPA; a data processing agreement
     with OpenAI is required before production launch.

5. **Camera data**: Never stored. Processed in app memory only. Raw frames are discarded
   after AI call completes.

6. **Retention**: PHI retained per PHIPA minimum — 10 years after last clinical interaction.
   Deletion workflow (patient right-to-erasure) is a v2 feature; v1 provides admin-initiated deletion only.

7. **Consent**: FHIR Consent resource created per patient before any PHI is stored. Consent
   includes: scope (triage), category (patient privacy), policyRule (PHIPA), dateTime.

## Options Considered

| Option | Pros | Cons |
|---|---|---|
| Canada-only storage + ephemeral AI (selected) | PHIPA compliant; privacy-by-design | Requires Canada-region cloud for production; OpenAI DPA required |
| Store everything including images in Canada | Full data sovereignty | Image storage is high-cost; violates data minimisation principle |
| US-region storage | Simpler (single cloud region) | PHIPA violation; Ontario PHI cannot be stored in US without consent |

## Consequences

**Positive:**
- PHIPA compliance for Ontario launch without cross-border consent workflow
- Data minimisation (ephemeral images) reduces breach impact surface
- AES-256 + TLS 1.3 satisfies PHIPA technical safeguard requirements
- FHIR Consent resource provides auditable record of patient consent

**Negative / Trade-offs:**
- OpenAI Data Processing Agreement must be executed before production (timeline risk)
- Canada-region cloud adds ~5–15ms latency vs US-east regions (acceptable for triage)
- Patient right-to-erasure not fully automated in v1

## Healthcare Compliance Notes

**PHIPA s.13**: PHI may only be disclosed outside Ontario with express consent or as permitted
by regulation. Ephemeral AI processing is classified as a permitted use (treatment purposes)
with appropriate safeguards (DPA, de-identification of image payload).

**PIPEDA Principle 4.7**: Safeguards — personal information must be protected by security
safeguards appropriate to the sensitivity of the information. AES-256 + TLS 1.3 satisfies this.

## References

- PHIPA: https://www.ontario.ca/laws/statute/04p03
- PIPEDA: https://laws-lois.justice.gc.ca/eng/acts/P-8.6/
- FHIR Consent: https://hl7.org/fhir/R4/consent.html
- OpenAI Data Processing: https://openai.com/policies/data-processing-addendum
