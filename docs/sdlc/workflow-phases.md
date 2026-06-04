# SDLC Workflow Phases

## Overview

Nine-phase workflow from intake to post-release learning. Every phase has a defined gate review. All agents coordinate per the RACI model in `raci-model.md`.

```
INTAKE → DISCOVERY → DEFINITION → SOLUTIONING → IMPLEMENTATION → VALIDATION → RELEASE → OPERATIONS → LEARNING
  G1        G2           G3            G4              G5              G6          G7          —           —
```

---

## Phase 1: Intake

**Purpose:** Receive, classify, and triage new initiative requests.

**Owner:** John (PM), supported by Mary (Analyst)

**Inputs:** Feature request, bug report, business case, regulatory mandate, provincial IG update

**Activities:**
1. Receive initiative request (any agent or stakeholder can originate)
2. Mary classifies: bug fix | feature | epic | project | regulatory
3. Mary identifies target application(s): EHR (Hospital), PharmacyMS, LIMS, EHR (Practice), FHIR layer, or cross-application
4. John assigns priority (MoSCoW) and target PI/sprint
5. Winston performs 30-minute feasibility triage — technical viability, dependency scan, risk flags
6. Alex flags if FHIR/interoperability scope is involved

**Outputs:**
- `{initiative}/intake-ticket.md` — classification, priority, target apps, initial scope
- Decision: proceed to Discovery | park | reject

**Gate G1 — Intake Accepted:**
- [ ] Initiative classified and prioritised
- [ ] Target application(s) identified
- [ ] Feasibility triage complete (no blockers)
- [ ] Assigned to a PI/sprint cadence

---

## Phase 2: Discovery

**Purpose:** Deep research — domain, clinical workflows, user needs, technical landscape, FHIR/terminology requirements.

**Owner:** Mary (Analyst), Alex (FHIR), Morgan (Terminology)

**Activities:**
1. Mary conducts domain research (`bmad-domain-research`) — clinical workflow, regulatory context, stakeholder map
2. Sally conducts user research — interviews, persona validation, journey mapping
3. Alex identifies FHIR resources, profiles, IGs, and provincial constraints
4. Morgan identifies terminology requirements — code systems, value sets, editions, licensing
5. Winston conducts technical research (`bmad-technical-research`) — architecture options, tech-stack fit, proof-of-concept if needed
6. Cross-application impact analysis if feature spans EHR + PharmacyMS + LIMS + FHIR

**Outputs:**
- `{initiative}/discovery/domain-research.md`
- `{initiative}/discovery/user-research.md`
- `{initiative}/discovery/fhir-analysis.md`
- `{initiative}/discovery/terminology-analysis.md` + Morgan → Alex handoff
- `{initiative}/discovery/technical-feasibility.md`

**Gate G2 — Discovery Complete:**
- [ ] Domain research documented
- [ ] User personas and journey maps validated
- [ ] FHIR resource scope identified (Alex)
- [ ] Terminology requirements identified (Morgan → Alex handoff)
- [ ] Technical feasibility confirmed (Winston)
- [ ] Cross-app dependencies mapped

---

## Phase 3: Definition

**Purpose:** Create the PRD, UX specifications, FHIR data contracts, and terminology bindings.

**Owner:** John (PM) for PRD, Sally (UX) for design, Alex (FHIR) for data contracts

**Activities:**
1. John creates PRD (`bmad-create-prd`) — functional requirements, non-functional requirements, success criteria
2. Mary validates requirements against stakeholder needs
3. Sally creates UX design (`bmad-create-ux-design`) — wireframes, design tokens, component specs, persona-based layouts, all 5 display modes
4. Alex defines FHIR data requirements — resource model, profiles, CapabilityStatement, identifier systems
5. Morgan produces terminology binding specification → structured Alex handoff
6. Sally produces Jordan developer handoff for each component
7. John validates PRD (`bmad-validate-prd`)

