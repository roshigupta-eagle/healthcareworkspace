# Project Context — Healthcare Workspace

## Solution landscape

This workspace contains four interconnected healthcare applications forming an integrated **Agile Release Train (ART)**:

| Application | Directory | Domain | Primary users |
|---|---|---|---|
| **EHR (Hospital)** | `ehr/` | Inpatient/outpatient hospital electronic health record | Physicians, nurses, allied health, hospital admins |
| **PharmacyMS** | `pharmacyms/` | Pharmacy management system — dispensing, DUR, PrescribeIT integration | Pharmacists, pharmacy technicians |
| **LIMS** | `lims/` | Laboratory information management — orders, results, OLIS integration | Lab technicians, pathologists, ordering physicians |
| **FHIR** | `fhir/` | Shared FHIR integration layer — HAPI FHIR server, profiles, APIs | All applications, external systems, provincial registries |

## Jurisdiction

- **Primary:** Canada — Ontario (Ontario Health IGs: DHDR, OLIS, PCR, PHSD/PPR), then other provinces via Health Infoway / pan-Canadian standards (CA Baseline, PS-CA, PrescribeIT)
- **Secondary:** United States — US Core, ONC/ASTP, CMS, TEFCA/QHIN
- **Default FHIR version:** R4

## Technology stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 18+, TypeScript (strict), microfrontends (Module Federation) | All four application UIs |
| **Backend API** | Go (primary), Rust (performance-critical paths) | Microservices, API gateways |
| **Workflow orchestration** | Temporal | Long-running clinical workflows, saga patterns |
| **Database (relational)** | PostgreSQL + PgBouncer | Primary data store, connection pooling |
| **Database (NoSQL)** | MongoDB or DynamoDB | Document store for unstructured clinical data, audit logs |
| **Cache / pub-sub** | Redis | Session cache, real-time pub/sub, rate limiting |
| **FHIR server** | HAPI FHIR (JPA) | FHIR resource persistence, validation, terminology |
| **Migration** | Goose | Database schema migrations |
| **Containerization** | Docker, Kubernetes | Deployment, scaling |
| **CI/CD** | GitHub Actions | Build, test, deploy pipelines |

## Standards and compliance

- **Accessibility:** WCAG 2.2 Level AA minimum; AODA IASR (Ontario); ACA (federal Canada); Section 508 / ADA (US)
- **Privacy:** PIPEDA (federal), PHIPA (Ontario), provincial privacy acts; HIPAA (US)
- **Bilingual:** EN/FR for pan-Canadian / federal deployments
- **Terminology:** SNOMED CT Canadian Edition, LOINC/pCLOCD, ICD-10-CA, CCI, UCUM; RxNorm (US)
- **Security:** OAuth 2.0 / SMART on FHIR, TLS 1.3, audit logging, PHI encryption at rest and in transit

## Agent team

| Agent | Name | Role | Key responsibility |
|---|---|---|---|
| 📊 Mary | Business Analyst | Requirements, market research, stakeholder alignment |
| 📋 John | Product Manager | PRD creation, backlog prioritization, roadmap |
| 🎨 Sally | Senior UX/UI Designer | Design system, wireframes, persona-based UI, accessibility |
| 🏗️ Winston | System Architect | Architecture decisions, ADRs, tech-stack alignment, feasibility |
| 🏥 Alex | FHIR SME Architect | FHIR profiles, IGs, HAPI FHIR, Canadian/US interoperability |
| 📖 Morgan | Terminology Advisor | SNOMED CT, LOINC, pCLOCD, ICD-10-CA, value sets → Alex handoff |
| 🖥️ Jordan | Senior UI Developer | React/TypeScript implementation, microfrontends, FHIR integration |
| 💻 Amelia | Senior Software Engineer | Backend Go/Rust, Temporal, PostgreSQL, microservices |
| 📚 Paige | Technical Writer | Documentation, API specs, runbooks, knowledge management |

## SDLC governance

All initiatives follow the SDLC workflow defined in `docs/sdlc/workflow-phases.md`:
- **Intake → Discovery → Definition → Solutioning → Implementation → Validation → Release → Operations → Learning**
- Gate reviews at each phase boundary
- RACI model in `docs/sdlc/raci-model.md`
- Templates in `docs/sdlc/templates/`
