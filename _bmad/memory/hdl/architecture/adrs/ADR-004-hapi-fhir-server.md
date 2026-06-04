# ADR-004 — HAPI FHIR Server Configuration

**Status:** Accepted
**Accepted:** 2026-05-03
**Date:** 2026-05-03
**Deciders:** Winston (Architect), Amelia (Developer)
**Tags:** fhir, hapi, infrastructure, docker

---

## Context

HealthTriage requires a FHIR R4 server to store and retrieve patient triage resources
(Patient, Observation, ClinicalImpression, Encounter, Media, Communication, ServiceRequest).
The server must be runnable locally for development and testable via the HDL deploy pipeline.
It must support profile validation, search parameters, and SMART on FHIR token validation.

## Decision

We will use the **HAPI FHIR JPA Server R4** (`hapiproject/hapi:latest`) deployed via Docker
Compose for local development. The same image is used in CI and as the deployment target
for the HDL deploy gate. Profile validation is enabled via the `hapi.fhir.validation.enabled`
environment variable. SMART on FHIR token introspection is configured via the
`spring.security.oauth2.resourceserver` settings.

## Options Considered

| Option | Pros | Cons |
|---|---|---|
| HAPI FHIR JPA (selected) | Open source; Docker-ready; R4 fully supported; profile validation built-in; large community | Java heap tuning required for production; not a hosted service |
| Azure Health Data Services | Managed; scalable; SMART on FHIR built-in | Cost; vendor lock-in; not runnable locally |
| Google Cloud Healthcare API | Managed; scalable | Cost; vendor lock-in; limited local dev story |
| Firely Server | High conformance testing; commercial | Cost; separate licensing |

## Consequences

**Positive:**
- Zero cost for local development and CI
- Full FHIR R4 conformance; passes HL7 touchstone tests
- Profile validation catches non-conformant resources at write time
- Docker Compose makes environment reproducible across developer machines
- HDL deploy gate can poll `/fhir/metadata` for readiness deterministically

**Negative / Trade-offs:**
- Requires Docker Desktop on developer machines
- JVM cold start can take 30–60 seconds — HDL deploy gate polls for 120s to handle this
- Production deployment requires additional configuration (SSL, auth, heap sizing)

## Healthcare Compliance Notes

HAPI FHIR is not inherently PHIPA/HIPAA compliant — compliance is achieved by the
deployment configuration:
- Encrypted storage (AES-256 at rest via Docker volume encryption or cloud disk encryption)
- TLS 1.2+ for all connections in production
- Access logs retained per PHIPA retention requirements
- SMART on FHIR authorization gates all resource access in production

## References

- HAPI FHIR documentation: https://hapifhir.io/hapi-fhir/docs/
- HAPI Docker: https://hub.docker.com/r/hapiproject/hapi
- SMART on FHIR v2: https://hl7.org/fhir/smart-app-launch/
