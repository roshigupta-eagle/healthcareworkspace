# PRD Template

> **Instructions:** Copy this template into `{initiative}/definition/prd.md`. Fill every section. Mark TBD sections explicitly. Use `bmad-create-prd` or `bmad-edit-prd` with John (PM) to complete.

---

## 1. Document metadata

| Field | Value |
|---|---|
| Initiative | |
| Target application(s) | EHR (Hospital) / PharmacyMS / LIMS / EHR (Practice) / FHIR / Cross-app |
| Author | John (PM) |
| Contributors | Mary, Sally, Winston, Alex, Morgan |
| Status | Draft / In Review / Approved |
| Created | YYYY-MM-DD |
| Last updated | YYYY-MM-DD |
| PI / Sprint target | |
| Priority | Must / Should / Could / Won't |

## 2. Problem statement

### 2.1 Business problem
<!-- What business problem does this solve? Who is affected? What is the cost of inaction? -->

### 2.2 User problem (Jobs-to-be-Done)
<!-- What job is the user trying to get done? What are they hiring this solution to do? -->

| Job statement | Primary persona | Current alternative | Pain level (1–5) |
|---|---|---|---|

### 2.3 Regulatory / compliance driver
<!-- Is this driven by a regulation? Which one? Deadline? -->

| Regulation | Jurisdiction | Deadline | Impact if missed |
|---|---|---|---|

## 3. Target personas

| Persona | Role | Context of use | Primary needs | Accessibility profile |
|---|---|---|---|---|

> Reference Sally's persona profiles in `docs/sdlc/templates/` for healthcare-specific persona templates.

## 4. Functional requirements

### 4.1 User stories

| ID | As a... | I want to... | So that... | Priority | Target app |
|---|---|---|---|---|---|
| FR-001 | | | | | |

### 4.2 Acceptance criteria

For each story, define acceptance criteria in Given/When/Then format:

```
FR-001:
  Given: <precondition>
  When: <action>
  Then: <expected result>
```

### 4.3 FHIR data requirements

> **Requires Alex (FHIR SME) review.**

| UI field / feature | FHIR resource | FHIR path | Profile | Identifier system | Notes |
|---|---|---|---|---|---|

### 4.4 Terminology requirements

> **Requires Morgan (Terminology Advisor) → Alex handoff.**

| Data element | Code system | Canonical URI | Edition/version | Binding strength | Bilingual? |
|---|---|---|---|---|---|

## 5. Non-functional requirements

### 5.1 Performance

| Metric | Target | Measurement method |
|---|---|---|
| Page load time (P95) | | |
| API response time (P95) | | |
| Concurrent users | | |
| Database query time (P95) | | |

### 5.2 Availability & reliability

| Metric | Target |
|---|---|
| Uptime SLA | |
| RTO (Recovery Time Objective) | |
| RPO (Recovery Point Objective) | |
| MTTR (Mean Time to Recovery) | |

### 5.3 Security & privacy

| Requirement | Standard | Detail |
|---|---|---|
| Authentication | SMART on FHIR / OAuth 2.0 | |
| Authorization | RBAC / ABAC / scope-based | |
| PHI handling | PIPEDA / PHIPA / HIPAA | |
| Audit logging | | |
| Encryption at rest | | |
| Encryption in transit | TLS 1.3 | |
| Data residency | Canadian data sovereignty | |

### 5.4 Accessibility

| Standard | Level | Jurisdiction |
|---|---|---|
| WCAG 2.2 | AA minimum | All |
| AODA IASR | | Ontario |
| ACA | | Federal Canada |
| Section 508 | | US |
| Bilingual EN/FR | | Pan-Canadian / Federal |

### 5.5 Scalability

| Dimension | Current | Target | Growth rate |
|---|---|---|---|
| Users | | | |
| Data volume | | | |
| Transaction rate | | | |

### 5.6 Interoperability

| System | Protocol | Direction | FHIR IG | Provincial/national |
|---|---|---|---|---|
| Ontario DHDR | FHIR R4 | Read | DHDR IG | Ontario Health |
| Ontario OLIS | FHIR R4 | Read | OLIS IG | Ontario Health |
| Ontario PCR | FHIR R4 | Read | PCR IG | Ontario Health |
| PrescribeIT | FHIR R4 | Read/Write | PrescribeIT IG | Infoway |

## 6. UX requirements

> Reference Sally (UX) detailed design in `{initiative}/definition/ux-design.md`.

### 6.1 Key screens / workflows

| Screen | Primary persona | FHIR resources displayed | Density mode | Bilingual? |
|---|---|---|---|---|

### 6.2 Design system requirements

- [ ] New design tokens needed
- [ ] New primitive components
- [ ] New composite components
- [ ] New pattern library entries
- [ ] New page templates

## 7. Cross-application impact

| Application | Impact | Shared resource | Coordination needed |
|---|---|---|---|
| EHR (Hospital) | | | |
| PharmacyMS | | | |
| LIMS | | | |
| EHR (Practice) | | | |
| FHIR layer | | | |

## 8. Dependencies & risks

### 8.1 Dependencies

| Dependency | Owner | Status | Risk if delayed |
|---|---|---|---|

### 8.2 Risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|

## 9. Success criteria

| Metric | Baseline | Target | Measurement |
|---|---|---|---|

## 10. Out of scope

<!-- Explicitly list what is NOT in scope for this initiative. -->

## 11. Timeline

| Milestone | Target date | Gate |
|---|---|---|
| Discovery complete | | G2 |
| PRD approved | | G3 |
| Architecture approved | | G4 |
| Implementation complete | | G5 |
| Validation passed | | G6 |
| Production release | | G7 |

## 12. Sign-off

| Role | Agent | Sign-off | Date |
|---|---|---|---|
| Product Manager | John | [ ] | |
| Business Analyst | Mary | [ ] | |
| UX Designer | Sally | [ ] | |
| Architect | Winston | [ ] | |
| FHIR SME | Alex | [ ] | |
| Terminology | Morgan | [ ] | |