**Outputs:**
- `{initiative}/definition/prd.md` (from template `templates/prd-template.md`)
- `{initiative}/definition/ux-design.md` — wireframes, token tables, component specs
- `{initiative}/definition/fhir-data-contract.md`
- `{initiative}/definition/terminology-bindings.md`
- `{initiative}/definition/jordan-handoff/` — per-component handoff packages

**Gate G3 — PRD Approved:**
- [ ] PRD complete with functional and non-functional requirements
- [ ] UX wireframes and component specs for all target personas
- [ ] FHIR data contracts reviewed by Alex
- [ ] Terminology bindings reviewed by Morgan + Alex
- [ ] All Sally → Jordan handoffs prepared
- [ ] Stakeholder sign-off (John)

---

## Phase 4: Solutioning

**Purpose:** Architecture decisions, API design, database schema, Temporal workflows, security model, epics/stories.

**Owner:** Winston (Architect), Alex (FHIR architecture)

**Activities:**
1. Winston creates architecture (`bmad-create-architecture`) — system design, microservice boundaries, microfrontend decomposition
2. Winston authors ADRs for every significant decision (from template `templates/adr-template.md`)
3. Alex designs FHIR profiles, IG structure, HAPI FHIR server configuration
4. Amelia designs Go/Rust service contracts, Temporal workflows, PostgreSQL schema, Goose migrations
5. Jordan designs React component architecture, data layer hooks, state machines
6. Winston conducts security/privacy architecture review
7. John creates epics and stories (`bmad-create-epics-and-stories`)
8. John runs sprint planning (`bmad-sprint-planning`)

**Outputs:**
- `{initiative}/solutioning/architecture.md` (from template `templates/architecture-template.md`)
- `{initiative}/solutioning/adrs/` — ADR files
- `{initiative}/solutioning/fhir-profiles.md`
- `{initiative}/solutioning/api-contracts.md`
- `{initiative}/solutioning/database-schema.md`
- `{initiative}/solutioning/temporal-workflows.md`
- `{initiative}/solutioning/security-design.md`
- `{initiative}/solutioning/epics/` — epic and story files
- `{initiative}/solutioning/sprint-plan.md`

**Gate G4 — Architecture Approved:**
- [ ] Architecture document complete (Winston)
- [ ] ADRs authored and reviewed for all key decisions
- [ ] FHIR profiles and IG structure approved (Alex)
- [ ] API contracts defined (Winston + Amelia)
- [ ] Database schema and migration plan ready (Amelia)
- [ ] Temporal workflow designs approved (Winston + Amelia)
- [ ] Security review passed (Winston)
- [ ] Epics/stories created and sprint plan set (John)
- [ ] Implementation readiness check (`bmad-check-implementation-readiness`)

---

## Phase 5: Implementation

**Purpose:** Code development — frontend, backend, FHIR integration, tests.

**Owner:** Jordan (frontend), Amelia (backend), with review gates

**Activities:**
1. Amelia develops story (`bmad-dev-story`) — Go/Rust microservices, Temporal workflows, Goose migrations, PostgreSQL/Redis/NoSQL
2. Jordan develops story — React/TypeScript components, microfrontend modules, FHIR data layer hooks
3. Jordan → Alex review gate: every FHIR data contract in frontend
4. Jordan → Winston review gate: every architecture decision in frontend
5. Amelia → Winston review gate: every architecture decision in backend
6. Amelia → Alex review gate: every FHIR integration in backend
7. Code review (`bmad-code-review`) — layer compliance, TypeScript strictness, Go idioms, test coverage
8. John tracks sprint status (`bmad-sprint-status`)
9. Amelia generates E2E tests (`bmad-qa-generate-e2e-tests`)

**Outputs:**
- Working code in `ehr/`, `pharmacyms/`, `lims/`, `fhir/`
- Unit tests, integration tests, E2E tests
- Updated API documentation
- Sprint status reports

