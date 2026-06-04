---
skill: hdl-stories
module: hdl
version: 1.0.0
type: workflow
description: >
  Generate epics and user stories with detailed Given/When/Then acceptance criteria,
  track AC status through build and QA, and produce an HTML AC completion report.
  Stories are written to _bmad/memory/hdl/stories/.
---

# hdl-stories

Generate, manage, and track user stories and acceptance criteria for the active healthcare project.

---

## Capabilities

| User says | Capability |
|---|---|
| "generate epics", "create epics", "generate stories from brief" | [Generate Epics & Stories](#generate-epics--stories) |
| "create story [ID or title]", "add story" | [Create Single Story](#create-single-story) |
| "update AC status", "mark AC done", "update story [ID] AC-[N]" | [Update AC Status](#update-ac-status) |
| "verify AC completion", "check AC status", "AC report" | [Verify AC Completion](#verify-ac-completion) |

---

## Generate Epics & Stories

### Pre-conditions

Read these files before generating:

| File | Used for |
|---|---|
| `_bmad/memory/hdl/discovery/use-case-brief.md` | Product vision, actors, success criteria |
| `_bmad/memory/hdl/architecture/adrs/index.md` | Accepted technology decisions (inform constraints) |
| `_bmad/memory/hdl/architecture/adrs/*.md` | ADR details for story constraints |
| `_bmad/config.toml` `[modules.hdl]` | `project_name`, `jurisdiction`, `fhir_version` |

### Step 1 — Derive Epics

Create `_bmad/memory/hdl/stories/epics.md`:

```markdown
# Epics — {project_name}

_Generated {date} by hdl-stories_

| Epic ID | Epic Title | Description | Primary Actor | FHIR Resources |
|---|---|---|---|---|
| E-001 | {title} | {1-sentence description} | {actor} | {comma-separated} |
...
```

Derive epics from the use-case-brief's success criteria and actor goals. Aim for 4–8 epics.
Each epic should map to a coherent user-facing capability.

**Suggested epics for a healthcare triage product:**

| Epic | Title |
|---|---|
| E-001 | User Authentication & Onboarding |
| E-002 | Symptom & Media Capture |
| E-003 | AI Triage Classification |
| E-004 | Triage Result Presentation |
| E-005 | FHIR Resource Persistence |
| E-006 | Clinician Review & Notification |
| E-007 | Referral & Care Pathway Routing |
| E-008 | Audit, Privacy & Data Residency |

Adjust to match the actual product scope.

### Step 2 — Generate Backlog

Create `_bmad/memory/hdl/stories/backlog.md`:

```markdown
# Story Backlog — {project_name}

_Last updated {date}_

| Story ID | Epic | Title | Priority | Status | Assigned |
|---|---|---|---|---|---|
| S-001 | E-001 | User can authenticate via SMART on FHIR | High | not-started | — |
| S-002 | E-002 | User can capture symptom image via camera | High | not-started | — |
...
```

Generate 3–5 stories per epic. Aim for thin vertical slices that can be independently tested.

### Step 3 — Generate Story Files

For each story in the backlog, create `_bmad/memory/hdl/stories/{story-id}/story.md`.

Use this template:

```markdown
# {Story ID} — {Story Title}

**Epic:** {epic-id} — {epic title}
**Priority:** {High | Medium | Low}
**Status:** not-started
**Assigned:** —
**FHIR Resources:** {comma-separated list}
**Last Updated:** {date}

---

## User Story

As a **{actor}**,
I want to **{goal}**,
so that **{benefit}**.

## Context

{1-2 sentences of technical or healthcare context — reference ADR or FHIR constraint if relevant.}

## Acceptance Criteria

### AC-001 — {Short title}

**Given** {precondition}
**When** {action}
**Then** {expected outcome}

**Status:** pending

---

### AC-002 — {Short title}

**Given** {precondition}
**When** {action}
**Then** {expected outcome}

**Status:** pending

---

{Repeat for each AC. Aim for 2-4 AC items per story.}

## Technical Notes

- {FHIR endpoint, profile reference, or implementation note}
- {Any constraint from an ADR}

## Definition of Done

- [ ] All AC items pass in automated tests
- [ ] FHIR resources validated against profile
- [ ] No P1 defects
- [ ] Code reviewed
```

Write a minimum of 2 AC items per story. Healthcare stories should reference the relevant
FHIR resource or profile constraint in the **Context** or **Technical Notes** section.

### Output

After generating all files, print:

```
─────────────────────────────────────────────
  HDL STORIES GENERATED
─────────────────────────────────────────────
  Epics   : {epic_count}
  Stories : {story_count}
  AC items: {ac_count} (all → pending)
─────────────────────────────────────────────
  Files:
    stories/epics.md
    stories/backlog.md
    stories/{id}/story.md  ×{story_count}
─────────────────────────────────────────────
  Next step: Amelia reviews and assigns stories
             Then: run hdl-gate-validator --phase stories
```

---

## Create Single Story

Add one story to an existing backlog.

### Steps

1. Determine the next available Story ID (scan `backlog.md` for the highest S-NNN).
2. Ask (or infer) the epic, title, actor, goal, and benefit.
3. Write `_bmad/memory/hdl/stories/{story-id}/story.md` using the template above.
4. Append a row to `_bmad/memory/hdl/stories/backlog.md`.
5. Confirm: "Story **{id}** created and added to backlog."

---

## Update AC Status

Called during or after build when an AC item has been implemented.

### Steps

1. Identify the story ID and AC number from the user's request or context.
2. Read the story file: `_bmad/memory/hdl/stories/{story-id}/story.md`.
3. Update the `**Status:**` line for the specified AC item:
   - Valid statuses: `pending`, `in-progress`, `pass`, `fail`, `blocked`
4. Update `**Last Updated:**` to today's date.
5. Update the story's top-level `**Status:**` if appropriate:
   - All AC `pass` → set story status to `complete`
   - Any AC `fail` or `blocked` → set story status to `blocked`
6. Append a row to `_bmad/memory/hdl/stories/backlog.md` by updating the status column for this story.
7. Confirm: "**{AC-ID}** in **{story-id}** marked as **{status}**."

### Bulk Update

If user says "mark all AC as pass for story {id}", update all `**Status:** pending` lines in
that story to `**Status:** pass` and set story status to `complete`.

---

## Verify AC Completion

Called post-QA to assess overall AC completion across the project.

### Steps

1. Scan all `_bmad/memory/hdl/stories/*/story.md` files.
2. Count AC items by status: `pending`, `in-progress`, `pass`, `fail`, `blocked`.
3. Compute completion percentage: `pass_count / total_ac_count * 100`.
4. Write an AC completion report to `_bmad-output/qa-reports/ac-completion-{date}.html`.
5. Print a summary.

### AC Completion Report Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{project_name} — AC Completion Report</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; background: #f5f5f5; }
  .header { background: #1e3a5f; color: white; padding: 24px 32px; }
  .header h1 { margin: 0; font-size: 1.4rem; }
  .header p { margin: 4px 0 0; opacity: 0.8; font-size: 0.9rem; }
  .container { max-width: 900px; margin: 32px auto; padding: 0 16px; }
  .summary { background: #fff; border-radius: 8px; padding: 20px 24px; margin-bottom: 24px;
             box-shadow: 0 1px 4px rgba(0,0,0,0.08); display: flex; gap: 32px; }
  .stat { text-align: center; }
  .stat .number { font-size: 2rem; font-weight: 700; }
  .stat .label { font-size: 0.8rem; color: #666; text-transform: uppercase; }
  .num-pass { color: #16a34a; } .num-fail { color: #dc2626; }
  .num-pending { color: #d97706; } .num-blocked { color: #7c3aed; }
  table { width: 100%; border-collapse: collapse; background: #fff;
          border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
  th { background: #f0f0f0; text-align: left; padding: 10px 14px; font-size: 0.8rem;
       text-transform: uppercase; color: #555; }
  td { padding: 10px 14px; border-top: 1px solid #eee; font-size: 0.875rem; }
  .pill { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; }
  .pill-pass { background: #dcfce7; color: #15803d; }
  .pill-fail { background: #fee2e2; color: #b91c1c; }
  .pill-pending { background: #fef3c7; color: #92400e; }
  .pill-blocked { background: #ede9fe; color: #5b21b6; }
  .pill-in-progress { background: #dbeafe; color: #1d4ed8; }
  .progress-bar { background: #e5e7eb; border-radius: 9999px; height: 12px; overflow: hidden; margin: 8px 0; }
  .progress-fill { background: #16a34a; height: 100%; border-radius: 9999px; }
  .footer { text-align: center; color: #aaa; font-size: 0.75rem; padding: 16px 0 32px; }
</style>
</head>
<body>
<div class="header">
  <h1>{project_name} — AC Completion Report</h1>
  <p>Generated {date} | {total_ac} acceptance criteria across {story_count} stories</p>
</div>
<div class="container">
  <div class="summary">
    <div class="stat"><div class="number">{total_ac}</div><div class="label">Total AC</div></div>
    <div class="stat"><div class="number num-pass">{pass_count}</div><div class="label">Pass</div></div>
    <div class="stat"><div class="number num-fail">{fail_count}</div><div class="label">Fail</div></div>
    <div class="stat"><div class="number num-pending">{pending_count}</div><div class="label">Pending</div></div>
    <div class="stat"><div class="number num-blocked">{blocked_count}</div><div class="label">Blocked</div></div>
  </div>

  <div style="background:#fff;border-radius:8px;padding:20px 24px;margin-bottom:24px;box-shadow:0 1px 4px rgba(0,0,0,0.08)">
    <strong>Overall Completion: {completion_pct}%</strong>
    <div class="progress-bar"><div class="progress-fill" style="width:{completion_pct}%"></div></div>
  </div>

  <table>
    <thead>
      <tr><th>Story</th><th>Title</th><th>AC Item</th><th>Status</th></tr>
    </thead>
    <tbody>
      {ac_rows}
    </tbody>
  </table>
  <div class="footer">Healthcare SDLC Delivery Suite — hdl-stories — {date}</div>
</div>
</body>
</html>
```

### Completion Summary (printed to chat)

```
─────────────────────────────────────────────
  AC COMPLETION REPORT
─────────────────────────────────────────────
  Project  : {project_name}
  Date     : {date}
─────────────────────────────────────────────
  Total AC : {total_ac}
  Pass     : {pass_count}  ({completion_pct}%)
  Fail     : {fail_count}
  Pending  : {pending_count}
  Blocked  : {blocked_count}
─────────────────────────────────────────────
  Report   : _bmad-output/qa-reports/ac-completion-{date}.html
─────────────────────────────────────────────
  Gate QA-003 requires: all AC pass before deploy
  {gate_status_line}
```

Gate status line:
- If `completion_pct == 100` and `fail_count == 0`: `  ✓ QA-003: PASS — all AC complete`
- Else: `  ✗ QA-003: FAIL — {pending_count + fail_count} AC items not passing`
