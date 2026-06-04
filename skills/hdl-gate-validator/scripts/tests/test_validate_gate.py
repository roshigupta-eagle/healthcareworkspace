#!/usr/bin/env python3
"""Tests for validate-gate.py"""

import json
import subprocess
import sys
import tempfile
from pathlib import Path

SCRIPT = Path(__file__).parent.parent / "validate-gate.py"
PY = sys.executable


def run_gate(phase: str, root: str, extra: list = None) -> tuple[int, dict]:
    cmd = [PY, str(SCRIPT), "--phase", phase, "--root", root]
    if extra:
        cmd.extend(extra)
    result = subprocess.run(cmd, capture_output=True, text=True)
    try:
        data = json.loads(result.stdout)
    except json.JSONDecodeError:
        data = {}
    return result.returncode, data


def make_valid_discovery(root: Path):
    d = root / "_bmad" / "memory" / "hdl" / "discovery"
    d.mkdir(parents=True, exist_ok=True)
    (d / "use-case-brief.md").write_text(
        "## Product Vision\nAI triage app.\n\n"
        "## Actors\n- Patient\n- Caregiver\n\n"
        "## Success Criteria\n- Returns result in 5s\n- Works on mobile\n\n"
        "## Open Questions\nNone.\n",
        encoding="utf-8"
    )
    inv = d / "data-element-inventory.md"
    inv.write_text(
        "| Element | Source | FHIR Resource |\n"
        "|---|---|---|\n"
        "| Image | Camera | Media |\n"
        "| Triage result | AI | ClinicalImpression |\n"
        "| Symptom | User | Observation |\n",
        encoding="utf-8"
    )


def make_valid_architecture(root: Path):
    arch = root / "_bmad" / "memory" / "hdl" / "architecture"
    (arch / "adrs").mkdir(parents=True, exist_ok=True)
    (arch / "diagrams").mkdir(parents=True, exist_ok=True)
    (arch / "review-findings.md").write_text("# Review\nAll good.", encoding="utf-8")
    (arch / "adrs" / "ADR-001-fhir-version.md").write_text(
        "# ADR-001\nStatus: Accepted\nUse FHIR R4.", encoding="utf-8"
    )
    for name in ["c4-context", "c4-container", "fhir-resource-map",
                 "fhir-profile-tree", "terminology-binding-map", "sequence"]:
        (arch / "diagrams" / f"{name}.md").write_text(
            "```mermaid\ngraph TD\nA-->B\n```\n" * 5, encoding="utf-8"
        )


# ── Discovery ──────────────────────────────────────────────────────────────

def test_discovery_fails_on_empty_dir():
    with tempfile.TemporaryDirectory() as tmp:
        code, report = run_gate("discovery", tmp)
        assert code == 1
        assert report["gate_status"] == "FAIL"


def test_discovery_passes_with_valid_artifacts():
    with tempfile.TemporaryDirectory() as tmp:
        make_valid_discovery(Path(tmp))
        code, report = run_gate("discovery", tmp)
        assert code == 0, f"Failures: {[f for f in report.get('findings',[]) if f['status']=='fail']}"
        assert report["gate_status"] == "PASS"


def test_discovery_fails_unresolved_open_questions():
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        d = root / "_bmad" / "memory" / "hdl" / "discovery"
        d.mkdir(parents=True)
        (d / "use-case-brief.md").write_text(
            "## Product Vision\nApp.\n\n## Actors\n- User\n\n"
            "## Success Criteria\n- Criterion 1\n- Criterion 2\n\n"
            "## Open Questions\n- [ ] Unresolved question\n",
            encoding="utf-8"
        )
        (d / "data-element-inventory.md").write_text(
            "| E | S | F |\n|---|---|---|\n| A | B | C |\n| D | E | F |\n| G | H | I |\n",
            encoding="utf-8"
        )
        code, report = run_gate("discovery", tmp)
        assert code == 1
        rule_ids = [f["rule_id"] for f in report["findings"] if f["status"] == "fail"]
        assert "DISC-007" in rule_ids


# ── Architecture ───────────────────────────────────────────────────────────

