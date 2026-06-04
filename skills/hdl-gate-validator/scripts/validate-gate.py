#!/usr/bin/env python3
"""
hdl-gate-validator: Deterministic phase gate validation script.

Usage:
  python3 validate-gate.py --phase <phase-id> --root <project-root>
                           [--qa-threshold <int>] [--hapi-port <int>]

Outputs a JSON validation report.
Exit code 0 = gate PASS, exit code 1 = gate FAIL.

Phase IDs: discovery | fhir-profiling | terminology | architecture |
           stories | build | qa | deploy
"""

import argparse
import json
import os
import re
import sys
from datetime import date
from pathlib import Path
from typing import Optional

try:
    import urllib.request
    import urllib.error
except ImportError:
    pass


# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------

def finding(rule_id: str, status: str, artifact: str, field: str,
            rule: str, suggestion: str = "") -> dict:
    return {
        "rule_id": rule_id,
        "status": status,          # pass | fail | skip
        "artifact": artifact,
        "field": field,
        "rule": rule,
        "suggestion": suggestion,
    }


def _rel(root: Path, path: Path) -> str:
    try:
        return str(path.relative_to(root))
    except ValueError:
        return str(path)


# ---------------------------------------------------------------------------
# Per-phase validators
# ---------------------------------------------------------------------------

def validate_discovery(root: Path) -> list:
    results = []
    mem = root / "_bmad" / "memory" / "hdl"

    brief = mem / "discovery" / "use-case-brief.md"
    inv   = mem / "discovery" / "data-element-inventory.md"

    # DISC-001
    if not brief.is_file():
        results.append(finding("DISC-001", "fail", _rel(root, brief),
            "file exists",
            "Use case brief must exist",
            "Run Discovery phase with Mary and John to produce the brief"))
    else:
        text = brief.read_text(encoding="utf-8", errors="replace")

        # DISC-002
        if "## Product Vision" not in text or len(re.sub(r"##\s*Product Vision\s*", "", text).split("\n")[0].strip()) == 0:
            has_section = "## Product Vision" in text
            section_content = ""
            if has_section:
                after = text.split("## Product Vision", 1)[1].strip()
                section_content = after.split("##")[0].strip()
            if not has_section or not section_content:
                results.append(finding("DISC-002", "fail", _rel(root, brief),
                    "## Product Vision section",
                    "Vision section required and must be non-empty",
                    "Add a Product Vision section describing what the product does and who it's for"))
            else:
                results.append(finding("DISC-002", "pass", _rel(root, brief), "## Product Vision section", "", ""))

        # DISC-003
        if "## Actors" in text:
            actors_content = text.split("## Actors", 1)[1].split("##")[0].strip()
            if len(actors_content) < 10:
                results.append(finding("DISC-003", "fail", _rel(root, brief),
                    "## Actors section",
                    "At least one actor required",
                    "Add the primary user/patient actor to the Actors section"))
            else:
                results.append(finding("DISC-003", "pass", _rel(root, brief), "## Actors section", "", ""))
        else:
            results.append(finding("DISC-003", "fail", _rel(root, brief),
                "## Actors section",
                "At least one actor required",
                "Add an Actors section with the primary user"))

        # DISC-004
        if "## Success Criteria" in text:
            sc = text.split("## Success Criteria", 1)[1].split("##")[0]
            items = [l for l in sc.splitlines() if l.strip().startswith("-") or re.match(r"^\d+\.", l.strip())]
            if len(items) < 2:
                results.append(finding("DISC-004", "fail", _rel(root, brief),
                    "## Success Criteria — item count",
                    "Minimum 2 success criteria required",
                    "Add measurable success criteria"))
            else:
                results.append(finding("DISC-004", "pass", _rel(root, brief), "## Success Criteria", "", ""))
        else:
            results.append(finding("DISC-004", "fail", _rel(root, brief),
                "## Success Criteria section",
                "Minimum 2 success criteria required",
                "Add a Success Criteria section"))

        # DISC-007 — unresolved open questions
        if "## Open Questions" in text:
            oq = text.split("## Open Questions", 1)[1].split("##")[0]
            unresolved = re.findall(r"- \[ \]", oq)
            if unresolved:
                results.append(finding("DISC-007", "fail", _rel(root, brief),
                    "## Open Questions — unresolved items",
                    f"{len(unresolved)} open question(s) still unresolved",
                    "Resolve all [ ] open questions before advancing to FHIR profiling"))
            else:
                results.append(finding("DISC-007", "pass", _rel(root, brief), "## Open Questions", "", ""))

    # DISC-005
    if not inv.is_file():
        results.append(finding("DISC-005", "fail", _rel(root, inv),
            "file exists",
            "Data element inventory must exist",
            "Run Discovery phase to produce the data element inventory"))
    else:
        text = inv.read_text(encoding="utf-8", errors="replace")
        rows = [l for l in text.splitlines() if "|" in l and not l.strip().startswith("|---")]
        data_rows = [r for r in rows if not re.match(r"\|\s*\*?\*?Element\*?\*?", r, re.I)]
        if len(data_rows) < 3:
            results.append(finding("DISC-006", "fail", _rel(root, inv),
                "data element table rows",
                "Minimum 3 data elements required",
                "Add all data elements that must be exchanged via FHIR"))
        else:
            results.append(finding("DISC-006", "pass", _rel(root, inv), "data element table", "", ""))

    return results


