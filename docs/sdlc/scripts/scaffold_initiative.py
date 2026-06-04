#!/usr/bin/env python3
"""
SDLC Initiative Scaffold Script

Creates a complete directory structure and pre-populated template files
for a new SDLC initiative in the healthcareworkspace project.

Usage:
    python scaffold_initiative.py <initiative-name> [--target-apps app1,app2]

Example:
    python scaffold_initiative.py medication-reconciliation --target-apps ehr,pharmacyms,fhir
"""

import argparse
import os
import shutil
import sys
from datetime import date
from pathlib import Path

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent.parent.parent
TEMPLATES_DIR = WORKSPACE_ROOT / "docs" / "sdlc" / "templates"
OUTPUT_BASE = WORKSPACE_ROOT / "_bmad-output" / "planning-artifacts"

VALID_APPS = ["ehr-hospital", "pharmacyms", "lims", "ehr-practice", "fhir", "cross-app"]

DIRECTORY_STRUCTURE = {
    "intake": [
        "intake-form.md",
    ],
    "discovery": [
        "domain-research.md",
        "market-research.md",
        "personas.md",
    ],
    "definition": [
        "prd.md",
        "ux-design.md",
    ],
    "solutioning": [
        "architecture.md",
        "adrs/.gitkeep",
    ],
    "implementation": [
        "epics.md",
        "sprint-plan.md",
        "stories/.gitkeep",
    ],
    "validation": [
        "test-plan.md",
        "test-results.md",
    ],
    "release": [
        "release-notes.md",
        "runbook.md",
    ],
}

INTAKE_TEMPLATE = """# Intake Form — {initiative}

**Date:** {date}
**Submitted by:** Eagle
**Target application(s):** {apps}
**Priority:** TBD

## Problem statement

<!-- Brief description of the problem or opportunity -->

## Expected outcome

<!-- What does success look like? -->

## Stakeholders

| Name | Role | Interest |
|---|---|---|

## Initial notes

<!-- Any additional context -->

---

**Gate G1 status:** [ ] Passed
"""

DOMAIN_RESEARCH_TEMPLATE = """# Domain Research — {initiative}

> Use `bmad-domain-research` with Mary (BA) to complete this document.

**Date:** {date}
**Author:** Mary (Business Analyst)

## Domain overview

<!-- Overview of the clinical/business domain this initiative addresses -->

## Regulatory landscape

<!-- Applicable regulations: PIPEDA, PHIPA, HIPAA, provincial health acts -->

## Current state

<!-- How is this handled today? Manual processes? Existing systems? -->

## Key terminology

<!-- Domain-specific terms that the team must understand -->

## References

<!-- Links to standards, guidelines, regulatory documents -->
"""

PERSONAS_TEMPLATE = """# Personas — {initiative}

> Use Sally (UX Designer) persona profiles for healthcare-specific templates.

**Date:** {date}
**Author:** Sally (UX Designer), Mary (BA)

## Target personas

| Persona | Role | Context of use | Primary needs | Accessibility profile |
|---|---|---|---|---|

## Persona details

### Persona 1: [Name]

- **Role:**
- **Clinical context:**
- **Key tasks:**
- **Pain points:**
- **Accessibility needs:**
- **Language preference:** EN / FR / Bilingual
"""

UX_DESIGN_TEMPLATE = """# UX Design — {initiative}

> Use `bmad-create-ux-design` with Sally (UX Designer) to complete. Handoff to Jordan (UI Developer) on completion.

**Date:** {date}
**Author:** Sally (UX Designer)
**Target application(s):** {apps}

## Design system impact

- [ ] New design tokens needed
- [ ] New primitive components
- [ ] New composite components
- [ ] New pattern library entries
- [ ] New page templates

## Key screens

<!-- ASCII wireframes, Mermaid journey maps, component anatomy diagrams -->

## Accessibility requirements

| Standard | Level | Notes |
|---|---|---|
| WCAG 2.2 | AA | |
| AODA | | |
| Section 508 | | (US only) |

## Display modes

- [ ] Light
- [ ] Dark
- [ ] High-contrast
- [ ] Reduced-motion
- [ ] Forced-colors

## Density modes

- [ ] Default
- [ ] Compact (data-dense clinical views)
- [ ] Touch (tablet/mobile)

## Jordan (UI Developer) handoff

<!-- Structured handoff package — see Sally's SKILL.md for format -->
"""

