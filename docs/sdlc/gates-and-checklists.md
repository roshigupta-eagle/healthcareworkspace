# Gates & Checklists

This document consolidates all quality gates (G1–G7) from the SDLC workflow. Each gate must pass before the initiative advances to the next phase.

---

## G1 — Intake Gate (Intake → Discovery)

**Gate owner:** John (PM)

| # | Check | Verified by |
|---|---|---|
| 1 | Initiative has a clear problem statement | John |
| 2 | Target application(s) identified | John |
| 3 | Initial stakeholders identified | Mary |
| 4 | Strategic alignment confirmed | John |
| 5 | No duplicate / overlapping active initiative | John |
| 6 | Rough priority assigned (Must/Should/Could/Won't) | John |

**Pass criteria:** All items checked. Initiative folder created.

---

## G2 — Discovery Gate (Discovery → Definition)

**Gate owner:** Mary (Business Analyst)

| # | Check | Verified by |
|---|---|---|
| 1 | Domain research document complete | Mary |
| 2 | Market / competitive analysis complete (if applicable) | Mary |
| 3 | User personas validated with stakeholders | Mary, Sally |
| 4 | Regulatory / compliance requirements identified | Mary, Alex |
| 5 | Cross-application impact preliminary assessment done | Mary, Winston |
| 6 | Technical feasibility preliminary assessment done | Winston |
| 7 | FHIR resources / profiles preliminary identification | Alex |
| 8 | Terminology requirements preliminary identification | Morgan |

**Pass criteria:** All items checked. Discovery artifacts in `{initiative}/discovery/`.

---

## G3 — Definition Gate (Definition → Solutioning)

**Gate owner:** John (PM)

| # | Check | Verified by |
|---|---|---|
| 1 | PRD complete (all sections filled, no TBDs in Must-have items) | John |
| 2 | PRD validated against standards (`bmad-validate-prd`) | John |
| 3 | User stories have acceptance criteria in Given/When/Then | John |
| 4 | FHIR data requirements reviewed by Alex | Alex |
| 5 | Terminology requirements reviewed by Morgan → Alex handoff complete | Morgan, Alex |
| 6 | UX design specifications complete | Sally |
| 7 | UX designs reviewed for accessibility (WCAG 2.2 AA, AODA, bilingual) | Sally |
| 8 | Cross-application impact table filled | John, Winston |
| 9 | NFRs have measurable targets | John, Winston |
| 10 | Sign-off matrix signed by all required roles | All listed |

**Pass criteria:** PRD and UX design approved. All sign-offs obtained.

---

## G4 — Solutioning Gate (Solutioning → Implementation)

**Gate owner:** Winston (Architect)

| # | Check | Verified by |
|---|---|---|
| 1 | Architecture document complete | Winston |
| 2 | Component diagram includes all affected services and MFEs | Winston |
| 3 | FHIR architecture section reviewed and signed by Alex | Alex |
| 4 | API contracts defined (REST + FHIR) | Winston, Alex |
| 5 | Database schema changes identified with Goose migration plan | Amelia |
| 6 | Security architecture reviewed (auth, PHI, audit) | Winston |
| 7 | Deployment strategy defined | Winston |
| 8 | ADRs written for all significant decisions | Winston |
| 9 | Epics and stories created with story points | John, Mary |
| 10 | Sprint plan generated | John |
| 11 | Implementation readiness check passed (`bmad-check-implementation-readiness`) | Winston |
| 12 | Tech-stack guidance alignment verified | Winston |
| 13 | Jordan (Frontend) and Amelia (Backend) confirm feasibility | Jordan, Amelia |

**Pass criteria:** Architecture approved. Sprint plan ready. All sign-offs obtained.

---

## G5 — Implementation Gate (Implementation → Validation)

**Gate owner:** Amelia (Backend Dev)

| # | Check | Verified by |
|---|---|---|
| 1 | All stories in sprint marked complete | Amelia, Jordan |
| 2 | Unit test coverage ≥ 80% (Go, Rust, TypeScript) | Amelia, Jordan |
| 3 | Integration tests pass for all affected services | Amelia |
| 4 | FHIR conformance tests pass against IG profiles | Alex |
| 5 | FHIR validation interceptors return zero errors on test data | Alex |
| 6 | Goose migrations applied cleanly (up and down) | Amelia |
| 7 | Frontend components pass Storybook visual regression | Jordan |
| 8 | Accessibility audit passes (axe, Lighthouse) | Jordan, Sally |
| 9 | Code review completed (adversarial + edge-case) | Amelia, Jordan |
| 10 | No critical or high severity security findings | Amelia |
| 11 | API documentation updated (OpenAPI, FHIR CapabilityStatement) | Alex, Amelia |
| 12 | Technical debt items logged (if any deferred) | Amelia |

**Pass criteria:** All tests green. Code review approved. No blocking issues.

---

## G6 — Validation Gate (Validation → Release)

**Gate owner:** John (PM) + Mary (BA)

| # | Check | Verified by |
|---|---|---|
| 1 | E2E tests pass all acceptance criteria from PRD | Amelia, Jordan |
| 2 | FHIR integration tests pass against external system stubs | Alex |
| 3 | Performance tests meet NFR targets (P95 response times) | Amelia |
| 4 | Load tests meet concurrent user targets | Amelia |
| 5 | Security penetration test completed (no critical findings) | Amelia |
| 6 | Accessibility testing completed (all target standards) | Sally, Jordan |
| 7 | Bilingual (EN/FR) content verified (if applicable) | Sally |
| 8 | Cross-application integration tested | Amelia, Jordan |
| 9 | User acceptance testing completed | Mary, John |
| 10 | Documentation updated (user docs, API docs, runbooks) | Paige |
| 11 | Rollback plan documented and tested | Winston, Amelia |
| 12 | Data migration plan tested (if applicable) | Amelia |

**Pass criteria:** All validation passed. UAT approved. Release package ready.

---

## G7 — Release Gate (Release → Operations)

**Gate owner:** Winston (Architect)

| # | Check | Verified by |
|---|---|---|
| 1 | Staging environment mirrors production configuration | Winston |
| 2 | Blue-green deployment tested in staging | Amelia |
| 3 | Health check endpoints responding correctly | Amelia |
| 4 | Monitoring dashboards configured (Prometheus/Grafana) | Amelia |
| 5 | Alerting rules configured for SLA thresholds | Amelia |
| 6 | Goose migrations applied to production | Amelia |
| 7 | FHIR CapabilityStatement updated in production | Alex |
| 8 | Feature flags configured (if applicable) | Amelia |
| 9 | Rollback procedure verified | Winston, Amelia |
| 10 | Release notes published | Paige |
| 11 | Stakeholder communication sent | John |
| 12 | Post-release monitoring plan active | Winston |

**Pass criteria:** Production deployment successful. Monitoring active. No degradation detected in 24-hour bake period.

---

## Cross-cutting checklists

### Security checklist (applicable at G4, G5, G6)

| # | Check |
|---|---|
| 1 | OWASP Top 10 vulnerabilities addressed |
| 2 | PHI encrypted at rest (AES-256) and in transit (TLS 1.3) |
| 3 | Authentication via SMART on FHIR / OAuth 2.0 |
| 4 | Authorization scopes match least-privilege principle |
| 5 | Audit logging captures all PHI access events |
| 6 | No secrets in code, config files, or container images |
| 7 | Container images scanned with Trivy (no critical CVEs) |
| 8 | SQL injection prevention verified (parameterized queries) |
| 9 | CORS policy restrictive and correct |
| 10 | Rate limiting configured on public endpoints |

### Accessibility checklist (applicable at G5, G6)

| # | Check | Standard |
|---|---|---|
| 1 | Colour contrast ratios ≥ 4.5:1 (AA) for all text | WCAG 2.2 |
| 2 | All interactive elements keyboard navigable | WCAG 2.2 |
| 3 | Screen reader compatibility verified (NVDA, VoiceOver) | WCAG 2.2 |
| 4 | Focus management correct in modals and dialogs | WCAG 2.2 |
| 5 | High-contrast mode renders correctly | AODA |
| 6 | Reduced-motion mode disables animations | WCAG 2.2 |
| 7 | Forced-colors mode renders correctly | WCAG 2.2 |
| 8 | Touch targets ≥ 44×44px on mobile | WCAG 2.2 |
| 9 | Error messages are descriptive and linked to fields | WCAG 2.2 |
| 10 | Bilingual EN/FR content toggles correctly | ACA |

### FHIR conformance checklist (applicable at G5, G6)

| # | Check |
|---|---|
| 1 | Resources validate against declared IG profiles |
| 2 | Required elements populated per profile cardinality |
| 3 | Terminology bindings respected (required/extensible/preferred) |
| 4 | Identifiers use correct system URIs per jurisdiction |
| 5 | CapabilityStatement accurately reflects supported interactions |
| 6 | Search parameters return correct results |
| 7 | _include / _revinclude work as documented |
| 8 | Bundle pagination returns stable pages |
| 9 | Error responses follow FHIR OperationOutcome format |
| 10 | SMART scopes match FHIR resource access patterns |
