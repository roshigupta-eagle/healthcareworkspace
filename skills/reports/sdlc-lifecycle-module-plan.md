---
title: 'Healthcare SDLC Delivery Suite — Module Plan'
status: 'complete'
module_name: 'Healthcare SDLC Delivery Suite'
module_code: 'hdl'
module_description: 'End-to-end FHIR-native healthcare delivery lifecycle — from discovery through FHIR profiling, terminology, architecture, and into a deployed service.'
architecture: 'orchestrator + specialists'
standalone: true
expands_module: ''
skills_planned:
  - hdl-setup
  - hdl-gate-validator
  - hdl-agent-lead
  - hdl-adr
  - hdl-diagrams
  - hdl-stories
  - hdl-deploy
config_variables:
  - project_name
  - fhir_version
  - jurisdiction
  - hapi_port
  - qa_pass_threshold
  - ig_publisher_path
  - team_lead
created: '2026-05-03T00:00:00.000Z'
updated: '2026-05-03T12:00:00.000Z'
---

# Module Plan

## Vision

<!-- What this module does, who it's for, and why it matters -->

## Architecture

**Pattern:** Orchestrator + existing specialists. Kai (`hdl-agent-lead`) is the single new agent — a delivery lead who orchestrates the existing BMad agent squad through a sequential, gate-enforced SDLC. No specialist agents are duplicated; this module adds only what doesn't already exist.

**Why this pattern:** The lifecycle requires sequential phase control, gate enforcement, and failure routing across 7+ specialist roles. A shared orchestrator prevents the user from having to track phase state manually and ensures no phase is skipped or advanced without artifact validation.

**Phase sequence:**
```
Discovery (Mary+John) → FHIR Profiling (Alex) → [Terminology (Morgan) ∥ Early Architecture (Winston)]
  → Architecture Review (Winston) → ADR Generation (hdl-adr) → Diagram Suite (hdl-diagrams)
  → Epics & Stories (John+Mary via hdl-stories) → Design+Build (Amelia+Jordan)
  → AC Status Update (hdl-stories) → QA (Amelia) → AC Verification (hdl-stories) → Local Deploy (hdl-deploy)
```
One permitted parallel zone: after FHIR profiling gate passes, Terminology review and initial Architecture planning may run concurrently. All other transitions are strict sequential gates.

**Gate failure loop:** `hdl-gate-validator` evaluates each handoff artifact. On failure, Kai routes back to the responsible agent with structured, actionable comments. That agent fixes and re-submits. Kai re-validates. Loop continues until gate passes, then next phase opens.

**Existing agents leveraged (not duplicated):**
- Mary (BA) + John (PM) — Discovery phase
- Alex (FHIR SME Architect) — FHIR Profiling phase
- Morgan (Terminology Advisor) — Terminology phase
- Winston (System Architect) — Architecture Review phase
- Amelia (Senior Dev) + Jordan (UI Dev) — Design + Build phase
- Paige (Tech Writer) — Documentation at any phase

**New skills introduced by this module:**
- `hdl-agent-lead` — Kai, Delivery Lead orchestrator (1 new agent)
- `hdl-gate-validator` — Gate validation workflow
- `hdl-adr` — Healthcare ADR generation workflow
- `hdl-diagrams` — 6-diagram architecture suite workflow
- `hdl-stories` — Epics, user stories with detailed AC, and AC status tracking workflow
- `hdl-deploy` — Docker Compose + HAPI FHIR local deployment workflow
- `hdl-setup` — Project scaffolding + module setup skill
<!-- Options: single agent with capabilities, multiple agents, hybrid, orchestrator pattern -->
<!-- Document WHY this architecture was chosen — future builders need the reasoning -->

### Memory Architecture

**Pattern: Single shared memory** — all agents and workflows in this module read from and write to a common memory folder. Every agent needs full visibility into every phase's artifacts to perform gate validation, route failures, and build on prior phase decisions.

**Shared memory root:** `{project-root}/_bmad/memory/hdl/`

```
_bmad/memory/hdl/
├── index.md
├── delivery-state.md
├── daily/
│   └── YYYY-MM-DD.md
├── discovery/
│   ├── use-case-brief.md
│   └── data-element-inventory.md
├── fhir-profiling/
│   ├── structuredefinitions/
│   └── profiling-notes.md
├── terminology/
│   ├── valuesets/
│   └── terminology-inventory.md
├── architecture/
│   ├── review-findings.md
│   ├── adrs/
│   └── diagrams/
├── stories/
│   ├── epics.md                  # Epic list with descriptions
│   ├── backlog.md                # Ordered story backlog with status
│   └── {story-id}/
│       └── story.md              # Title, description, AC items with status
├── build/
│   ├── code-manifest.md
│   └── test-plan.md
├── qa/
│   ├── test-results.md
│   └── qa-report.html
└── deploy/
    ├── deployment-manifest.md
    └── deployment-log.md
```
<!-- If single shared memory: include the full folder structure -->
<!-- If shared memory: define the memory contract below -->