TEST_PLAN_TEMPLATE = """# Test Plan — {initiative}

**Date:** {date}
**Author:** Amelia (Backend), Jordan (Frontend)
**Target application(s):** {apps}

## Test scope

| Test type | Tool | Owner | Coverage target |
|---|---|---|---|
| Unit tests (Go) | `testing` + `testify` | Amelia | ≥ 80% |
| Unit tests (TypeScript) | Jest / Vitest | Jordan | ≥ 80% |
| Integration tests | | Amelia | All service boundaries |
| FHIR conformance | HAPI validator | Alex | All profiles |
| E2E tests | Playwright | Amelia, Jordan | All acceptance criteria |
| Performance tests | k6 / Artillery | Amelia | NFR targets |
| Security tests | Trivy, gosec | Amelia | No critical findings |
| Accessibility tests | axe, Lighthouse | Jordan, Sally | WCAG 2.2 AA |

## Test data

<!-- How will test data be generated? FHIR test resources? -->

## Test environments

| Environment | Purpose | Data |
|---|---|---|
| Dev | Unit + integration | Synthetic |
| Staging | E2E + performance | Anonymized |

## Exit criteria

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] FHIR conformance tests pass
- [ ] E2E tests cover all acceptance criteria
- [ ] Performance meets NFR targets
- [ ] No critical security findings
- [ ] Accessibility audit passes
"""

RELEASE_NOTES_TEMPLATE = """# Release Notes — {initiative}

**Version:**
**Date:** {date}
**Target application(s):** {apps}

## Summary

<!-- One-paragraph summary of what this release delivers -->

## Changes

### New features

-

### Bug fixes

-

### Breaking changes

-

## FHIR changes

| Resource | Change | Profile | Impact |
|---|---|---|---|

## Migration steps

<!-- Database migrations, configuration changes, FHIR profile updates -->

## Known issues

-

## Rollback procedure

<!-- Reference runbook for detailed steps -->
"""

RUNBOOK_TEMPLATE = """# Runbook — {initiative}

**Date:** {date}
**Author:** Winston (Architect), Amelia (Backend)

## Deployment

### Pre-deployment checklist

- [ ] Goose migrations tested (up and down)
- [ ] Feature flags configured
- [ ] Monitoring dashboards ready
- [ ] Rollback procedure verified

### Deployment steps

1.
2.
3.

### Post-deployment verification

- [ ] Health check endpoints responding
- [ ] Smoke tests pass
- [ ] No error rate increase in monitoring

## Rollback

### When to rollback

-

### Rollback steps

1.
2.
3.

## Monitoring

| Dashboard | URL | What to watch |
|---|---|---|

## Contacts

| Role | Agent | Escalation |
|---|---|---|
| Architect | Winston | |
| Backend | Amelia | |
| Frontend | Jordan | |
| FHIR | Alex | |
"""


