# RACI Model & Agent Coordination

## RACI key

- **R** — Responsible: does the work
- **A** — Accountable: owns the outcome, one per activity
- **C** — Consulted: provides input before the decision
- **I** — Informed: notified after the decision

## RACI matrix by SDLC phase

### Phase 1: Intake

| Activity | Mary (Analyst) | John (PM) | Sally (UX) | Winston (Arch) | Alex (FHIR) | Morgan (Term) | Jordan (UI Dev) | Amelia (Backend Dev) | Paige (Tech Writer) |
|---|---|---|---|---|---|---|---|---|---|
| Receive initiative request | R | A | I | I | I | I | I | I | I |
| Classify (feature/epic/project) | R | A | I | C | I | I | I | I | I |
| Identify target application(s) | R | A | I | C | C | I | I | I | I |
| Stakeholder identification | R | A | I | I | I | I | I | I | I |
| Initial feasibility triage | C | A | I | R | C | I | I | C | I |
| **Gate: Intake accepted** | C | A | I | C | I | I | I | I | I |

### Phase 2: Discovery

| Activity | Mary | John | Sally | Winston | Alex | Morgan | Jordan | Amelia | Paige |
|---|---|---|---|---|---|---|---|---|---|
| Domain research | R | C | I | C | C | C | I | I | I |
| Market / competitive analysis | R | C | I | I | I | I | I | I | I |
| User interviews / personas | C | C | R | I | I | I | I | I | I |
| Clinical workflow mapping | R | C | C | C | R | C | I | I | I |
| FHIR resource discovery | I | I | I | C | R | C | I | I | I |
| Terminology requirements | I | I | I | I | C | R | I | I | I |
| Technical feasibility study | I | C | I | R | C | I | C | C | I |
| **Gate: Discovery complete** | R | A | C | C | C | C | I | I | I |

### Phase 3: Definition

| Activity | Mary | John | Sally | Winston | Alex | Morgan | Jordan | Amelia | Paige |
|---|---|---|---|---|---|---|---|---|---|
| PRD creation | C | R/A | C | C | C | I | I | I | I |
| Functional requirements | R | A | C | C | C | C | I | I | I |
| Non-functional requirements | C | A | I | R | C | I | I | C | I |
| UX design / wireframes | I | C | R/A | I | C | I | C | I | I |
| User journey mapping | C | C | R/A | I | I | I | I | I | I |
| Design system components | I | I | R/A | I | I | I | C | I | I |
| FHIR data requirements | I | I | I | C | R/A | C | C | I | I |
| Terminology binding spec | I | I | I | I | C | R/A | I | I | I |
| PRD validation | C | A | C | C | C | C | I | I | I |
| **Gate: PRD approved** | C | A | C | C | C | I | I | I | I |

### Phase 4: Solutioning

| Activity | Mary | John | Sally | Winston | Alex | Morgan | Jordan | Amelia | Paige |
|---|---|---|---|---|---|---|---|---|---|
| Architecture design | I | C | I | R/A | C | I | C | C | I |
| ADR authoring | I | I | I | R/A | C | I | C | C | I |
| FHIR profile / IG design | I | I | I | C | R/A | C | I | I | I |
| API contract design | I | I | I | C | R | I | C | R | I |
| Database schema design | I | I | I | C | I | I | I | R | C |
| Temporal workflow design | I | I | I | R | I | I | I | C | I |
| Microfrontend decomposition | I | I | C | R | I | I | C | I | I |
| Security / privacy design | I | I | I | R/A | C | I | I | C | I |
| Epics & stories creation | C | R/A | C | C | C | I | I | I | I |
| Sprint planning | C | R/A | C | C | I | I | C | C | I |
| **Gate: Architecture approved** | I | A | I | R | C | I | I | C | I |

### Phase 5: Implementation

| Activity | Mary | John | Sally | Winston | Alex | Morgan | Jordan | Amelia | Paige |
|---|---|---|---|---|---|---|---|---|---|
| Frontend development (React) | I | I | C | I | I | I | R/A | I | I |
| Backend development (Go/Rust) | I | I | I | I | I | I | I | R/A | I |
| FHIR integration code | I | I | I | C | C | I | R | R | I |
| Temporal workflow code | I | I | I | C | I | I | I | R/A | I |
| Database migrations (Goose) | I | I | I | C | I | I | I | R/A | I |
| Unit / integration tests | I | I | I | I | I | I | R | R | I |
| Code review | I | I | I | C | C | I | R | R | I |
| FHIR validation testing | I | I | I | I | R | I | I | I | I |
| Sprint status tracking | I | R/A | I | I | I | I | I | I | I |
| **Gate: Story acceptance** | I | A | C | C | C | I | R | R | I |