### Memory Contract

| File | Written by | Read by | Purpose |
|---|---|---|---|
| `index.md` | Kai (maintains) | All agents on activation | Orientation: what phase, what files exist, last updated |
| `delivery-state.md` | Kai | All agents, gate-validator | Current phase, gate status, blocked items, history |
| `daily/YYYY-MM-DD.md` | Any active agent (append) | Kai (status checks) | Chronological session log tagged by agent |
| `discovery/*` | Mary, John | Kai, Alex (gate-validator reads) | Handoff artifact from Discovery phase |
| `fhir-profiling/*` | Alex | Kai, Morgan, Winston | Handoff artifact from FHIR Profiling phase |
| `terminology/*` | Morgan | Kai, Winston, gate-validator | Handoff artifact from Terminology phase |
| `architecture/*` | Winston, hdl-adr, hdl-diagrams | Kai, Amelia, Jordan, gate-validator | ADRs + diagrams; inputs to Build phase |
| `stories/epics.md` | John, Mary (via hdl-stories) | Kai, Amelia, Jordan, gate-validator | Epic list with descriptions and linked architecture decisions |
| `stories/backlog.md` | hdl-stories | Kai, Amelia, Jordan | Ordered story list with ID, title, epic, status, AC completion % |
| `stories/{story-id}/story.md` | hdl-stories (create); Amelia/Jordan (AC update); QA (AC verify) | Amelia, Jordan, Kai, gate-validator | Full story: title, description, FHIR refs, AC items with status (pending/pass/fail/partial) |
| `build/*` | Amelia, Jordan | Kai, QA, gate-validator | Code manifest + test plan |
| `qa/*` | QA (Amelia) | Kai, hdl-deploy, gate-validator | Test results; gate for deploy phase |
| `deploy/*` | hdl-deploy | Kai | Deployment log + validation result |
<!-- - Filename and purpose -->
<!-- - What agents read it -->
<!-- - What agents write to it -->
<!-- - Key content/structure -->

### Cross-Agent Patterns

**Primary flow: User ↔ Kai ↔ Specialist**
User primarily converses with Kai. Kai surfaces the right specialist at the right moment with context. User can always bypass Kai and go directly to a specialist for deep work — Kai resumes tracking when control returns.

**Phase advancement flow:**
```
Kai: "Phase ready. Surfacing [specialist]." 
  → User works with specialist
  → Specialist writes handoff artifact to memory
  → User returns to Kai: "Phase complete"
  → Kai invokes hdl-gate-validator with phase ID
  → Gate PASS: Kai updates delivery-state.md, surfaces next specialist
  → Gate FAIL: Kai reads failure report, returns to responsible specialist with comments
  → Specialist fixes → re-submits → Kai re-validates
```

**Failure routing: structured comments**
Gate failure comments include: specific artifact file, specific field/element that failed, the rule it violated, and a suggested fix. Not vague — never "FHIR profiling incomplete"; always "StructureDefinition `Patient-CA-Core` missing `differential.element` for `identifier.system` — add a must-support slice with system URL `https://fhir.infoway-inforoute.ca/NamingSystem/ca-hcn`".

**Shared memory as cross-agent awareness:**
All agents load `index.md` and `delivery-state.md` on activation. This means Morgan (Terminology) sees what Alex (FHIR Profiler) flagged as unbound before Morgan even starts. Winston (Architect) sees both the profiling decisions and the terminology bindings before writing review findings. No agent works blind.
<!-- Is the user the router? Is there an orchestrator? Service-layer relationships? -->
<!-- How does shared memory enable cross-domain awareness? -->

## Skills

### hdl-agent-lead (Kai — Delivery Lead)

**Type:** Agent

**Persona:** Kai is a calm, decisive delivery lead who has shipped healthcare interoperability projects before. Clear communicator — surfaces blockers before they become crises, never advances a phase prematurely, keeps the squad oriented. Not a cheerleader; a navigator. Speaks in short, purposeful sentences. Always tells you where you are, what's next, and what's blocking. Like a control tower — gives clearance only when conditions are right.

**Core Outcome:** The squad always knows exactly which phase they are in, what artifact is required to advance, and what is blocking them. No phase is ever skipped. No gate is ever bypassed.

**The Non-Negotiable:** Never update `delivery-state.md` to advance a phase without a passing gate validation report from `hdl-gate-validator`.

**Capabilities:**