def validate_fhir_profiling(root: Path) -> list:
    results = []
    mem = root / "_bmad" / "memory" / "hdl" / "fhir-profiling"

    sd_dir = mem / "structuredefinitions"
    notes  = mem / "profiling-notes.md"

    # PROF-001
    sd_files = list(sd_dir.glob("*")) if sd_dir.is_dir() else []
    valid_sds = [f for f in sd_files if f.suffix in (".json", ".xml", ".md") and f.is_file()]
    if not valid_sds:
        results.append(finding("PROF-001", "fail", _rel(root, sd_dir),
            "directory contains at least 1 SD file",
            "At least one StructureDefinition required",
            "Work with Alex to produce at least one SD for the primary resource"))
    else:
        results.append(finding("PROF-001", "pass", _rel(root, sd_dir), "SD files present", "", ""))

    # PROF-002
    if not notes.is_file():
        results.append(finding("PROF-002", "fail", _rel(root, notes),
            "file exists",
            "Profiling notes required",
            "Ask Alex to document design decisions and extension justifications"))
    else:
        text = notes.read_text(encoding="utf-8", errors="replace")

        # PROF-003
        if not re.search(r"must.support", text, re.I):
            results.append(finding("PROF-003", "fail", _rel(root, notes),
                "must-support documentation",
                "Must-support elements must be documented",
                "Add a Must-Support section listing all must-support elements"))
        else:
            results.append(finding("PROF-003", "pass", _rel(root, notes), "must-support documentation", "", ""))

        # PROF-004
        if re.search(r"unbound", text, re.I):
            unresolved = re.findall(r"- \[ \]", text)
            if unresolved:
                results.append(finding("PROF-004", "fail", _rel(root, notes),
                    "unbound elements — unresolved items",
                    f"{len(unresolved)} unbound element(s) not yet flagged for terminology review",
                    "Ensure all unbound elements are listed so Morgan can bind them"))
            else:
                results.append(finding("PROF-004", "pass", _rel(root, notes), "unbound elements flagged", "", ""))

    return results


def validate_terminology(root: Path) -> list:
    results = []
    mem = root / "_bmad" / "memory" / "hdl" / "terminology"

    inv = mem / "terminology-inventory.md"
    vs_dir = mem / "valuesets"

    # TERM-001
    if not inv.is_file():
        results.append(finding("TERM-001", "fail", _rel(root, inv),
            "file exists",
            "Terminology inventory required",
            "Ask Morgan to produce the terminology inventory"))
    else:
        text = inv.read_text(encoding="utf-8", errors="replace")

        # TERM-002 — check for empty URL/OID cells
        rows = [l for l in text.splitlines() if "|" in l and not l.strip().startswith("|---")]
        data_rows = rows[1:] if rows else []
        empty_url = [r for r in data_rows if re.search(r"\|\s*\|", r)]
        if empty_url:
            results.append(finding("TERM-002", "fail", _rel(root, inv),
                "binding table — URL/OID columns",
                f"{len(empty_url)} binding(s) missing URL or OID",
                "Add canonical URLs or OIDs for each ValueSet/CodeSystem"))
        else:
            results.append(finding("TERM-002", "pass", _rel(root, inv), "binding URLs/OIDs", "", ""))

        # TERM-003
        if not re.search(r"jurisdiction", text, re.I):
            results.append(finding("TERM-003", "fail", _rel(root, inv),
                "jurisdictional notes",
                "Jurisdictional notes required",
                "Ask Morgan to add jurisdictional notes (Ontario, pan-Canadian, US Core)"))
        else:
            results.append(finding("TERM-003", "pass", _rel(root, inv), "jurisdictional notes", "", ""))

    # TERM-004
    vs_files = list(vs_dir.glob("*")) if vs_dir.is_dir() else []
    valid_vs = [f for f in vs_files if f.is_file()]
    if not valid_vs:
        results.append(finding("TERM-004", "fail", _rel(root, vs_dir),
            "directory contains at least 1 ValueSet file",
            "At least one ValueSet file required",
            "Ask Morgan to produce ValueSet definitions"))
    else:
        results.append(finding("TERM-004", "pass", _rel(root, vs_dir), "ValueSet files present", "", ""))

    return results


