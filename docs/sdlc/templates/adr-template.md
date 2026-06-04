# Architecture Decision Record Template

> **Instructions:** Copy into `{initiative}/solutioning/adrs/ADR-NNN.md`. Use with Winston (Architect). Alex (FHIR SME) reviews FHIR-impacting ADRs.

---

## ADR-NNN: [Title]

**Status:** Proposed | Accepted | Deprecated | Superseded by ADR-NNN

**Date:** YYYY-MM-DD

**Author:** Winston (Architect)

**Reviewers:** [list — always include Alex for FHIR, Amelia for backend, Jordan for frontend]

**Target application(s):** EHR (Hospital) / PharmacyMS / LIMS / EHR (Practice) / FHIR / Cross-app

---

### Context

<!-- What is the issue or requirement that motivates this decision? Include relevant constraints, forces, and existing context. -->

### Decision

<!-- What is the change being proposed or decided? Be specific about technology, pattern, or approach. -->

### Tech-stack alignment

| Technology | Role in this decision | Rationale |
|---|---|---|
| Go / Rust | | |
| React / TypeScript | | |
| PostgreSQL + PgBouncer | | |
| Redis | | |
| MongoDB / DynamoDB | | |
| Temporal | | |
| Goose | | |
| HAPI FHIR | | |
| Module Federation | | |

### FHIR implications

> **Requires Alex review if any row is filled.**

| Impact area | Current state | Proposed change | Alex review needed? |
|---|---|---|---|
| FHIR profiles | | | |
| CapabilityStatement | | | |
| Terminology bindings | | | |
| Search parameters | | | |
| API contracts | | | |
| HAPI configuration | | | |

### Consequences

**Positive:**
- 

**Negative:**
- 

**Risks:**
- 

### Alternatives considered

| Alternative | Pros | Cons | Why rejected |
|---|---|---|---|

### Timeline impact

| Milestone | Impact |
|---|---|
| Implementation | |
| Testing | |
| Deployment | |

### Sign-off

| Role | Agent | Sign-off | Date |
|---|---|---|---|
| Architect | Winston | [ ] | |
| FHIR SME | Alex | [ ] | |
| Backend Dev | Amelia | [ ] | |
| Frontend Dev | Jordan | [ ] | |