| Capability | Outcome | Inputs | Outputs |
|---|---|---|---|
| Start Delivery | Initializes a new delivery run; detects new vs existing project; configures delivery-state | Project name, FHIR version, jurisdiction, team | Initialized `delivery-state.md`, `index.md`, welcome briefing |
| Resume Delivery | Re-orients from persisted state after any gap | `delivery-state.md` | Phase summary, current blockers, next action |
| Phase Navigation | Surfaces the right specialist with the right context for the current phase | Current phase from delivery-state | Agent invocation with handoff context |
| Gate Enforcement | Invokes `hdl-gate-validator`; routes pass/fail | Phase ID, handoff artifact path | Phase advance on pass; failure comments routed to responsible agent |
| Status Dashboard | Produces HTML delivery dashboard | `delivery-state.md`, `index.md` | HTML report: phase timeline, gate results, open blockers |
| Failure Routing | Sends structured failure comments to the responsible agent and re-enters that phase | Gate failure report | Agent re-activation with specific remediation instructions |

**Memory:** Reads `index.md` and `delivery-state.md` on every activation. Appends to `daily/YYYY-MM-DD.md` with `[Kai]` tag. Writes `delivery-state.md` on every phase transition.

**Init Responsibility:** On first run: create `_bmad/memory/hdl/` folder structure, initialize `delivery-state.md` (phase: discovery, all gates: pending), create `index.md` skeleton. On subsequent runs: load existing state and orient.

**Activation Modes:** Interactive (primary). Headless supported for CI gate checks (`--headless --phase <phase-id>`).

**Tool Dependencies:** None beyond standard file read/write.

**Design Notes:** Kai does not perform any specialist work. When a user asks Kai a FHIR question, Kai redirects: "That's Alex's territory — shall I bring him in?" This keeps Kai's role clean and prevents persona drift. Kai's value is state management and gate enforcement, not domain expertise.

**Relationships:** Entry point for the entire module. All other skills are downstream of Kai. `hdl-gate-validator` is Kai's primary tool.

---

### hdl-gate-validator (Gate Validation Workflow)

**Type:** Workflow

**Purpose:** Validates that each phase's handoff artifact meets the quality and completeness criteria required to advance to the next phase. Produces structured pass/fail reports with specific, actionable failure comments. Never produces vague output.

**Capabilities:**

| Capability | Outcome | Inputs | Outputs |
|---|---|---|---|
| Validate Discovery Gate | Confirms use-case brief and data element inventory are complete | `discovery/use-case-brief.md`, `discovery/data-element-inventory.md` | Gate report (HTML): pass/fail per criterion, failure comments with file+field+rule+fix |
| Validate FHIR Profiling Gate | Confirms all SDs have required fields, must-support documented, extensions justified | `fhir-profiling/structuredefinitions/`, `fhir-profiling/profiling-notes.md` | Gate report: per-SD pass/fail, specific element failures |
| Validate Terminology Gate | Confirms all unbound elements resolved, ValueSets have OIDs/URLs, jurisdictional bindings documented | `terminology/valuesets/`, `terminology/terminology-inventory.md` | Gate report: unresolved bindings list, missing OID/URL flags |
| Validate Architecture Gate | Confirms ADRs cover all open decisions, all 6 diagram types present | `architecture/adrs/`, `architecture/diagrams/` | Gate report: missing ADR decisions, missing diagram types |
| Validate Build Gate | Confirms code compiles, unit tests pass, no critical lint errors | `build/code-manifest.md`, `build/test-plan.md` | Gate report: build status, test pass rate, lint findings |
| Validate QA Gate | Confirms all test cases executed, pass rate meets threshold, no P1 bugs open | `qa/test-results.md` | Gate report: pass rate vs threshold, open P1 list |
| Validate Deploy Gate | Confirms CapabilityStatement returns 200, required profiles registered | HAPI FHIR endpoint (configurable port) | Gate report: HTTP status, registered profiles list |

**Design Notes:** Every failure comment follows the structure: `[artifact-path] > [field/element] — [rule violated] — suggested fix: [specific fix]`. This format is machine-parseable so Kai can extract and route to the responsible agent without ambiguity. HTML report output makes gate results reviewable by the whole squad.

**Relationships:** Invoked exclusively by `hdl-agent-lead` (Kai) after every phase completion. Results flow back to Kai who performs routing.

---

### hdl-adr (ADR Generation Workflow)

**Type:** Workflow

**Purpose:** Produces numbered, healthcare-aware Architecture Decision Records from Winston's open decisions list. Each ADR captures the decision context, options considered, rationale, and healthcare-specific constraints including FHIR version, jurisdiction, profile choices, naming systems, and terminology bindings.

**Capabilities:**