def test_architecture_fails_missing_diagrams():
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        arch = root / "_bmad" / "memory" / "hdl" / "architecture"
        (arch / "adrs").mkdir(parents=True)
        (arch / "diagrams").mkdir(parents=True)
        (arch / "review-findings.md").write_text("# Review", encoding="utf-8")
        (arch / "adrs" / "ADR-001.md").write_text("Status: Accepted", encoding="utf-8")
        # only 3 of 6 diagrams
        for name in ["c4-context", "c4-container", "fhir-resource-map"]:
            (arch / "diagrams" / f"{name}.md").write_text("x" * 200, encoding="utf-8")
        code, report = run_gate("architecture", tmp)
        assert code == 1
        rule_ids = [f["rule_id"] for f in report["findings"] if f["status"] == "fail"]
        assert "ARCH-004" in rule_ids


def test_architecture_fails_proposed_adr():
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        make_valid_architecture(root)
        # overwrite one ADR as Proposed
        adr = root / "_bmad" / "memory" / "hdl" / "architecture" / "adrs" / "ADR-001-fhir-version.md"
        adr.write_text("# ADR-001\nStatus: Proposed\nUse FHIR R4.", encoding="utf-8")
        code, report = run_gate("architecture", tmp)
        assert code == 1
        rule_ids = [f["rule_id"] for f in report["findings"] if f["status"] == "fail"]
        assert "ARCH-003" in rule_ids


def test_architecture_passes_with_valid_artifacts():
    with tempfile.TemporaryDirectory() as tmp:
        make_valid_architecture(Path(tmp))
        code, report = run_gate("architecture", tmp)
        assert code == 0, f"Failures: {[f for f in report.get('findings',[]) if f['status']=='fail']}"


# ── Stories ────────────────────────────────────────────────────────────────

def test_stories_fails_missing_epics():
    with tempfile.TemporaryDirectory() as tmp:
        code, report = run_gate("stories", tmp)
        assert code == 1
        rule_ids = [f["rule_id"] for f in report["findings"] if f["status"] == "fail"]
        assert "STORY-001" in rule_ids


def test_stories_fails_incomplete_ac():
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        stories = root / "_bmad" / "memory" / "hdl" / "stories"
        stories.mkdir(parents=True)
        (stories / "epics.md").write_text("# Epics\n- E1", encoding="utf-8")
        (stories / "backlog.md").write_text(
            "| ID | Title | Status |\n|---|---|---|\n| S-001 | Story 1 | not-started |\n",
            encoding="utf-8"
        )
        s1 = stories / "S-001"
        s1.mkdir()
        (s1 / "story.md").write_text(
            "# Story 1\n## Acceptance Criteria\n### AC-001\n**Given** ...\n**When** ...\n"
            "**Then** ...\n(no status field)\n",
            encoding="utf-8"
        )
        code, report = run_gate("stories", tmp)
        assert code == 1
        rule_ids = [f["rule_id"] for f in report["findings"] if f["status"] == "fail"]
        assert "STORY-005" in rule_ids


# ── QA ─────────────────────────────────────────────────────────────────────

def test_qa_fails_below_threshold():
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        qa = root / "_bmad" / "memory" / "hdl" / "qa"
        qa.mkdir(parents=True)
        (qa / "test-results.md").write_text("Pass rate: 80%\nNo P1 bugs.", encoding="utf-8")
        code, report = run_gate("qa", tmp, ["--qa-threshold", "95"])
        assert code == 1
        rule_ids = [f["rule_id"] for f in report["findings"] if f["status"] == "fail"]
        assert "QA-002" in rule_ids


def test_qa_passes_above_threshold():
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        qa = root / "_bmad" / "memory" / "hdl" / "qa"
        qa.mkdir(parents=True)
        (qa / "test-results.md").write_text("Pass rate: 97%\nAll tests green.", encoding="utf-8")
        code, report = run_gate("qa", tmp, ["--qa-threshold", "95"])
        # stories dir missing so BUILD-003 won't fire — just check qa rules
        qa_failures = [f for f in report.get("findings", []) if f["rule_id"].startswith("QA-") and f["status"] == "fail"]
        assert not qa_failures, f"Unexpected QA failures: {qa_failures}"