### Phase 6: Validation

| Activity | Mary | John | Sally | Winston | Alex | Morgan | Jordan | Amelia | Paige |
|---|---|---|---|---|---|---|---|---|---|
| E2E / integration testing | I | I | I | I | C | I | R | R | I |
| FHIR conformance testing | I | I | I | C | R/A | I | I | I | I |
| Terminology validation | I | I | I | I | C | R/A | I | I | I |
| Accessibility audit (AODA/508) | I | I | R | I | I | I | C | I | I |
| Performance / load testing | I | I | I | R | I | I | C | C | I |
| Security review | I | I | I | R/A | C | I | I | C | I |
| UAT coordination | C | R/A | C | I | I | I | I | I | I |
| **Gate: Validation passed** | I | A | C | R | C | C | I | I | I |

### Phase 7: Release

| Activity | Mary | John | Sally | Winston | Alex | Morgan | Jordan | Amelia | Paige |
|---|---|---|---|---|---|---|---|---|---|
| Release notes | I | C | I | I | I | I | I | I | R/A |
| Deployment runbook | I | I | I | C | I | I | I | C | R/A |
| Production deploy | I | I | I | C | I | I | I | R | I |
| Smoke testing | I | I | I | I | I | I | R | R | I |
| Rollback plan verification | I | I | I | R/A | I | I | I | C | I |
| **Gate: Production release** | I | A | I | R | I | I | I | C | I |

### Phase 8: Operations & Monitoring

| Activity | Mary | John | Sally | Winston | Alex | Morgan | Jordan | Amelia | Paige |
|---|---|---|---|---|---|---|---|---|---|
| Production monitoring | I | I | I | C | I | I | I | R | I |
| Incident response | I | I | I | C | C | I | C | R/A | I |
| Hotfix development | I | I | I | C | C | I | R | R | I |
| Runbook updates | I | I | I | I | I | I | I | C | R/A |

### Phase 9: Learning

| Activity | Mary | John | Sally | Winston | Alex | Morgan | Jordan | Amelia | Paige |
|---|---|---|---|---|---|---|---|---|---|
| Retrospective | R | C | C | C | C | C | C | C | C |
| Metrics review | C | R/A | I | C | I | I | I | I | I |
| Knowledge capture | I | I | I | I | I | I | I | I | R/A |
| Process improvement | C | R/A | C | C | C | C | C | C | C |

## Agent coordination flows

### Flow 1: Feature with FHIR data

```
Mary (requirements) → John (PRD) → Sally (UX + wireframes)
                                       ↓
                            Alex (FHIR data requirements)
                                 ↕           ↓
                         Morgan (terminology)  Winston (architecture + ADR)
                                                    ↓
                                     Jordan (frontend) + Amelia (backend)
                                                    ↓
                                          Alex (FHIR conformance review)
                                                    ↓
                                           Paige (docs + release notes)
```

### Flow 2: Infrastructure / backend change

```
Mary (requirements) → John (PRD) → Winston (architecture + ADR)
                                         ↓
                              Amelia (Go/Rust + Temporal + Goose migrations)
                                         ↓
                              Winston (architecture review)
                                         ↓
                              Paige (runbook + API docs)
```

### Flow 3: UI-only change

```
John (PRD) → Sally (UX + tokens + wireframes)
                 ↓
          Jordan (React + TypeScript)
              ↓          ↓
        Sally (review)   Alex (FHIR data review, if clinical)
                 ↓
          Paige (docs)
```

### Flow 4: Terminology / code system change

```
Morgan (terminology recommendation + handoff) → Alex (FHIR binding update)
                                                      ↓
                                           Amelia (backend migration)
                                           Jordan (frontend display)
                                                      ↓
                                           Morgan (validation) → Alex (conformance)
```

## Cross-application coordination

When a feature spans multiple applications:

| Concern | Lead agent | Supporting agents |
|---|---|---|
| Shared FHIR profiles | Alex | Winston, Morgan |
| Shared design tokens | Sally | Jordan |
| Shared API contracts | Winston | Alex, Amelia |
| Shared database schemas | Amelia | Winston |
| Shared Temporal workflows | Amelia | Winston |
| Cross-app integration testing | Amelia + Jordan | Alex |
| Release synchronisation | John | Winston, Amelia |