| Capability | Outcome | Inputs | Outputs |
|---|---|---|---|
| Generate ADR Set | Walks through each open decision and produces a complete ADR file | `architecture/review-findings.md` (open decisions list) | One `.md` ADR file per decision in `architecture/adrs/ADR-NNN-*.md` |
| Amend ADR | Updates an existing ADR when a decision is revised | ADR file path, revised decision | Updated ADR with change history appended |
| ADR Index | Produces a summary index of all ADRs with status | `architecture/adrs/` | `architecture/adrs/index.md` — table of all ADRs, status, date |

**ADR Template sections (healthcare-aware):**
- Status (Proposed / Accepted / Deprecated / Superseded)
- Context — problem being decided
- FHIR version constraints — which version and why
- Jurisdiction constraints — Ontario / pan-Canadian / US Core applicability
- Options considered — at least 2 alternatives with trade-offs
- Decision — what was chosen and why
- Profile / Extension rationale — if a new profile or extension is introduced
- Naming system decisions — NamingSystem resource choices
- Terminology binding decisions — ValueSet choices with OID/URL
- Consequences — what becomes easier/harder as a result

**Design Notes:** ADRs are the primary artifact feeding `hdl-diagrams`. Without good ADRs, diagram generation lacks the decisions needed to draw accurate boundaries. The workflow should interactively confirm each decision with the user before writing to file — never silently generate an ADR from assumptions.

**Relationships:** Preceded by Architecture Review (Winston). Followed by `hdl-diagrams`.

---

### hdl-diagrams (Diagram Suite Workflow)

**Type:** Workflow

**Purpose:** Generates six Mermaid-based architecture diagrams from the finalized ADRs and StructureDefinitions. Produces both individual diagram files and a single rendered HTML report for the squad.

**Capabilities:**

| Capability | Outcome | Inputs | Outputs |
|---|---|---|---|
| Generate Full Suite | All 6 diagrams generated in one pass | ADRs, SDs, delivery-state | 6 `.md` files in `architecture/diagrams/` + `diagrams-report.html` |
| Regenerate Single Diagram | Refresh one diagram after a change | Diagram type, updated source | Updated diagram file + refreshed HTML report |

**Diagram types and sources:**

| # | Diagram | Source data | Mermaid type |
|---|---|---|---|
| 1 | C4 Context | ADR system boundary decisions | `C4Context` |
| 2 | C4 Container | ADR container/service decisions | `C4Container` |
| 3 | FHIR Resource Relationship Map | StructureDefinitions + references | `erDiagram` |
| 4 | FHIR Profile Dependency Tree | SD base resource chains + extensions | `graph TD` |
| 5 | Terminology Binding Map | terminology-inventory.md | `graph LR` |
| 6 | Patient Data Flow + API Sequences | Use case brief + ADR API decisions | `sequenceDiagram` |

**Design Notes:** Diagrams are generated as Mermaid markdown, not rendered images, so they stay version-controllable and editable. The HTML report uses the Mermaid JS CDN to render them live. If a source artifact is missing or incomplete, the workflow flags which diagram cannot be generated and why rather than producing an empty or incorrect diagram.

**Relationships:** Preceded by `hdl-adr`. Followed by Design+Build phase (Amelia + Jordan consume the architecture artifact bundle).

---

### hdl-stories (Epics, Stories & AC Tracking Workflow)

**Type:** Workflow

**Purpose:** Breaks the architecture artifact bundle into epics and user stories with detailed acceptance criteria (Given/When/Then). After implementation and testing, updates the status of each AC item per story. Provides a living traceability link from architecture decisions through to verified AC.

**Capabilities:**

| Capability | Outcome | Inputs | Outputs |
|---|---|---|---|
| Generate Epics | Derives epics from use case brief + ADRs + C4 diagrams | `discovery/use-case-brief.md`, `architecture/adrs/`, `architecture/diagrams/` | `stories/epics.md` — epic list with descriptions and architecture references |
| Generate Story Backlog | Breaks each epic into user stories, ordered by dependency and value | `stories/epics.md` | `stories/backlog.md` — ordered story list with IDs, epic links, status |
| Generate Story Detail | Creates a full story file with title, description, FHIR resource references, and detailed AC in Given/When/Then format | Story ID, epic context, FHIR SDs + ADRs | `stories/{story-id}/story.md` — complete story file, all AC items status=`pending` |
| Update AC Status | Developer marks each AC item as `pass`, `fail`, or `partial` after implementing that story | Story ID, per-AC-item status input | Updated `stories/{story-id}/story.md` with AC statuses + timestamp |
| Verify AC Completion | QA reviews and finalises AC status; confirms no AC item is left `pending` or `fail` before deploy | All story files | Updated story files with QA-verified statuses; summary AC completion report (HTML) |
| AC Completion Report | Produces HTML report showing per-story AC pass/fail/partial breakdown | All story files | `_bmad-output/qa-reports/ac-completion-report.html` |
| Story Status Dashboard | Live view of all stories: not-started, in-progress, complete, blocked | `stories/backlog.md`, all story files | HTML dashboard — story kanban by epic, AC completion %, blockers |

