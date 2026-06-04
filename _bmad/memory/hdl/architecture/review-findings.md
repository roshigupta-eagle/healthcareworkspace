# Architecture Review Findings — HealthTriage

**Status:** complete — all items resolved
**Reviewer:** Winston (System Architect)
**Date:** 2026-05-03
**Phase:** Architecture

---

## Summary

Architecture review conducted against the discovery artifacts, 7 ADRs, and 6 diagrams.
All critical findings resolved before gate validation.

---

## Findings

| ID | Severity | Area | Finding | Resolution |
|---|---|---|---|---|
| AR-001 | Critical | AI/Privacy | Raw camera images must never be stored in FHIR or on disk | Resolved — ADR-005 mandates ephemeral processing; image discarded after AI call |
| AR-002 | Critical | Security | Mobile app cannot hold a client_secret | Resolved — ADR-006 mandates PKCE; no client_secret in app binary |
| AR-003 | High | Compliance | PHI must not leave Ontario without consent | Resolved — ADR-007: FHIR data stored Canada-region; AI image payload is de-identified and ephemeral |
| AR-004 | High | Reliability | AI API unavailability must not block all triage | Resolved — ADR-005: fallback rule returns pathway=gp if API unavailable or confidence <40% |
| AR-005 | Medium | FHIR | Custom pathway codes must have a registered CodeSystem URL | Accepted risk — URL defined in ADR-003; registration with Health Infoway is a pre-production action item |
| AR-006 | Medium | Architecture | Deterministic rule engine must be unit-testable separate from AI API | Resolved — hybrid architecture (ADR-005) isolates rule engine; AI call is mocked in tests |
| AR-007 | Low | UX/Compliance | Triage result disclaimer must appear on every result screen | Accepted — product requirement captured in use-case-brief and story AC |

---

## Approved Architecture

- **FHIR version**: R4 (ADR-001) ✓
- **Jurisdiction**: Ontario/Canada primary, US secondary (ADR-002) ✓
- **Terminology**: SNOMED CT CA + pCLOCD + custom pathway CodeSystem (ADR-003) ✓
- **FHIR server**: HAPI FHIR R4 via Docker Compose (ADR-004) ✓
- **AI model**: GPT-4o Vision + deterministic rule engine, ephemeral images (ADR-005) ✓
- **Auth**: SMART on FHIR v2 + PKCE (ADR-006) ✓
- **Privacy**: Canada-region storage, AES-256, TLS 1.3, PHIPA Consent resource (ADR-007) ✓

---

## Pre-Production Action Items (not blocking v1 dev)

1. Register HealthTriage CodeSystem URL with Health Infoway
2. Execute OpenAI Data Processing Agreement
3. Select production IDP (Keycloak Cloud / Azure AD B2C / Auth0)
4. Confirm Canada-region cloud deployment target