def validate_architecture(root: Path) -> list:
    results = []
    mem = root / "_bmad" / "memory" / "hdl" / "architecture"

    findings_file = mem / "review-findings.md"
    adr_dir = mem / "adrs"
    diag_dir = mem / "diagrams"

    REQUIRED_DIAGRAMS = [
        "c4-context", "c4-container", "fhir-resource-map",
        "fhir-profile-tree", "terminology-binding-map", "sequence"
    ]

    # ARCH-001
    if not findings_file.is_file():
        results.append(finding("ARCH-001", "fail", _rel(root, findings_file),
            "file exists",
            "Architecture review findings required",
            "Ask Winston to review and document findings"))
    else:
        results.append(finding("ARCH-001", "pass", _rel(root, findings_file), "file exists", "", ""))

    # ARCH-002 + ARCH-003
    adr_files = list(adr_dir.glob("ADR-*.md")) if adr_dir.is_dir() else []
    if not adr_files:
        results.append(finding("ARCH-002", "fail", _rel(root, adr_dir),
            "ADR-*.md files",
            "At least one ADR required",
            "Run hdl-adr to generate ADRs from Winston's open decisions list"))
    else:
        results.append(finding("ARCH-002", "pass", _rel(root, adr_dir), f"{len(adr_files)} ADR(s) present", "", ""))
        proposed = []
        for f in adr_files:
            txt = f.read_text(encoding="utf-8", errors="replace")
            if re.search(r"Status:\s*Proposed", txt, re.I):
                proposed.append(f.name)
        if proposed:
            results.append(finding("ARCH-003", "fail", _rel(root, adr_dir),
                f"ADR Status — {', '.join(proposed)}",
                "All ADRs must be accepted before advancing",
                "Review and accept all Proposed ADRs"))
        else:
            results.append(finding("ARCH-003", "pass", _rel(root, adr_dir), "All ADRs accepted", "", ""))

    # ARCH-004 + ARCH-005
    if not diag_dir.is_dir():
        results.append(finding("ARCH-004", "fail", _rel(root, diag_dir),
            "diagrams directory",
            "All 6 diagram types required",
            "Run hdl-diagrams to generate all diagrams"))
    else:
        all_diag_files = list(diag_dir.glob("*"))
        for req in REQUIRED_DIAGRAMS:
            matches = [f for f in all_diag_files if req in f.name.lower() and f.is_file()]
            if not matches:
                results.append(finding("ARCH-004", "fail", _rel(root, diag_dir),
                    f"diagram file matching '{req}'",
                    f"Diagram type '{req}' is required",
                    f"Run hdl-diagrams to generate the {req} diagram"))
            else:
                f = matches[0]
                if f.stat().st_size < 100:
                    results.append(finding("ARCH-005", "fail", _rel(root, f),
                        "file size > 100 bytes",
                        f"Diagram '{f.name}' appears empty",
                        f"Regenerate the {req} diagram using hdl-diagrams"))
                else:
                    results.append(finding("ARCH-004", "pass", _rel(root, f), f"{req} present", "", ""))

    return results


