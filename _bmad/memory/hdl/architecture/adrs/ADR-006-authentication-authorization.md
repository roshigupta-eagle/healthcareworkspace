# ADR-006 — Authentication and Authorization

**Status:** Accepted
**Accepted:** 2026-05-03
**Date:** 2026-05-03
**Deciders:** Winston (Architect), Amelia (Developer)
**Tags:** security, smart-on-fhir, oauth2, pkce, authentication

---

## Context

HealthTriage stores sensitive health data (triage results, patient demographics, observations)
in a FHIR R4 server. Access to FHIR resources must be authenticated and scoped. The app has
two user modes: (1) anonymous triage (no FHIR storage) and (2) authenticated triage (full FHIR
resource creation and history). Authentication must work on native mobile (iOS/Android).

## Decision

We will use **SMART on FHIR v2 (HL7 SMART App Launch 2.0)** with **PKCE** (Proof Key for Code
Exchange) as the authentication and authorisation framework.

- **Authenticated users**: SMART on FHIR v2 standalone app launch with PKCE. Scopes:
  `patient/*.write patient/*.read openid fhirUser`
- **Anonymous users**: No token required; triage is performed but no FHIR resources are
  created. User is prompted to create an account to save results.
- **HAPI FHIR server**: Configured with Spring Security OAuth2 resource server to validate
  tokens against the configured identity provider.
- **Identity provider**: Keycloak (self-hosted) for development; production IDP TBD (could be
  Keycloak Cloud, Azure AD B2C, or Auth0 — decision deferred to deployment ADR).

## Options Considered

| Option | Pros | Cons |
|---|---|---|
| SMART on FHIR v2 + PKCE (selected) | FHIR standard; mobile-safe (PKCE); patient-centric scopes; Keycloak compatible | More complex setup than API keys; requires token introspection on HAPI |
| API key authentication | Simple | Not patient-centric; no per-user scoping; not FHIR standard |
| OAuth2 without SMART | Standard OAuth2 | Does not provide FHIR resource-level scopes (patient/*.read) |
| Anonymous only (no auth) | Simple | No data persistence; no clinician review; privacy risk |

## Consequences

**Positive:**
- SMART on FHIR is the Canadian and US standard for patient-facing FHIR apps
- PKCE prevents authorization code interception on mobile (no client secret required)
- Patient-level scopes ensure each user can only access their own FHIR resources
- Keycloak is open source and runnable in Docker alongside HAPI FHIR for dev

**Negative / Trade-offs:**
- Requires an identity provider; adds infrastructure complexity
- SMART on FHIR token introspection adds latency to each FHIR request (~50ms)
- Anonymous mode creates a UX split (triage works but results aren't saved — may frustrate users)

## Healthcare Compliance Notes

SMART on FHIR v2 satisfies PHIPA access control requirements: each patient accesses only their
own records; access is logged; tokens expire (configurable, recommend 1 hour for patient apps).

PKCE is mandatory for public clients (mobile apps) per SMART v2 spec — no client_secret in the app binary.

## References

- SMART App Launch 2.0: https://hl7.org/fhir/smart-app-launch/
- Keycloak SMART on FHIR: https://github.com/Alvearie/keycloak-extensions-for-fhir
- PKCE RFC 7636: https://www.rfc-editor.org/rfc/rfc7636