**AC Item format (Given/When/Then):**
```markdown
## Acceptance Criteria

### AC-001
**Given** the user has granted camera permission  
**When** they point the camera at an affected skin area  
**Then** the app returns a triage recommendation within 5 seconds  
**Status:** pending | pass | fail | partial  
**Verified by:** [agent/person] on [date]
```

**FHIR traceability:** Each story file includes a `FHIR Resources` section listing which StructureDefinitions, ValueSets, and ADRs the story depends on. When an AC item is verified, the FHIR resource reference is confirmed as correctly implemented.

**Memory:** Reads `discovery/use-case-brief.md`, `architecture/adrs/`, `architecture/diagrams/` on creation. Writes all output to `stories/`. Appends to `daily/YYYY-MM-DD.md` with `[hdl-stories]` tag. Updates `delivery-state.md` AC completion % on every status change.

**Activation Modes:** Interactive (story creation, AC review). Headless supported for AC status update (`--headless --story <story-id> --ac <ac-id> --status pass`).

**Design Notes:** Stories are the contract between architecture and build. No story goes to build without 100% of its AC items in `pending` status (authored). No story is considered done until 100% of its AC items are `pass` — `partial` is not acceptable at deploy gate. The gate-validator checks `stories/backlog.md` for any `fail` or `pending` AC items before opening the deploy phase.

**Relationships:** Preceded by `hdl-diagrams`. Stories feed `Design+Build` (Amelia + Jordan). AC update runs mid-build per story. AC verification runs post-QA. Gate-validator reads story files as part of QA gate and deploy gate.

---

### hdl-deploy (Local Deployment Workflow)

**Type:** Workflow

**Purpose:** Deploys the built FHIR service locally using Docker Compose with a HAPI FHIR R4 server, validates the deployment is healthy, registers required profiles, and produces a structured deployment log.

**Capabilities:**

| Capability | Outcome | Inputs | Outputs |
|---|---|---|---|
| Preflight Check | Validates docker-compose.yml exists and is valid, Docker is running, port is available | `docker-compose.yml`, configured port | Preflight report — pass/fail with specific issues |
| Deploy | Runs `docker compose up -d`, polls HAPI FHIR CapabilityStatement endpoint until healthy or timeout | `docker-compose.yml`, HAPI port | Container status, CapabilityStatement response |
| Profile Registration | POSTs StructureDefinition resources to running HAPI instance | `fhir-profiling/structuredefinitions/` | Registration results per SD — HTTP status per resource |
| Smoke Test | Runs basic FHIR CRUD smoke tests against running server | Configured test cases | Smoke test pass/fail per case |
| Deployment Report | Produces HTML deployment validation report | Deployment log | `deploy/deployment-report.html` — container logs excerpt, validation results, registered profiles |
| Teardown | Runs `docker compose down` cleanly | — | Teardown confirmation |

**Design Notes:** The deploy workflow must handle the case where Docker is not running or Docker Desktop is not installed — in that case it produces a clear setup guide rather than a cryptic error. All `docker` commands are run via `runCommands` tool and stdout/stderr captured to the deployment log. Timeout for HAPI readiness check: 120 seconds with 5-second polling interval.

**Relationships:** Preceded by QA gate pass. Final phase in the delivery lifecycle. Writes final status to `delivery-state.md` via Kai.

---

### hdl-setup (Module Setup Skill)

**Type:** Skill (setup)

**Purpose:** Initializes the `hdl` module for a project. Detects whether this is a new or existing project and scaffolds only what is missing. Never destructively overwrites existing files.

**Capabilities:**

| Capability | Outcome | Inputs | Outputs |
|---|---|---|---|
| Project Detection | Determines new vs existing project by checking for docker-compose.yml, IG publisher structure, memory folder | Project root | Detection report — what exists, what will be created |
| Full Scaffold (new project) | Creates complete project structure | Config answers | docker-compose.yml, IG publisher dirs, memory folder structure, delivery-state skeleton, ADR folder |
| Partial Scaffold (existing project) | Creates only missing pieces | Detection report | Only the files/folders that don't already exist |
| Config Collection | Collects project-level config via prompts | User input | Written to `_bmad/config.toml` under `[modules.hdl]` |
| Verify Setup | Confirms all required files exist and are valid after scaffolding | Project root | Setup verification report |
<!-- Each brief should be usable by the Agent Builder or Workflow Builder WITHOUT conversation context. -->

### {skill-name}

**Type:** {agent | workflow}

**Persona:** <!-- For agents: who is this? Communication style, expertise, personality -->

**Core Outcome:** <!-- What does success look like? -->