def validate_stories(root: Path) -> list:
    results = []
    mem = root / "_bmad" / "memory" / "hdl" / "stories"

    epics    = mem / "epics.md"
    backlog  = mem / "backlog.md"

    # STORY-001
    if not epics.is_file():
        results.append(finding("STORY-001", "fail", _rel(root, epics),
            "file exists",
            "Epics file required",
            "Run hdl-stories to generate epics"))
    else:
        results.append(finding("STORY-001", "pass", _rel(root, epics), "file exists", "", ""))

    # STORY-002
    if not backlog.is_file():
        results.append(finding("STORY-002", "fail", _rel(root, backlog),
            "file exists with stories",
            "Story backlog required",
            "Run hdl-stories to generate the story backlog"))
    else:
        text = backlog.read_text(encoding="utf-8", errors="replace")
        rows = [l for l in text.splitlines() if "|" in l and not l.strip().startswith("|---")]
        data_rows = rows[1:] if rows else []
        if not data_rows:
            results.append(finding("STORY-002", "fail", _rel(root, backlog),
                "story rows",
                "Story backlog must contain at least 1 story",
                "Run hdl-stories to generate stories"))
        else:
            results.append(finding("STORY-002", "pass", _rel(root, backlog), f"{len(data_rows)} stories", "", ""))

            # STORY-003 blocked without note
            for row in data_rows:
                if "blocked" in row.lower():
                    cols = [c.strip() for c in row.split("|")]
                    if len(cols) < 4 or not cols[-2]:
                        results.append(finding("STORY-003", "fail", _rel(root, backlog),
                            f"blocked story missing note — row: {row[:60]}",
                            "Blocked stories must have a documented reason",
                            "Add a blocker note to each blocked story"))

    # Per-story AC checks
    story_dirs = [d for d in mem.iterdir() if d.is_dir()] if mem.is_dir() else []
    for story_dir in story_dirs:
        story_file = story_dir / "story.md"
        if not story_file.is_file():
            continue
        text = story_file.read_text(encoding="utf-8", errors="replace")

        # STORY-004
        if "## Acceptance Criteria" not in text:
            results.append(finding("STORY-004", "fail", _rel(root, story_file),
                "## Acceptance Criteria section",
                "Every story must have AC",
                f"Add AC items in Given/When/Then format to {story_dir.name}"))
            continue

        ac_section = text.split("## Acceptance Criteria", 1)[1].split("\n##")[0]

        # Split on AC headers — each match produces one block per AC item
        ac_items = re.findall(r"###\s+AC-\d+.*?(?=###\s+AC-\d+|\Z)", ac_section, re.DOTALL)
        if not ac_items:
            # AC section exists but has no ### AC-NNN headers — treat whole section as one item
            ac_items = [ac_section]

        for i, block in enumerate(ac_items, 1):
            if "**Status:**" not in block:
                results.append(finding("STORY-005", "fail", _rel(root, story_file),
                    f"AC item {i} — **Status:** field",
                    "Every AC item must have a status field",
                    f"Add '**Status:** pending' to AC item {i} in {story_dir.name}"))
            else:
                results.append(finding("STORY-005", "pass", _rel(root, story_file), f"AC-{i} status field", "", ""))

            # STORY-006 — Given/When/Then complete
            for keyword in ("**Given**", "**When**", "**Then**"):
                if keyword not in block:
                    results.append(finding("STORY-006", "fail", _rel(root, story_file),
                        f"AC item {i} — {keyword}",
                        "AC items must have complete Given/When/Then",
                        f"Add the {keyword} clause to AC item {i} in {story_dir.name}"))

    return results


