# Roshi Communication Platform Documentation

**Revision date:** 2026-09-14
**Reading rule:** The EHR-hosted Communication Hub is a local-development implementation. PostgreSQL communication storage, an event backbone, workers, external providers, LiveKit, production authorization, FHIR projection, MFE host consumption, and production deployment are target capabilities unless a document explicitly records them as implemented.

## Canonical artifacts

| Artifact | Purpose |
|---|---|
| [01_Roshi_Communication_PRD.md](01_Roshi_Communication_PRD.md) | Product outcomes, current release boundary, requirements, safety rules, and release gates. |
| [HLD.md](HLD.md) | Current EHR-local topology plus the gated target production architecture. |
| [LLD.md](LLD.md) | Current source-level ownership plus the target service, schema, API, event, and FHIR contracts. |
| [05_Roshi_Communication_Epics_Features_User_Stories.md](05_Roshi_Communication_Epics_Features_User_Stories.md) | Dependency-ordered epics, features, user stories, and acceptance criteria. |
| [CURRENT_STATE_AUDIT.md](CURRENT_STATE_AUDIT.md) | Evidence-based implementation status, gaps, and verification history. |

## Supporting artifacts

- [02_Roshi_Communication_Architecture.md](02_Roshi_Communication_Architecture.md), [03_Roshi_Communication_HLD.md](03_Roshi_Communication_HLD.md), and [04_Roshi_Communication_LLD.md](04_Roshi_Communication_LLD.md) are legacy diagram references. Their diagrams are target-state illustrations and defer to the canonical Markdown documents above for current status.
- `*.docx` files are historical exports. Regenerate them from the canonical Markdown before using them as a current specification.
- [diagrams](diagrams) contains PlantUML source. Render with an approved PlantUML renderer when diagrams change; label a diagram `Current local implementation` before treating it as an implementation diagram.

## Architecture direction

Roshi will retain the EHR v1 facade while extracting canonical communication state into a Go/PostgreSQL service. The communication domain will own durable workflow truth and the FHIR projection adapter. The existing custom Go FHIR R4 service remains a separate clinical interoperability service, not the delivery broker. Provider, terminology, policy, audit, task, and deployment work must pass their defined gates before production use.

## Governance note

The target design supports healthcare security/privacy controls, but it is not a HIPAA or PHIPA certification. Final compliance depends on approved deployment, policy, access governance, partner contracts, audit, retention, operations, and organizational risk assessment.
