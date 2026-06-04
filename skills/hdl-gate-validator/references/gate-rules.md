# Gate Validation Rules

Every failure message follows this structure:
`[artifact-path] > [field] — [rule violated] — suggested fix: [specific fix]`

Rule IDs are stable — Kai uses them to route failures to the right agent.

---

## Discovery Gate (`DISC-*`)

| Rule ID | Artifact | Field / Condition | Rule | Suggested Fix |
|---|---|---|---|---|
| DISC-001 | `discovery/use-case-brief.md` | File exists | Use case brief must exist | Run Discovery phase with Mary and John to produce the brief |
| DISC-002 | `discovery/use-case-brief.md` | `## Product Vision` section present and non-empty | Vision section required | Add a Product Vision section describing what the product does and who it's for |
| DISC-003 | `discovery/use-case-brief.md` | `## Actors` section — at least 1 actor defined | At least one actor required | Add the primary user/patient actor to the Actors section |
| DISC-004 | `discovery/use-case-brief.md` | `## Success Criteria` — at least 2 criteria listed | Minimum 2 success criteria required | Add measurable success criteria (e.g. "System returns triage result within 5 seconds") |
| DISC-005 | `discovery/data-element-inventory.md` | File exists | Data element inventory must exist | Run Discovery phase to produce the data element inventory |
| DISC-006 | `discovery/data-element-inventory.md` | At least 3 rows in data element table | Minimum 3 data elements required | Add all data elements that must be exchanged via FHIR |
| DISC-007 | `discovery/use-case-brief.md` | `## Open Questions` section — all items have `[x]` or section is absent | All open questions must be resolved before FHIR profiling | Resolve all `[ ]` open questions with the squad before advancing |

---

## FHIR Profiling Gate (`PROF-*`)

| Rule ID | Artifact | Field / Condition | Rule | Suggested Fix |
|---|---|---|---|---|
| PROF-001 | `fhir-profiling/structuredefinitions/` | Directory contains at least 1 `.json` or `.xml` or `.md` file | At least one StructureDefinition required | Work with Alex to produce at least one SD for the primary resource |
| PROF-002 | `fhir-profiling/profiling-notes.md` | File exists | Profiling notes required | Ask Alex to document design decisions and extension justifications |
| PROF-003 | `fhir-profiling/profiling-notes.md` | Contains `## Must-Support` or `must-support` (case-insensitive) | Must-support elements must be documented | Add a Must-Support section listing all must-support elements with clinical justification |
| PROF-004 | `fhir-profiling/profiling-notes.md` | Contains `## Unbound` or `unbound` — if present, no item is marked `[ ]` | All unbound elements must be flagged for terminology review | Ensure all unbound elements are listed so Morgan can bind them |

---

## Terminology Gate (`TERM-*`)

| Rule ID | Artifact | Field / Condition | Rule | Suggested Fix |
|---|---|---|---|---|
| TERM-001 | `terminology/terminology-inventory.md` | File exists | Terminology inventory required | Ask Morgan to produce the terminology inventory |
| TERM-002 | `terminology/terminology-inventory.md` | Every row in binding table has a non-empty URL or OID column | All bindings must have a URL or OID | Add canonical URLs or OIDs for each ValueSet/CodeSystem |
| TERM-003 | `terminology/terminology-inventory.md` | Contains `jurisdiction` column or `## Jurisdictional` section | Jurisdictional notes required | Ask Morgan to add jurisdictional notes (Ontario, pan-Canadian, US Core applicability) |
| TERM-004 | `terminology/valuesets/` | Directory contains at least 1 file | At least one ValueSet file required | Ask Morgan to produce ValueSet definitions |

---

## Architecture Gate (`ARCH-*`)

| Rule ID | Artifact | Field / Condition | Rule | Suggested Fix |
|---|---|---|---|---|
| ARCH-001 | `architecture/review-findings.md` | File exists | Architecture review findings required | Ask Winston to review and document findings |
| ARCH-002 | `architecture/adrs/` | Contains at least 1 `ADR-*.md` file | At least one ADR required | Run hdl-adr to generate ADRs from Winston's open decisions list |
| ARCH-003 | `architecture/adrs/` | No ADR file contains `Status: Proposed` | All ADRs must be accepted | Review and accept all proposed ADRs before advancing |
| ARCH-004 | `architecture/diagrams/` | Contains files matching: c4-context, c4-container, fhir-resource-map, fhir-profile-tree, terminology-binding-map, sequence (6 distinct diagram files) | All 6 diagram types required | Run hdl-diagrams to generate any missing diagrams |
| ARCH-005 | Each diagram file | File size > 100 bytes | Diagram files must be non-empty | Regenerate empty diagram files using hdl-diagrams |