def validate_build(root: Path) -> list:
    results = []
    mem = root / "_bmad" / "memory" / "hdl"

    manifest  = mem / "build" / "code-manifest.md"
    test_plan = mem / "build" / "test-plan.md"

    # BUILD-001
    if not manifest.is_file():
        results.append(finding("BUILD-001", "fail", _rel(root, manifest),
            "file exists",
            "Code manifest required",
            "Ask Amelia/Jordan to produce the code manifest after build"))
    else:
        results.append(finding("BUILD-001", "pass", _rel(root, manifest), "file exists", "", ""))

    # BUILD-002
    if not test_plan.is_file():
        results.append(finding("BUILD-002", "fail", _rel(root, test_plan),
            "file exists",
            "Test plan required",
            "Ask Amelia to document the test plan"))
    else:
        results.append(finding("BUILD-002", "pass", _rel(root, test_plan), "file exists", "", ""))

    # BUILD-003 / BUILD-004 — AC statuses post-build
    stories_dir = mem / "stories"
    story_dirs = [d for d in stories_dir.iterdir() if d.is_dir()] if stories_dir.is_dir() else []
    for story_dir in story_dirs:
        story_file = story_dir / "story.md"
        if not story_file.is_file():
            continue
        text = story_file.read_text(encoding="utf-8", errors="replace")
        pending = re.findall(r"\*\*Status:\*\*\s*pending", text, re.I)
        partial = re.findall(r"\*\*Status:\*\*\s*partial", text, re.I)
        if pending:
            results.append(finding("BUILD-003", "fail", _rel(root, story_file),
                f"{len(pending)} AC item(s) still 'pending'",
                "All AC items must be updated post-build",
                f"Ask Amelia/Jordan to update AC status in {story_dir.name}"))
        if partial:
            results.append(finding("BUILD-004", "fail", _rel(root, story_file),
                f"{len(partial)} AC item(s) are 'partial'",
                "Partial AC is not acceptable at build gate",
                f"Resolve all partial AC items to pass or raise a new story in {story_dir.name}"))

    return results


def validate_qa(root: Path, qa_threshold: int) -> list:
    results = []
    mem = root / "_bmad" / "memory" / "hdl"

    qa_results = mem / "qa" / "test-results.md"

    # QA-001
    if not qa_results.is_file():
        results.append(finding("QA-001", "fail", _rel(root, qa_results),
            "file exists",
            "QA test results required",
            "Ask Amelia to run tests and document results"))
    else:
        text = qa_results.read_text(encoding="utf-8", errors="replace")

        # QA-002 — pass rate
        match = re.search(r"(\d+(?:\.\d+)?)\s*%", text)
        if match:
            rate = float(match.group(1))
            if rate < qa_threshold:
                results.append(finding("QA-002", "fail", _rel(root, qa_results),
                    f"pass rate {rate}% < threshold {qa_threshold}%",
                    f"Pass rate must be >= {qa_threshold}%",
                    f"Fix failing tests until pass rate meets {qa_threshold}% threshold"))
            else:
                results.append(finding("QA-002", "pass", _rel(root, qa_results), f"pass rate {rate}%", "", ""))
        else:
            results.append(finding("QA-002", "fail", _rel(root, qa_results),
                "pass rate — not found",
                "Test results must include a pass rate percentage",
                "Add a pass rate percentage to the test results file"))

        # QA-003 — open P1 bugs
        if re.search(r"(P1|priority.1|critical).*open", text, re.I):
            results.append(finding("QA-003", "fail", _rel(root, qa_results),
                "open P1/critical bugs",
                "No open P1/critical bugs allowed",
                "Resolve all critical bugs before deploying"))
        else:
            results.append(finding("QA-003", "pass", _rel(root, qa_results), "no open P1 bugs", "", ""))

    # QA-004 / QA-005 — AC final verification
    stories_dir = mem / "stories"
    story_dirs = [d for d in stories_dir.iterdir() if d.is_dir()] if stories_dir.is_dir() else []
    for story_dir in story_dirs:
        story_file = story_dir / "story.md"
        if not story_file.is_file():
            continue
        text = story_file.read_text(encoding="utf-8", errors="replace")
        failing  = re.findall(r"\*\*Status:\*\*\s*fail\b", text, re.I)
        pending  = re.findall(r"\*\*Status:\*\*\s*pending", text, re.I)
        if failing:
            results.append(finding("QA-004", "fail", _rel(root, story_file),
                f"{len(failing)} AC item(s) with status 'fail'",
                "All AC items must pass before deploy",
                f"Fix all failing AC items in {story_dir.name}"))
        if pending:
            results.append(finding("QA-005", "fail", _rel(root, story_file),
                f"{len(pending)} AC item(s) still 'pending'",
                "All AC items must be verified by QA",
                f"Ask QA to review and update pending AC items in {story_dir.name}"))

    return results