**The Non-Negotiable:** <!-- The one thing this skill must get right -->

**Capabilities:**

| Capability | Outcome | Inputs | Outputs |
| ---------- | ------- | ------ | ------- |
|            |         |        |         |

<!-- For outputs: note where HTML reports, dashboards, or structured artifacts would add value -->

**Memory:** <!-- What does this agent read on activation? Write to? Daily log tag? -->

**Init Responsibility:** <!-- What happens on first run? Shared memory creation? Domain onboarding? -->

**Activation Modes:** <!-- Interactive, headless, or both? -->

**Tool Dependencies:** <!-- External tools with technical specifics -->

**Design Notes:** <!-- Non-obvious considerations, the "why" behind decisions -->

---

## Configuration

| Variable | Prompt | Default | Result Template | User Setting |
|---|---|---|---|---|
| `project_name` | What is the project name? | `healthcareproject` | `{project_name}` | No |
| `fhir_version` | FHIR version (R4 / R4B / R5)? | `R4` | `{fhir_version}` | No |
| `jurisdiction` | Primary jurisdiction? (pan-Canadian / Ontario / US / other) | `pan-Canadian` | `{jurisdiction}` | No |
| `hapi_port` | Local HAPI FHIR server port? | `8080` | `{hapi_port}` | Yes |
| `qa_pass_threshold` | QA gate pass rate threshold (%)? | `95` | `{qa_pass_threshold}` | Yes |
| `ig_publisher_path` | IG publisher output folder path? | `_bmad-output/ig` | `{ig_publisher_path}` | No |
| `team_lead` | Delivery lead name (for Kai greetings)? | `Eagle` | `{team_lead}` | Yes |
<!-- If none needed, explicitly state: "This module requires no custom configuration beyond core BMad settings." -->

| Variable | Prompt | Default | Result Template | User Setting |
| -------- | ------ | ------- | --------------- | ------------ |
|          |        |         |                 |              |

## External Dependencies

| Dependency | Type | Required by | Setup handling |
|---|---|---|---|
| Docker Desktop | CLI tool | `hdl-deploy` | Setup skill checks `docker --version`; if missing, provides install link and halts deployment phase |
| HAPI FHIR R4 (via Docker image `hapiproject/hapi:latest`) | Docker image | `hdl-deploy` | Pulled automatically by docker-compose.yml on first deploy |
| Python 3.10+ | Runtime | Config resolution scripts | Checked by setup skill; warning if missing (scripts degrade gracefully) |
| HL7 IG Publisher (`publisher.jar`) | Optional CLI tool | Documentation phase (Paige) | Optional — setup skill notes its absence but does not block any gate |
<!-- For each: what it is, which skills need it, and how the setup skill should handle it -->

## UI and Visualization

| Artifact | Produced by | Contents |
|---|---|---|
| Gate Report (HTML) | `hdl-gate-validator` | Per-criterion pass/fail table, failure comments with file+field+rule+fix, overall gate status |
| Delivery Dashboard (HTML) | `hdl-agent-lead` (Kai) | Phase timeline, gate results per phase, open blockers, squad activity log |
| Diagram Suite Report (HTML) | `hdl-diagrams` | All 6 Mermaid diagrams rendered via Mermaid JS CDN, one section per diagram type |
| Deployment Validation Report (HTML) | `hdl-deploy` | Container status, CapabilityStatement response, registered profiles table, smoke test results, container log excerpt |

All HTML reports written to `_bmad-output/` subdirectories. Mermaid JS loaded from CDN for diagram rendering — no local install required.
<!-- If yes: what it shows, which skills feed into it, how it's served/installed -->

## Setup Extensions

**New project scaffold (only when project detection confirms new project):**

```
{project-root}/
├── docker-compose.yml              # HAPI FHIR R4, configurable port
├── _bmad-output/
│   ├── planning-artifacts/
│   ├── architecture/
│   │   ├── adrs/
│   │   └── diagrams/
│   ├── implementation-artifacts/
│   ├── qa-reports/
│   ├── deployment-logs/
│   └── ig/                         # IG publisher structure
│       ├── input/
│       ├── output/
│       └── temp/
└── _bmad/memory/hdl/
    ├── index.md
    ├── delivery-state.md
    └── daily/
```

**Existing project:** Detect each path above. Create only what is absent. Never overwrite existing files. Log skipped items in setup verification report.

**Config file output:** Writes `[modules.hdl]` block to `_bmad/config.toml` with all collected config variables.
<!-- These will need to be manually added to the setup skill after scaffolding -->

## Integration

**Standalone value:** Complete end-to-end healthcare SDLC lifecycle without any other module. Kai guides a solo practitioner or small team through every phase with the existing BMad specialist agents.