---

## Stories Gate (`STORY-*`)

| Rule ID | Artifact | Field / Condition | Rule | Suggested Fix |
|---|---|---|---|---|
| STORY-001 | `stories/epics.md` | File exists | Epics file required | Run hdl-stories to generate epics from use-case brief and ADRs |
| STORY-002 | `stories/backlog.md` | File exists and contains at least 1 story row | Story backlog required | Run hdl-stories to generate the story backlog |
| STORY-003 | `stories/backlog.md` | No story has status `blocked` without a blocker note | Blocked stories must have a documented reason | Add a blocker note to each blocked story |
| STORY-004 | Each `stories/*/story.md` | Contains `## Acceptance Criteria` section | Every story must have AC | Add AC items in Given/When/Then format to each story |
| STORY-005 | Each `stories/*/story.md` | Every AC item has `**Status:**` field | Every AC item must have a status field | Add `**Status:** pending` to each AC item |
| STORY-006 | Each `stories/*/story.md` | No AC item has empty `Given`, `When`, or `Then` fields | AC items must be fully specified | Complete all Given/When/Then fields for each AC item |

---

## Build Gate (`BUILD-*`)

| Rule ID | Artifact | Field / Condition | Rule | Suggested Fix |
|---|---|---|---|---|
| BUILD-001 | `build/code-manifest.md` | File exists | Code manifest required | Ask Amelia/Jordan to produce the code manifest after build |
| BUILD-002 | `build/test-plan.md` | File exists | Test plan required | Ask Amelia to document the test plan |
| BUILD-003 | Each `stories/*/story.md` | No AC item has `**Status:** pending` | All AC items must be updated post-build (pass/fail/partial) | Ask Amelia/Jordan to update AC status for each story they implemented |
| BUILD-004 | Each `stories/*/story.md` | No AC item has `**Status:** partial` | Partial AC is not acceptable at build gate | Resolve all partial AC items to pass or raise a new story |

---

## QA Gate (`QA-*`)

| Rule ID | Artifact | Field / Condition | Rule | Suggested Fix |
|---|---|---|---|---|
| QA-001 | `qa/test-results.md` | File exists | QA test results required | Ask Amelia to run tests and document results |
| QA-002 | `qa/test-results.md` | Contains pass rate value >= `{qa_pass_threshold}`% | Pass rate must meet configured threshold | Fix failing tests until pass rate meets threshold |
| QA-003 | `qa/test-results.md` | No line contains `P1` or `priority-1` or `critical` with `open` | No open P1/critical bugs | Resolve all critical bugs before deploying |
| QA-004 | Each `stories/*/story.md` | No AC item has `**Status:** fail` | All AC items must pass before deploy | Fix all failing AC items or raise new stories |
| QA-005 | Each `stories/*/story.md` | No AC item has `**Status:** pending` | All AC items must be verified by QA | Ask QA to review and update status on all pending AC items |

---

## Deploy Gate (`DEPLOY-*`)

These rules are validated live against the running HAPI FHIR server.

| Rule ID | Check | Condition | Rule | Suggested Fix |
|---|---|---|---|---|
| DEPLOY-001 | HTTP GET `http://localhost:{hapi_port}/fhir/metadata` | Returns HTTP 200 | HAPI FHIR server must be running and healthy | Run `docker compose up -d` and wait for healthcheck to pass |
| DEPLOY-002 | HTTP GET `http://localhost:{hapi_port}/fhir/metadata` | Response body contains `"fhirVersion"` | Server must return a valid CapabilityStatement | Check HAPI server logs for startup errors |
| DEPLOY-003 | `deploy/deployment-manifest.md` | File exists | Deployment manifest required | Run hdl-deploy to produce the deployment manifest |
| DEPLOY-004 | `deploy/deployment-log.md` | File exists and contains `success` or `healthy` | Deployment log must confirm successful deploy | Re-run hdl-deploy and confirm server reaches healthy state |