def validate_deploy(root: Path, hapi_port: int) -> list:
    results = []
    mem = root / "_bmad" / "memory" / "hdl" / "deploy"

    url = f"http://localhost:{hapi_port}/fhir/metadata"
    try:
        req = urllib.request.urlopen(url, timeout=10)
        status = req.status
        body = req.read(2048).decode("utf-8", errors="replace")
        if status == 200:
            results.append(finding("DEPLOY-001", "pass", url, "HTTP 200", "", ""))
            if "fhirVersion" in body:
                results.append(finding("DEPLOY-002", "pass", url, "CapabilityStatement contains fhirVersion", "", ""))
            else:
                results.append(finding("DEPLOY-002", "fail", url,
                    "fhirVersion in response body",
                    "Server must return a valid CapabilityStatement",
                    "Check HAPI server logs for startup errors"))
        else:
            results.append(finding("DEPLOY-001", "fail", url,
                f"HTTP {status}",
                "HAPI FHIR server must return HTTP 200",
                "Run `docker compose up -d` and wait for healthcheck"))
    except Exception as e:
        results.append(finding("DEPLOY-001", "fail", url,
            f"connection error: {e}",
            "HAPI FHIR server must be running and healthy",
            "Run `docker compose up -d` and wait for healthcheck to pass"))
        results.append(finding("DEPLOY-002", "skip", url,
            "skipped — server not reachable", "", ""))

    manifest = mem / "deployment-manifest.md"
    log_file = mem / "deployment-log.md"

    if not manifest.is_file():
        results.append(finding("DEPLOY-003", "fail", _rel(root, manifest),
            "file exists",
            "Deployment manifest required",
            "Run hdl-deploy to produce the deployment manifest"))
    else:
        results.append(finding("DEPLOY-003", "pass", _rel(root, manifest), "file exists", "", ""))

    if not log_file.is_file():
        results.append(finding("DEPLOY-004", "fail", _rel(root, log_file),
            "file exists and contains success/healthy",
            "Deployment log must confirm successful deploy",
            "Re-run hdl-deploy and confirm server reaches healthy state"))
    else:
        txt = log_file.read_text(encoding="utf-8", errors="replace")
        if not re.search(r"(success|healthy)", txt, re.I):
            results.append(finding("DEPLOY-004", "fail", _rel(root, log_file),
                "success or healthy keyword",
                "Deployment log must confirm successful deploy",
                "Re-run hdl-deploy — server may not have reached healthy state"))
        else:
            results.append(finding("DEPLOY-004", "pass", _rel(root, log_file), "deployment confirmed", "", ""))

    return results


# ---------------------------------------------------------------------------
# Dispatch + main
# ---------------------------------------------------------------------------

VALIDATORS = {
    "discovery":     lambda root, **kw: validate_discovery(root),
    "fhir-profiling": lambda root, **kw: validate_fhir_profiling(root),
    "terminology":   lambda root, **kw: validate_terminology(root),
    "architecture":  lambda root, **kw: validate_architecture(root),
    "stories":       lambda root, **kw: validate_stories(root),
    "build":         lambda root, **kw: validate_build(root),
    "qa":            lambda root, **kw: validate_qa(root, kw.get("qa_threshold", 95)),
    "deploy":        lambda root, **kw: validate_deploy(root, kw.get("hapi_port", 8080)),
}


def main():
    parser = argparse.ArgumentParser(description="HDL gate validator")
    parser.add_argument("--phase", required=True, choices=list(VALIDATORS.keys()))
    parser.add_argument("--root", required=True)
    parser.add_argument("--qa-threshold", type=int, default=95)
    parser.add_argument("--hapi-port", type=int, default=8080)
    args = parser.parse_args()

    root = Path(args.root).resolve()
    if not root.exists():
        print(json.dumps({"error": f"Project root does not exist: {root}"}))
        sys.exit(1)

    findings_list = VALIDATORS[args.phase](
        root,
        qa_threshold=args.qa_threshold,
        hapi_port=args.hapi_port,
    )

    failures = [f for f in findings_list if f["status"] == "fail"]
    gate_status = "PASS" if not failures else "FAIL"

    report = {
        "phase": args.phase,
        "date": date.today().isoformat(),
        "gate_status": gate_status,
        "total_rules": len(findings_list),
        "failures": len(failures),
        "findings": findings_list,
    }

    print(json.dumps(report, indent=2))
    sys.exit(0 if gate_status == "PASS" else 1)


if __name__ == "__main__":
    main()