**BMM expansion value:** When BMM is installed, this module activates the full squad (Mary, John, Alex, Morgan, Winston, Amelia, Jordan, Paige) as phase-specific specialists under Kai's orchestration. The `docs/` folder configured in BMM serves as the `project_knowledge` context that all specialists draw from.

**If BMM is not installed:** Kai detects the absence of BMM agent skills and provides explicit instructions for what each specialist phase requires, allowing the user to use any LLM conversation for those phases. No phase is skipped — Kai falls back to guided prompts rather than agent invocations.

**Output folder conventions:** All output artifacts follow BMM's `_bmad-output/` folder convention. Gate reports, diagrams, and deployment logs all land under `_bmad-output/` subdirectories, consistent with BMM planning and implementation artifact paths.
<!-- Expansion: parent module, cross-module capability relationships, skills that may reference parent module ordering -->

## Creative Use Cases

- **Brownfield audit:** Run the lifecycle on an existing FHIR API to produce retroactive architecture documentation — gate-validator in audit mode instead of blocking mode, diagrams generated from existing SDs
- **Gate-validator standalone:** Drop `hdl-gate-validator` into any FHIR project (even outside this module) to audit profile quality and terminology completeness before a release
- **Diagram-only mode:** Use `hdl-diagrams` on a finished IG to refresh architecture documentation after a major profile update without re-running the full lifecycle
- **Kai as delivery retrospective:** After a completed delivery, load the full `delivery-state.md` history and ask Kai to produce a retrospective report: what gates failed, how many remediation loops, time per phase, common failure patterns
- **Async squad delivery:** Multiple team members work with their specialist agent in separate sessions. Kai tracks convergence via shared memory — each member's session appends to `daily/` with their agent tag, and Kai reads the full daily log to determine if a phase is ready for gate validation
- **CI/CD gate integration:** Run `hdl-gate-validator --headless --phase qa` in a CI pipeline to block merges when QA gate criteria are not met
- **Multi-jurisdiction compliance check:** Use the ADR workflow + gate-validator to validate that a profile set meets obligations across Ontario, pan-Canadian, and US Core simultaneously

## Ideas Captured

### Decisions Locked (2026-05-03)

**Module identity:**
- Name: Healthcare SDLC Delivery Suite
- Code: `hdl` — all skills prefixed `hdl-agent-*` / `hdl-*`
- Description: End-to-end FHIR-native healthcare delivery lifecycle — discovery through deployed service
- Standalone module (not an expansion of BMM)

**Gate model:** Mostly sequential. One permitted parallel zone: after FHIR profiling is complete, terminology review and initial architecture planning may overlap. All other phase transitions are strict gates requiring a handoff artifact before the next phase opens.

**Local deployment target:** Docker Compose + HAPI FHIR R4 server. Deploy agent generates/validates `docker-compose.yml`, confirms server responds to FHIR CapabilityStatement, and reports pass/fail with logs.

**Orchestrator:** YES — `hdl-agent-lead` (persona: "Kai", the Delivery Lead). Kai is the user's primary interface throughout the lifecycle. Kai tracks which phase the squad is in, surfaces the right specialist at the right moment, enforces gate criteria, and maintains a living delivery log in shared memory. Users can bypass Kai and talk to specialists directly when they need depth.

**Architecture pattern:** Orchestrator + specialists. Existing BMM agents (Alex, Morgan, Winston, Amelia, Jordan, Mary, John) remain as-is. This module adds Kai as orchestrator plus new phase-specific workflows for ADR generation, diagram suite, QA, and local deployment.

### Session 1 — Phase 1 Raw Capture (2026-05-03)

**The lifecycle flow (as described by user):**
discovery → FHIR profiling → terminology expert profiling → architect review → ADR → architecture artifacts (more diagrams) → design → build → test → deploy locally

**Who uses it:** Whole delivery squad — PM, BA, FHIR SME, terminology advisor, architect, developer, QA, potentially external reviewers

**Gap being solved:** Both — orchestrate existing BMad agents (Mary/John/Winston/Amelia etc.) AND introduce new healthcare specialists not yet in BMad

**End state for a user:** A deployed service — a fully running FHIR-compliant service deployed locally (Docker / HAPI FHIR?)

**Specialist roles implied:**
- Discovery agent (BA/PM blend) — requirements, domain research, stakeholder alignment
- FHIR profiling agent (Alex already exists as FHIR SME Architect in workspace)
- Terminology expert agent (Morgan already exists as Terminology Advisor in workspace)
- Architect review agent (Winston exists, but needs ADR + diagram-heavy output focus)
- ADR workflow — structured decision records produced at architecture gate
- Diagram/artifact generation — C4, sequence, data flow, FHIR resource maps
- Design → Build → Test → Deploy pipeline — could be Amelia + Jordan (UI dev) + new QA/deploy agent

