---
name: hdl-setup
description: Healthcare SDLC Delivery Suite project setup and scaffolding. Use when user says "setup hdl", "initialize hdl", "new hdl project", or "configure healthcare delivery".
---

# hdl-setup

## Overview

Sets up the Healthcare SDLC Delivery Suite (`hdl`) module for a project. Detects whether this is a **new** or **existing** project and scaffolds only what is missing — it never overwrites files that are already present. On completion, writes the `[modules.hdl]` config block and initializes the shared delivery memory that all `hdl` agents and workflows depend on.

Supports `--headless` / `-H` for non-interactive execution using config defaults.

## Conventions

- Bare paths (e.g. `references/guide.md`) resolve from the skill root.
- `{skill-root}` resolves to this skill's installed directory.
- `{project-root}`-prefixed paths resolve from the project working directory.
- `{skill-name}` resolves to the skill directory's basename.

## On Activation

Load available config from `{project-root}/_bmad/config.yaml` and `{project-root}/_bmad/config.user.yaml` (root level and `hdl` section). Use sensible defaults for anything not configured. If `--headless` or `-H` is passed, skip all interactive prompts and apply defaults or previously configured values.

## Step 1: Project Detection

Run the detection script to determine project state:

```
python3 {skill-root}/scripts/detect-project.py --root {project-root}
```

The script outputs a JSON detection report listing each expected path as `present` or `missing`. If the script fails, perform detection yourself by checking whether each of the following exists:

| Path | Purpose |
|---|---|
| `{project-root}/docker-compose.yml` | HAPI FHIR local deployment config |
| `{project-root}/_bmad-output/` | BMad output folder |
| `{project-root}/_bmad-output/ig/input/` | IG publisher input directory |
| `{project-root}/_bmad/memory/hdl/` | HDL shared delivery memory root |
| `{project-root}/_bmad/memory/hdl/delivery-state.md` | Delivery phase tracking |
| `{project-root}/_bmad/memory/hdl/index.md` | Memory orientation index |

Classify the project:
- **New project** — fewer than 2 paths present
- **Existing project** — 2 or more paths already present

Present the detection result to the user (unless `--headless`): what was found, what will be created, what will be skipped.

## Step 2: Collect Configuration

If `--headless`, use values already present in config or fall back to defaults. Otherwise, prompt interactively for each variable. Skip any that are already set in config.

| Variable | Prompt | Default |
|---|---|---|
| `project_name` | Project name? | folder name of `{project-root}` |
| `fhir_version` | FHIR version — R4, R4B, or R5? | `R4` |
| `jurisdiction` | Primary jurisdiction — pan-Canadian, Ontario, US, or other? | `pan-Canadian` |
| `hapi_port` | Local HAPI FHIR server port? | `8080` |
| `qa_pass_threshold` | QA gate minimum pass rate (%)? | `95` |
| `ig_publisher_path` | IG publisher output folder path? | `_bmad-output/ig` |
| `team_lead` | Your name (used by Kai for greetings)? | value of `core.user_name` if set |

Confirm the collected values with the user before proceeding (unless `--headless`).

## Step 3: Scaffold Missing Structure

Create only the paths reported as `missing` by detection. Never overwrite existing files. For each item created, log it. For each item skipped, log it as already present.

**Scaffold items (new project gets all; existing project gets only missing ones):**

### Docker Compose
Write `{project-root}/docker-compose.yml` from `{skill-root}/assets/docker-compose.yml.template`, substituting `{hapi_port}` with the configured port value.

### Output Directories
Create these directories (empty, no files):
```
{project-root}/_bmad-output/planning-artifacts/
{project-root}/_bmad-output/architecture/adrs/
{project-root}/_bmad-output/architecture/diagrams/
{project-root}/_bmad-output/implementation-artifacts/
{project-root}/_bmad-output/qa-reports/
{project-root}/_bmad-output/deployment-logs/
{project-root}/_bmad-output/ig/input/
{project-root}/_bmad-output/ig/output/
{project-root}/_bmad-output/ig/temp/
```

### HDL Memory Structure
Create these directories (empty):
```
{project-root}/_bmad/memory/hdl/daily/
{project-root}/_bmad/memory/hdl/discovery/
{project-root}/_bmad/memory/hdl/fhir-profiling/structuredefinitions/
{project-root}/_bmad/memory/hdl/terminology/valuesets/
{project-root}/_bmad/memory/hdl/architecture/adrs/
{project-root}/_bmad/memory/hdl/architecture/diagrams/
{project-root}/_bmad/memory/hdl/stories/
{project-root}/_bmad/memory/hdl/build/
{project-root}/_bmad/memory/hdl/qa/
{project-root}/_bmad/memory/hdl/deploy/
```

Write `{project-root}/_bmad/memory/hdl/index.md` from `{skill-root}/assets/index-template.md`, substituting `{project_name}` and today's date.

Write `{project-root}/_bmad/memory/hdl/delivery-state.md` from `{skill-root}/assets/delivery-state-template.md`, substituting `{project_name}` and today's date.

Write today's daily log file `{project-root}/_bmad/memory/hdl/daily/{YYYY-MM-DD}.md` with a `[hdl-setup]` tagged entry recording what was scaffolded.

## Step 4: Write Configuration

Merge the collected config values into `{project-root}/_bmad/config.toml` under the `[modules.hdl]` block. If the block already exists, update only the keys that were collected during this session (do not erase existing keys). If the file does not exist, create it.

Config block to write:
```toml
[modules.hdl]
project_name = "{project_name}"
fhir_version = "{fhir_version}"
jurisdiction = "{jurisdiction}"
hapi_port = {hapi_port}
qa_pass_threshold = {qa_pass_threshold}
ig_publisher_path = "{ig_publisher_path}"
```

Write `team_lead` under `[core]` only if `core.user_name` is not already set.

## Step 5: Verify Setup

Run the verification script:

```
python3 {skill-root}/scripts/detect-project.py --root {project-root} --verify
```

In `--verify` mode the script checks all required paths are now present and reports any still-missing items. If the script is unavailable, check manually that all paths from Step 3 exist.

## Step 6: Present Setup Report

Show a concise setup summary:

```
HDL Setup Complete
==================
Project:      {project_name}
FHIR version: {fhir_version}
Jurisdiction: {jurisdiction}
HAPI port:    {hapi_port}
QA threshold: {qa_pass_threshold}%

Created:
  ✓ docker-compose.yml
  ✓ _bmad/memory/hdl/ (full structure)
  ✓ _bmad-output/ directories
  ✓ [modules.hdl] config block

Skipped (already present):
  — (list any skipped items)

Missing (action required):
  — (list any items that could not be created, with reason)
```

If anything is still missing, explain why and what the user needs to do manually.

If Docker was not detected (`docker --version` fails), surface a warning: _"Docker Desktop is required for the local deployment phase. Install from https://www.docker.com/products/docker-desktop before reaching the Deploy phase."_

**Setup complete.** Remind the user that Kai (`hdl-agent-lead`) is their starting point for the delivery lifecycle — invoke Kai to begin the Discovery phase.