**Gate G5 — Story Acceptance:**
- [ ] All acceptance criteria met
- [ ] Tests pass (unit + integration + E2E)
- [ ] Code review passed (`bmad-code-review`)
- [ ] FHIR review sign-off (Alex) — for FHIR-touching code
- [ ] Architecture review sign-off (Winston) — for architecture-impacting code
- [ ] No lint/type errors

---

## Phase 6: Validation

**Purpose:** End-to-end validation — conformance, accessibility, performance, security, UAT.

**Owner:** Winston (overall quality gate), Alex (FHIR conformance)

**Activities:**
1. E2E integration testing across applications (Jordan + Amelia)
2. FHIR conformance testing — profile validation, CapabilityStatement, IG NPM package validation (Alex)
3. Terminology validation — `$validate-code`, `$expand`, value set membership (Morgan → Alex)
4. Accessibility audit — WCAG 2.2 AA, AODA/508 compliance (Sally)
5. Performance and load testing (Winston + Amelia)
6. Security review — OWASP Top 10, SMART on FHIR auth, PHI handling (Winston)
7. UAT coordination — stakeholder acceptance (John)

**Outputs:**
- `{initiative}/validation/e2e-test-report.md`
- `{initiative}/validation/fhir-conformance-report.md`
- `{initiative}/validation/accessibility-audit.md`
- `{initiative}/validation/performance-report.md`
- `{initiative}/validation/security-review.md`
- `{initiative}/validation/uat-signoff.md`

**Gate G6 — Validation Passed:**
- [ ] E2E tests pass across all target applications
- [ ] FHIR conformance tests pass (Alex)
- [ ] Terminology validation pass (Morgan)
- [ ] Accessibility audit pass — no blockers (Sally)
- [ ] Performance within SLA thresholds
- [ ] Security review — no critical/high findings
- [ ] UAT sign-off (John + stakeholders)

---

## Phase 7: Release

**Purpose:** Production deployment with rollback safety.

**Owner:** John (release decision), Winston (deployment architecture)

**Activities:**
1. Paige writes release notes and changelog
2. Paige creates/updates deployment runbook
3. Amelia executes production deployment (blue-green or canary)
4. Jordan + Amelia execute smoke tests
5. Winston verifies rollback plan
6. John communicates release to stakeholders

**Outputs:**
- `{initiative}/release/release-notes.md`
- `{initiative}/release/deployment-runbook.md`
- `{initiative}/release/smoke-test-results.md`

**Gate G7 — Production Release:**
- [ ] Release notes published (Paige)
- [ ] Deployment runbook reviewed (Winston)
- [ ] Smoke tests pass post-deploy
- [ ] Rollback tested and verified
- [ ] Stakeholder notification sent (John)
- [ ] Monitoring dashboards confirmed active

---

## Phase 8: Operations & Monitoring

**Purpose:** Production stability, incident response, hotfixes.

**Owner:** Amelia (operations), Winston (escalation)

**Activities:**
1. Monitor production health — logs, metrics, alerts
2. Incident response — triage, hotfix, root cause analysis
3. Hotfix development (Amelia + Jordan) with expedited gate review
4. Paige updates runbooks and incident playbooks

**Outputs:**
- Incident reports
- Hotfix PRs with expedited reviews
- Updated runbooks

---

## Phase 9: Learning

**Purpose:** Retrospective, metrics review, process improvement, knowledge capture.

**Owner:** John (PM), all agents participate

**Activities:**
1. Retrospective (`bmad-retrospective`) — what went well, what didn't, action items
2. Metrics review — velocity, defect rate, deployment frequency, MTTR
3. Paige captures knowledge — updated docs, lessons learned
4. Process improvement — update SDLC workflow, templates, or gates as needed

**Outputs:**
- `{initiative}/learning/retrospective.md`
- `{initiative}/learning/metrics-review.md`
- Updated `docs/` knowledge base
