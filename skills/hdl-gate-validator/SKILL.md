---
name: hdl-gate-validator
description: Validates HDL phase handoff artifacts before phase advancement. Use when Kai says "validate gate", "check gate", or "run gate validation for phase".
---

# hdl-gate-validator

## Overview

Validates that each phase's handoff artifact meets the quality and completeness criteria required to advance to the next phase in the Healthcare SDLC Delivery Suite. Produces structured pass/fail HTML reports with specific, actionable failure comments. Never produces vague output — every failure comment identifies the exact artifact, field, rule violated, and a suggested fix.

Invoked by `hdl-agent-lead` (Kai) after every phase completion. Results flow back to Kai for routing — pass advances the phase, fail routes back to the responsible agent with the failure report.

Supports `--headless` / `-H` and `--phase <phase-id>` for CI/CD integration.

**Phase IDs:** `discovery` | `fhir-profiling` | `terminology` | `architecture` | `stories` | `build` | `qa` | `deploy`

## Conventions

- Bare paths (e.g. `references/guide.md`) resolve from the skill root.
- `{skill-root}` resolves to this skill's installed directory.
- `{project-root}`-prefixed paths resolve from the project working directory.
- `{skill-name}` resolves to the skill directory's basename.

## On Activation

Load config from `{project-root}/_bmad/config.yaml` and `{project-root}/_bmad/config.user.yaml` (root and `hdl` section). Key values needed:
- `{qa_pass_threshold}` — minimum QA pass rate (default: 95)
- `{hapi_port}` — HAPI FHIR server port (default: 8080)

Detect invocation mode:
- `--headless` or `-H` → run non-interactively, write report to file, exit with code 0 (pass) or 1 (fail)
- `--phase <phase-id>` → validate only that phase
- No args or interactive → ask which phase to validate

## Gate Validation Rules

Load `references/gate-rules.md` for the full per-phase rule set. Each rule has:
- A rule ID (e.g. `DISC-001`)
- The artifact path to check
- The specific field or condition to verify
- The failure message template: `[artifact-path] > [field] — [rule violated] — suggested fix: [fix]`

## Execution

### Step 1: Determine Phase

If `--phase` was provided, use it. Otherwise ask: *"Which phase are you validating? (discovery / fhir-profiling / terminology / architecture / stories / build / qa / deploy)"*

### Step 2: Run Deterministic Pre-checks

Run the validation script for the selected phase:

```
python3 {skill-root}/scripts/validate-gate.py \
  --phase <phase-id> \
  --root {project-root} \
  --qa-threshold {qa_pass_threshold} \
  --hapi-port {hapi_port}
```

The script outputs a JSON validation report: list of rules checked, each with `status` (pass/fail/skip), `artifact`, `field`, `rule`, and `suggestion`. Capture this output.

If the script fails to run, perform validation yourself by reading the gate rules from `references/gate-rules.md` and checking each rule manually against the artifacts in `{project-root}/_bmad/memory/hdl/`.

### Step 3: LLM Semantic Checks

For phases where content quality matters beyond file existence, perform semantic validation:

- **discovery**: Is the use-case brief specific enough to derive FHIR resources? Are success criteria measurable?
- **fhir-profiling**: Do profiling notes justify every extension? Are must-support elements clinically reasonable?
- **terminology**: Are jurisdictional notes present for every binding? Are OIDs/URLs valid-looking?
- **architecture**: Do ADRs cover all open decisions from `review-findings.md`? Are all 6 diagram types present and non-empty?
- **stories**: Do AC items follow Given/When/Then? Is each AC item specific enough for a developer to implement without ambiguity?
- **qa**: Does the test results narrative describe what was actually tested (not just counts)?

Add any semantic findings to the report with rule ID prefix `SEM-`.

### Step 4: Compile Report

Aggregate all findings. Determine overall gate status:
- **PASS** — zero `fail` findings
- **FAIL** — one or more `fail` findings

Generate the HTML gate report using `assets/gate-report-template.html` as the base. Write it to:
```
{project-root}/_bmad-output/qa-reports/gate-{phase-id}-{YYYY-MM-DD}.html
```

### Step 5: Present Result

**On PASS:**
```
✅ Gate PASSED — {phase-id}
{N} rules checked. All passed.
Report: _bmad-output/qa-reports/gate-{phase-id}-{date}.html
Phase "{phase-id}" is cleared for advancement.
```

**On FAIL:**
```
❌ Gate FAILED — {phase-id}
{N} rules checked. {F} failed.

Failures:
  [RULE-ID] {artifact-path} > {field}
  Rule: {rule violated}
  Fix:  {suggested fix}
  ...

Report: _bmad-output/qa-reports/gate-{phase-id}-{date}.html
Return these findings to the responsible agent for remediation.
```

### Step 6: Update Delivery State

Append the gate result to `{project-root}/_bmad/memory/hdl/delivery-state.md` under Gate History:
```
| {phase-id} | {PASS/FAIL} | {date} | {N} rules, {F} failures |
```

In headless mode: exit code 0 for PASS, exit code 1 for FAIL.