**Gate failure model:**
- When a phase fails its gate, Kai routes back to the responsible agent with structured failure comments
- That agent fixes the issues and re-submits the handoff artifact
- Kai re-runs gate validation; only on pass does the next phase open
- This creates a closed feedback loop — no manual remediation dead-ends
- Failure comments must be actionable (specific element, specific rule violated, suggested fix)

**Confirmed handoff artifact contracts:**
- Discovery → FHIR Profiler: Use Case Brief + data element inventory
- FHIR Profiler → Terminology Expert: StructureDefinition drafts with unbound/partially-bound elements flagged
- Terminology Expert → Architect: Bound StructureDefinitions + ValueSet/CodeSystem inventory with jurisdictional notes
- Architect → ADR Workflow: Review findings + open decisions list
- ADR Workflow → Diagram Suite: Finalized ADRs (FHIR version, profiles, extensions, naming systems)
- Diagram Suite → **Epics & Stories** (hdl-stories): Architecture artifact bundle (C4 + FHIR resource map + sequence diagrams) + ADRs
- **Epics & Stories** → Design/Build: Prioritized story list, each with title, description, detailed AC (Given/When/Then), FHIR resource references, and acceptance status = `pending`
- Build → AC Status Update: Developer marks each AC item `pass` / `fail` / `partial` per story
- QA → AC Verification: QA verifies AC completion, marks final status; hdl-gate-validator checks 100% of AC items resolved before deploy gate opens
- Deploy → Done: CapabilityStatement validation + deployment log

**ADR template:** Healthcare-aware. Sections: FHIR version rationale, profile/extension rationale, jurisdiction constraints (Ontario/pan-Canadian/US Core), naming system decisions, terminology binding choices + standard ADR fields (context, decision, status, consequences).

**Diagram suite (confirmed 6 types):**
1. C4 Context + Container
2. FHIR resource relationship map
3. FHIR profile dependency tree
4. Terminology binding map
5. Patient data flow
6. API sequence diagrams (key interactions)

**Setup skill — project detection mode:**
- NEW project: full scaffold — HAPI FHIR R4 docker-compose.yml, IG publisher directory structure, base project config, initial ADR folder, delivery log skeleton
- EXISTING project: detect what's already present (docker-compose, IG publisher structure, etc.) and skip those steps; only configure what's missing. No destructive changes to existing setup.

**Agent strategy — EXISTING agents only, no duplication:**
- Discovery: **Mary** (BA) + **John** (PM) — already exist
- FHIR Profiling: **Alex** (FHIR SME Architect) — already exists
- Terminology: **Morgan** (Terminology Advisor) — already exists
- Architecture review: **Winston** (System Architect) — already exists
- Design + Build: **Amelia** (Senior Dev) + **Jordan** (UI Dev) — already exist
- Documentation: **Paige** (Tech Writer) — already exists

**What is NEW in this module (minimum viable set):**
- `hdl-agent-lead` — **Kai**, the Delivery Lead orchestrator (the only new agent)
- `hdl-adr` — ADR generation workflow (healthcare-aware template)
- `hdl-diagrams` — Diagram suite workflow (6 diagram types)
- `hdl-gate-validator` — Gate validation workflow (checks artifacts, routes failures back)
- `hdl-deploy` — Local deployment workflow (Docker Compose + HAPI FHIR validation)
- `hdl-setup` — Module setup skill (new/existing project detection + scaffolding)

**Confirmed open questions resolved:** All major decisions locked.

## Build Roadmap

Recommended build order (each skill depends on the one above it being complete):

| Order | Skill | Type | Rationale |
|---|---|---|---|
| 1 | `hdl-setup` | Setup skill | Must be first — creates the memory and scaffold that all other skills read/write |
| 2 | `hdl-gate-validator` | Workflow | Kai's primary dependency — build before Kai so gate logic can be tested in isolation |
| 3 | `hdl-agent-lead` (Kai) | Agent | Orchestrator built after its main tool (gate-validator) exists |
| 4 | `hdl-adr` | Workflow | First phase-specific workflow; architecture phase depends on it |
| 5 | `hdl-diagrams` | Workflow | Depends on ADR output as primary input |
| 6 | `hdl-stories` | Workflow | Depends on diagrams + ADRs; provides stories that feed Build phase |
| 7 | `hdl-deploy` | Workflow | Final phase; build last to validate full lifecycle end-to-end |

**Next steps:**

1. Build each skill using **Build a Workflow (BW)** or **Build an Agent (BA)** — share this plan document as context so the builder understands the full picture
2. Start with `hdl-setup` using the Agent Builder's **Build a Workflow** path
3. When all 7 skills are built, return to **Create Module (CM)** to scaffold the module infrastructure that makes `hdl` installable via `npx bmad-method install`