def create_initiative(name: str, target_apps: list[str]) -> Path:
    """Create the full initiative directory structure with pre-populated templates."""

    initiative_dir = OUTPUT_BASE / name

    if initiative_dir.exists():
        print(f"Error: Initiative directory already exists: {initiative_dir}")
        sys.exit(1)

    today = date.today().isoformat()
    apps_str = ", ".join(target_apps) if target_apps else "TBD"

    template_vars = {
        "initiative": name,
        "date": today,
        "apps": apps_str,
    }

    # Create directory structure
    for phase, files in DIRECTORY_STRUCTURE.items():
        for file_path in files:
            full_path = initiative_dir / phase / file_path
            full_path.parent.mkdir(parents=True, exist_ok=True)
            if file_path.endswith(".gitkeep"):
                full_path.touch()

    # Copy and fill templates
    _write_template(initiative_dir / "intake" / "intake-form.md",
                    INTAKE_TEMPLATE, template_vars)

    _write_template(initiative_dir / "discovery" / "domain-research.md",
                    DOMAIN_RESEARCH_TEMPLATE, template_vars)

    _write_template(initiative_dir / "discovery" / "personas.md",
                    PERSONAS_TEMPLATE, template_vars)

    _write_template(initiative_dir / "definition" / "ux-design.md",
                    UX_DESIGN_TEMPLATE, template_vars)

    _write_template(initiative_dir / "validation" / "test-plan.md",
                    TEST_PLAN_TEMPLATE, template_vars)

    _write_template(initiative_dir / "release" / "release-notes.md",
                    RELEASE_NOTES_TEMPLATE, template_vars)

    _write_template(initiative_dir / "release" / "runbook.md",
                    RUNBOOK_TEMPLATE, template_vars)

    # Copy standard templates from docs/sdlc/templates/
    _copy_template("prd-template.md",
                   initiative_dir / "definition" / "prd.md",
                   template_vars)

    _copy_template("architecture-template.md",
                   initiative_dir / "solutioning" / "architecture.md",
                   template_vars)

    # Create empty discovery/market-research.md
    _write_template(initiative_dir / "discovery" / "market-research.md",
                    "# Market Research — {initiative}\n\n"
                    "> Use `bmad-market-research` with Mary (BA) to complete.\n\n"
                    "**Date:** {date}\n", template_vars)

    # Create empty implementation files
    _write_template(initiative_dir / "implementation" / "epics.md",
                    "# Epics — {initiative}\n\n"
                    "> Use `bmad-create-epics-and-stories` with John (PM) to create.\n\n"
                    "**Date:** {date}\n", template_vars)

    _write_template(initiative_dir / "implementation" / "sprint-plan.md",
                    "# Sprint Plan — {initiative}\n\n"
                    "> Use `bmad-sprint-planning` with John (PM) to create.\n\n"
                    "**Date:** {date}\n", template_vars)

    _write_template(initiative_dir / "validation" / "test-results.md",
                    "# Test Results — {initiative}\n\n"
                    "**Date:** {date}\n\n"
                    "## Summary\n\n"
                    "| Test type | Passed | Failed | Skipped |\n"
                    "|---|---|---|---|\n", template_vars)

    # Create initiative README
    readme = f"""# {name}

**Created:** {today}
**Target application(s):** {apps_str}
**Status:** Intake

## Phases

| Phase | Status | Gate |
|---|---|---|
| Intake | In Progress | G1 |
| Discovery | Not Started | G2 |
| Definition | Not Started | G3 |
| Solutioning | Not Started | G4 |
| Implementation | Not Started | G5 |
| Validation | Not Started | G6 |
| Release | Not Started | G7 |

## Directory structure

```
{name}/
├── intake/
│   └── intake-form.md
├── discovery/
│   ├── domain-research.md
│   ├── market-research.md
│   └── personas.md
├── definition/
│   ├── prd.md
│   └── ux-design.md
├── solutioning/
│   ├── architecture.md
│   └── adrs/
├── implementation/
│   ├── epics.md
│   ├── sprint-plan.md
│   └── stories/
├── validation/
│   ├── test-plan.md
│   └── test-results.md
└── release/
    ├── release-notes.md
    └── runbook.md
```

## SDLC references

- [Workflow phases](../../../docs/sdlc/workflow-phases.md)
- [RACI model](../../../docs/sdlc/raci-model.md)
- [Gates & checklists](../../../docs/sdlc/gates-and-checklists.md)
- [Tech-stack guidance](../../../docs/sdlc/tech-stack-guidance.md)
- [Project context](../../../docs/project-context.md)
"""
    (initiative_dir / "README.md").write_text(readme, encoding="utf-8")

    return initiative_dir


def _write_template(path: Path, template: str, vars: dict) -> None:
    """Write a template string to a file, substituting variables."""
    path.parent.mkdir(parents=True, exist_ok=True)
    content = template.format(**vars)
    path.write_text(content, encoding="utf-8")


def _copy_template(template_name: str, dest: Path, vars: dict) -> None:
    """Copy a template from docs/sdlc/templates/ to the destination."""
    src = TEMPLATES_DIR / template_name
    dest.parent.mkdir(parents=True, exist_ok=True)
    if src.exists():
        shutil.copy2(src, dest)
    else:
        dest.write_text(f"# Template not found: {template_name}\n\n"
                        f"Copy from docs/sdlc/templates/{template_name}\n",
                        encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(
        description="Scaffold a new SDLC initiative workspace"
    )
    parser.add_argument(
        "name",
        help="Initiative name (kebab-case, e.g. medication-reconciliation)"
    )
    parser.add_argument(
        "--target-apps",
        default="",
        help=f"Comma-separated target apps: {', '.join(VALID_APPS)}"
    )

    args = parser.parse_args()

    # Validate name
    name = args.name.lower().replace(" ", "-")

    # Parse and validate target apps
    target_apps = []
    if args.target_apps:
        for app in args.target_apps.split(","):
            app = app.strip().lower()
            if app and app not in VALID_APPS:
                print(f"Warning: '{app}' is not a recognized app. "
                      f"Valid apps: {', '.join(VALID_APPS)}")
            if app:
                target_apps.append(app)

    initiative_dir = create_initiative(name, target_apps)

    print(f"\nInitiative scaffolded successfully!")
    print(f"Location: {initiative_dir}")
    print(f"\nNext steps:")
    print(f"  1. Fill out intake/intake-form.md")
    print(f"  2. Pass Gate G1 with John (PM)")
    print(f"  3. Begin Discovery phase with Mary (BA)")


if __name__ == "__main__":
    main()
